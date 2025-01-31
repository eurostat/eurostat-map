import { select } from 'd3-selection'
import { scaleQuantile } from 'd3-scale'
import { interpolateRgb } from 'd3-interpolate'
import * as StatMap from '../core/stat-map'
import * as TrivariateLegend from '../legend/legend-choropleth-trivariate'
import { getCSSPropertyFromClass, spaceAsThousandSeparator, executeForAllInsets, multiplyBlendMultipleHex, getRegionsSelector } from '../core/utils'

/**
 * Return a trivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config)

    //number of classes for the classification. Same for both variables.
    out.numberOfClasses_ = 3
    //stevens.greenblue
    //TODO make it possible to use diverging color ramps ?
    out.startColor_ = '#e8e8e8'
    out.color1_ = '#09F8FF'
    out.color2_ = '#F5D300'
    out.color3_ = '#FF1493'
    out.endColor_ = '#2a5a5b'
    //a function returning the colors for the classes i,j
    out.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    out.classifier1_ = undefined
    out.classifier2_ = undefined
    out.classifier3_ = undefined
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
        'endColor_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier1_',
        'classifier2_',
        'classifier3_',
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
        //set classifiers
        let stat1 = out.statData('v1').getArray()
        let stat2 = out.statData('v2').getArray()
        let stat3 = out.statData('v3').getArray()

        const range = [...Array(7).keys()]
        if (!out.classifier1_) out.classifier1(scaleQuantile().domain(stat1).range(range))
        if (!out.classifier2_) out.classifier2(scaleQuantile().domain(stat2).range(range))
        if (!out.classifier3_) out.classifier3(scaleQuantile().domain(stat3).range(range))

        //assign class to nuts regions, based on their value
        const selector = getRegionsSelector(map)
        if (map.svg_) {
            let regions = map.svg().selectAll(selector)
            regions
                .attr('ecl1', function (rg) {
                    const sv = out.statData('v1').get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier1_(+v)
                })
                .attr('ecl2', function (rg) {
                    const sv = out.statData('v2').get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier2_(+v)
                })
                .attr('ecl3', function (rg) {
                    const sv = out.statData('v3').get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier3_(+v)
                })
                .attr('regionClass', function (rg) {
                    const ecl1 = select(this).attr('ecl1')
                    const ecl2 = select(this).attr('ecl2')
                    const ecl3 = select(this).attr('ecl3')

                    if (ecl1 === 'nd' || ecl2 === 'nd' || ecl3 === 'nd') return 'nd' // Handle 'no data'

                    // Combine the classifier results into a single class (1-7)
                    if (ecl1 && !ecl2 && !ecl3) return 1 // only variable 1 present
                    if (!ecl1 && ecl2 && !ecl3) return 2 // only variable 2 present
                    if (!ecl1 && !ecl2 && ecl3) return 3 // only variable 3 present
                    if (ecl1 && ecl2 && !ecl3) return 4 // variables 1 & 2 present
                    if (ecl1 && !ecl2 && ecl3) return 5 // variables 1 & 3 present
                    if (!ecl1 && ecl2 && ecl3) return 6 // variables 2 & 3 present
                    if (ecl1 && ecl2 && ecl3) return 7 // all present
                })
            // .attr('nd', function (rg) {
            //     const sv1 = out.statData('v1').get(rg.properties.id) || out.statData().get(rg.properties.id)
            //     const sv2 = out.statData('v2').get(rg.properties.id)
            //     if (!sv1 || !sv2) return
            //     let v = sv1.value
            //     if ((v != 0 && !v) || v == ':') return 'nd'
            //     v = sv2.value
            //     if ((v != 0 && !v) || v == ':') return 'nd'
            //     return ''
            // })

            //when mixing NUTS, level 0 is separated from the rest (class nutsrg0)
            if (map.nutsLevel_ == 'mixed') {
                map.svg()
                    .selectAll('path.em-nutsrg0')
                    .attr('ecl1', function (rg) {
                        const sv = out.statData('v1').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier1_(+v)
                    })
                    .attr('ecl2', function (rg) {
                        const sv = out.statData('v2').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier2_(+v)
                    })
                    .attr('ecl3', function (rg) {
                        const sv = out.statData('v3').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier3_(+v)
                    })
            }

            //define trivariate scale
            if (!out.classToFillStyle()) {
                const scale = scaleTrivariate(out.color1(), out.color2(), out.color3())
                out.classToFillStyle(scale)
            }

            //when mixing NUTS, level 0 is separated from the rest (using class nutsrg0)
            if (out.nutsLevel_ == 'mixed') {
                map.svg_
                    .selectAll('path.em-nutsrg0')
                    .attr('ecl1', function (rg) {
                        const sv = out.statData('v2').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier1_(+v)
                    })
                    .attr('ecl2', function (rg) {
                        const sv = out.statData('v2').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier2_(+v)
                    })
                    .attr('ecl3', function (rg) {
                        const sv = out.statData('v3').get(rg.properties.id)
                        if (!sv) return
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier3_(+v)
                    })
            }
        }
    }

    const scaleTrivariate = function (color1, color2, color3) {
        // Blending primary colors and their overlaps
        const overlapColors = [
            multiplyBlendMultipleHex([color1, color2]), // Class 4 (Overlap of color1 and color2)
            multiplyBlendMultipleHex([color2, color3]), // Class 5 (Overlap of color2 and color3)
            multiplyBlendMultipleHex([color1, color3]), // Class 6 (Overlap of color1 and color3)
            multiplyBlendMultipleHex([color1, color2, color3]), // Class 7 (Overlap of all three)
        ]

        // Class-to-color mapping
        const classColors = [
            color1, // Class 1 (First color)
            color2, // Class 2 (Second color)
            color3, // Class 3 (Third color)
            overlapColors[0], // Class 4 (Overlap of color1 and color2)
            overlapColors[1], // Class 5 (Overlap of color2 and color3)
            overlapColors[2], // Class 6 (Overlap of color1 and color3)
            overlapColors[3], // Class 7 (Overlap of all three)
        ]

        // Return function to get color based on region's class (1 to 7)
        return function (classIndex) {
            if (classIndex >= 1 && classIndex <= 7) {
                return classColors[classIndex - 1]
            } else {
                return null // Return null or a default color if the classIndex is out of range
            }
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
        buf.push('<div class="estat-vis-tooltip-bar" >' + rg.properties.na + ' (' + rg.properties.id + ') </div>')
    } else {
        //region name
        buf.push('<div class="estat-vis-tooltip-bar" >' + rg.properties.na + '</div>')
    }

    //stat 1 value
    const sv1 = map.statData('v1').get(rg.properties.id)
    const unit1 = map.statData('v1').unitText()
    //stat 2 value
    const sv2 = map.statData('v2').get(rg.properties.id)
    const unit2 = map.statData('v2').unitText()
    //stat 3 value
    const sv3 = map.statData('v3').get(rg.properties.id)
    const unit3 = map.statData('v2').unitText()

    buf.push(`
        <div class="estat-vis-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;">
        <table class="nuts-table">
        <tbody>
        <tr>
        <td>
        Variable 1: ${sv1 && sv1.value ? spaceAsThousandSeparator(sv1.value) : ''} ${unit1 && sv1 && sv1.value ? unit1 : ''}
        ${!sv1 || (sv1.value != 0 && !sv1.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
         Variable 2: ${sv2 && sv2.value ? spaceAsThousandSeparator(sv2.value) : ''} ${unit2 && sv2 && sv2.value ? unit2 : ''}
        ${!sv2 || (sv2.value != 0 && !sv2.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
         Variable 3: ${sv3 && sv3.value ? spaceAsThousandSeparator(sv3.value) : ''} ${unit3 && sv3 && sv3.value ? unit3 : ''}
        ${!sv3 || (sv3.value != 0 && !sv3.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        </tbody>
        </table>
        </div>
    `)

    return buf.join('')
}
