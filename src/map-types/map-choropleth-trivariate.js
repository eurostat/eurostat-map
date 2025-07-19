import { select } from 'd3-selection'
import { scaleQuantile } from 'd3-scale'
import * as StatMap from '../core/stat-map'
import * as TrivariateLegend from '../legend/choropleth/legend-choropleth-trivariate'
import {
    getCSSPropertyFromClass,
    spaceAsThousandSeparator,
    executeForAllInsets,
    averageBlendHex,
    getRegionsSelector,
    multiplyBlendMultipleHex,
} from '../core/utils'
import { color, lab } from 'd3-color'
import { interpolateLab } from 'd3-interpolate'

/**
 * Return a trivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, false, 'chtri')

    //number of classes for the classification. Same for both variables.
    out.numberOfClasses_ = 3
    //stevens.greenblue
    //TODO make it possible to use diverging color ramps ?
    out.startColor_ = '#e8e8e8'
    out.color1_ = '#e41a1c' // Red
    out.color2_ = '#4daf4a' // Green
    out.color3_ = '#377eb8' // Blue
    out.colorMode_ = 'LAB' // default
    //a function returning the colors for the classes i,j
    out.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    out.classifier1_ = undefined
    out.classifier2_ = undefined
    out.classifier3_ = undefined
    out.trivariateRelationship_ = 'quantile' // or 'presence'
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunctionTrivariate

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
        'numberOfClasses_',
        'startColor_',
        'color1_',
        'color2_',
        'color3_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier1_',
        'classifier2_',
        'classifier3_',
        'trivariateRelationship_',
        'colorMode_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        ['numberOfClasses', 'startColor', 'color1', 'color2', 'color3', 'endColor', 'classToFillStyle', 'noDataFillStyle'].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    //@override
    out.updateClassification = function () {
        // apply classification to all insets that are outside of the main map's SVG
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }

        // apply to main map
        applyClassificationToMap(out)

        return out
    }

    function applyClassificationToMap(map) {
        const stat1 = out.statData('v1').getArray()
        const stat2 = out.statData('v2').getArray()
        const stat3 = out.statData('v3').getArray()

        if (out.trivariateRelationship() === 'quantile') {
            if (!out.classifier1_) out.classifier1(scaleQuantile().domain(stat1).range([0, 1, 2]))
            if (!out.classifier2_) out.classifier2(scaleQuantile().domain(stat2).range([0, 1, 2]))
            if (!out.classifier3_) out.classifier3(scaleQuantile().domain(stat3).range([0, 1, 2]))
        }

        const selector = getRegionsSelector(map)
        if (!map.svg_) return

        const regions = map.svg().selectAll(selector)
        regions.each(function (rg) {
            const sv1 = out.statData('v1').get(rg.properties.id)
            const sv2 = out.statData('v2').get(rg.properties.id)
            const sv3 = out.statData('v3').get(rg.properties.id)

            const v1 = sv1 && sv1.value !== ':' ? +sv1.value : null
            const v2 = sv2 && sv2.value !== ':' ? +sv2.value : null
            const v3 = sv3 && sv3.value !== ':' ? +sv3.value : null

            if (v1 == null || v2 == null || v3 == null) {
                select(this).attr('regionClass', 'nd')
                return
            }

            if (out.trivariateRelationship() === 'presence') {
                const c1 = v1 > 0
                const c2 = v2 > 0
                const c3 = v3 > 0
                const classId =
                    c1 && !c2 && !c3
                        ? 1
                        : !c1 && c2 && !c3
                          ? 2
                          : !c1 && !c2 && c3
                            ? 3
                            : c1 && c2 && !c3
                              ? 4
                              : c1 && !c2 && c3
                                ? 5
                                : !c1 && c2 && c3
                                  ? 6
                                  : c1 && c2 && c3
                                    ? 7
                                    : 0
                select(this).attr('regionClass', classId)
            } else {
                const c1 = out.classifier1_(v1)
                const c2 = out.classifier2_(v2)
                const c3 = out.classifier3_(v3)
                const combinedClass = c1 * 9 + c2 * 3 + c3 // 0–26
                select(this).attr('ecl1', c1).attr('ecl2', c2).attr('ecl3', c3).attr('regionClass', combinedClass)
            }
        })

        if (!out.classToFillStyle()) {
            out.classToFillStyle(
                out.trivariateRelationship() === 'presence'
                    ? generatePresenceScale(out.color1(), out.color2(), out.color3())
                    : generateQuantileScale(out.color1(), out.color2(), out.color3(), out.colorMode())
            )
        }
    }

    function generatePresenceScale(c1, c2, c3) {
        const overlap = (a, b) => averageBlendHex([a, b])
        return function (classId) {
            switch (+classId) {
                case 1:
                    return c1
                case 2:
                    return c2
                case 3:
                    return c3
                case 4:
                    return overlap(c1, c2)
                case 5:
                    return overlap(c1, c3)
                case 6:
                    return overlap(c2, c3)
                case 7:
                    return averageBlendHex([c1, c2, c3])
                default:
                    return '#ccc'
            }
        }
    }

    function generateQuantileScale(c1, c2, c3, mode = 'LAB') {
        const colors = []
        const intensities = [0.5, 0.8, 1.0] // low, medium, high scaling

        // Ensure final colors span a usable lightness range
        const adjustLightness = (hex) => {
            const cLab = lab(hex)
            // Stretch final lightness so the 27 colors cover the full visual range
            cLab.l = Math.max(40, Math.min(85, cLab.l))
            cLab.a *= 1.1
            cLab.b *= 1.1
            return cLab.formatHex()
        }

        const mixLAB = (cols) => {
            const [a, b, c] = cols.map((d) => color(d))
            const ab = interpolateLab(a, b)(0.5)
            const mixed = interpolateLab(ab, c)(0.5)
            return adjustLightness(mixed)
        }

        const mixRGB = (cols) => {
            const scaled = cols.map((col, idx) => scaleColor(col, intensities[idx % 3], 'RGB'))
            return multiplyBlendMultipleHex(scaled)
        }

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    const quantileColors = [
                        scaleColor(c1, intensities[i], mode),
                        scaleColor(c2, intensities[j], mode),
                        scaleColor(c3, intensities[k], mode),
                    ]
                    const blended = mode === 'LAB' ? mixLAB(quantileColors) : mixRGB(quantileColors)
                    colors.push(adjustLightness(blended))
                }
            }
        }

        return (idx) => colors[+idx] || '#ccc'
    }

    function scaleColor(baseColor, factor, mode = 'LAB') {
        if (mode === 'LAB') {
            let cLab = lab(baseColor)

            // Normalize primaries to start balanced around mid-lightness
            const baseL = 65
            const targetL = baseL * Math.pow(factor, 0.6) // gamma correction

            cLab.l = Math.max(35, Math.min(85, targetL))

            // Boost chroma slightly to avoid gray mixes
            cLab.a *= 1.15
            cLab.b *= 1.15

            return cLab.formatHex()
        } else {
            const c = color(baseColor).rgb()
            const gamma = (x) => Math.pow(x / 255, 0.6) * 255
            c.r = Math.min(255, gamma(c.r) * factor)
            c.g = Math.min(255, gamma(c.g) * factor)
            c.b = Math.min(255, gamma(c.b) * factor)
            return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
        }
    }

    //@override
    out.updateStyle = function () {
        // apply style to insets
        // apply classification to all insets
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
        }

        // apply to main map
        applyStyleToMap(out)

        return out
    }

    function applyStyleToMap(map) {
        //apply style to nuts regions

        // set colour of regions
        if (map.svg()) {
            const selector = getRegionsSelector(map)
            let regions = map.svg().selectAll(selector)
            regions
                .transition()
                .duration(out.transitionDuration())
                .style('fill', function (rg) {
                    const ecl1 = select(this).attr('ecl1')
                    const ecl2 = select(this).attr('ecl2')
                    const ecl3 = select(this).attr('ecl3')
                    if (ecl1 === 'nd') return out.noDataFillStyle() || 'gray'
                    if (ecl2 === 'nd') return out.noDataFillStyle() || 'gray'
                    if (ecl3 === 'nd') return out.noDataFillStyle() || 'gray'

                    if (!ecl1 && !ecl2 && !ecl3) return getCSSPropertyFromClass('em-nutsrg', 'fill') // GISCO-2678 - lack of data no longer means no data, instead it is explicitly set using ':'.

                    let regionClass = select(this).attr('regionClass')
                    let color = out.classToFillStyle_(regionClass)
                    return color

                    //return getCSSPropertyFromClass('em-nutsrg', 'fill')
                })
                .end()
                .then(
                    () => {
                        // Store the original color for each region
                        regions.each(function () {
                            const sel = select(this)
                            sel.attr('fill___', sel.style('fill'))
                        })

                        regions
                            .on('mouseover', function (e, rg) {
                                const sel = select(this)
                                sel.style('fill', map.hoverColor_)
                                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                            })
                            .on('mousemove', function (e, rg) {
                                if (out._tooltip) out._tooltip.mousemove(e)
                            })
                            .on('mouseout', function () {
                                const sel = select(this)
                                let newFill = sel.attr('fill___')
                                if (newFill) {
                                    sel.style('fill', sel.attr('fill___'))
                                    if (out._tooltip) out._tooltip.mouseout()
                                }
                            })
                    },
                    (err) => {
                        // rejection
                    }
                )

            if (out.nutsLevel_ == 'mixed') {
                styleMixedNUTS(map)
            }
        }
    }

    //@override
    out.getLegendConstructor = function () {
        return TrivariateLegend.legend
    }

    return out
}

const styleMixedNUTS = function (map) {
    map.svg()
        .selectAll(getRegionsSelector(map))
        .style('display', function (rg) {
            if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
            const sel = select(this)
            const ecl = sel.attr('ecl')
            const lvl = sel.attr('lvl')
            const countryId = rg.properties.id.slice(0, 2)
            return ecl || lvl === '0' ? 'block' : 'none'
        })
        .style('stroke', function () {
            const sel = select(this)
            const lvl = sel.attr('lvl')
            const ecl = sel.attr('ecl')
            const stroke = sel.style('stroke')
            return ecl && lvl !== '0' ? stroke || '#777' : null
        })
        .style('stroke-width', function () {
            const sel = select(this)
            const lvl = sel.attr('lvl')
            const ecl = sel.attr('ecl')
            const strokeWidth = sel.style('stroke-width')
            return ecl && lvl !== '0' ? strokeWidth || 0.2 : null
        })
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunctionTrivariate = function (rg, map) {
    const buf = []
    //region name
    if (rg.properties.id) {
        //name and code
        buf.push('<div class="em-tooltip-bar" >' + rg.properties.na + ' (' + rg.properties.id + ') </div>')
    } else {
        //region name
        buf.push('<div class="em-tooltip-bar" >' + rg.properties.na + '</div>')
    }

    //stat 1 value
    const sv1 = map.statData('v1').get(rg.properties.id)
    const sv1Label = map.statData('v1').label_
    const unit1 = map.statData('v1').unitText()
    //stat 2 value
    const sv2 = map.statData('v2').get(rg.properties.id)
    const sv2Label = map.statData('v2').label_
    const unit2 = map.statData('v2').unitText()
    //stat 3 value
    const sv3 = map.statData('v3').get(rg.properties.id)
    const sv3Label = map.statData('v3').label_
    const unit3 = map.statData('v2').unitText()

    buf.push(`
        <div class="em-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;">
        <table class="nuts-table">
        <tbody>
        <tr>
        <td>
        ${sv1Label || 'Variable 1'}: ${sv1 && sv1.value ? spaceAsThousandSeparator(sv1.value) : ''} ${unit1 && sv1 && sv1.value ? unit1 : ''}
        ${!sv1 || (sv1.value != 0 && !sv1.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
        ${sv2Label || 'Variable 2'}: ${sv2 && sv2.value ? spaceAsThousandSeparator(sv2.value) : ''} ${unit2 && sv2 && sv2.value ? unit2 : ''}
        ${!sv2 || (sv2.value != 0 && !sv2.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
        ${sv3Label || 'Variable 3'}: ${sv3 && sv3.value ? spaceAsThousandSeparator(sv3.value) : ''} ${unit3 && sv3 && sv3.value ? unit3 : ''}
        ${!sv3 || (sv3.value != 0 && !sv3.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        </tbody>
        </table>
        </div>
    `)

    return buf.join('')
}
