import { select } from 'd3-selection'
import { scaleQuantile, scaleThreshold } from 'd3-scale'
import { cross } from 'd3-array'
import { rgb } from 'd3-color'
import { interpolateRgb } from 'd3-interpolate'
import { schemeBlues, schemeOranges } from 'd3-scale-chromatic'
import * as BivariateLegend from '../../legend/choropleth/legend-choropleth-bivariate'
import {
    getCSSPropertyFromClass,
    spaceAsThousandSeparator,
    executeForAllInsets,
    getRegionsSelector,
    getTextColorForBackground,
} from '../../core/utils'
import { buildSingleLayerMap } from '../../core/stat-map'
import { registerLayerType } from '../../core/layer-registry'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/layers/choropleth/BivariateChoroplethConfig').BivariateChoroplethConfig} BivariateChoroplethConfig */
/** @typedef {import('../../types/layers/choropleth/BivariateChoroplethMap').BivariateChoroplethMap} BivariateChoroplethMap */

/**
 * Return a bivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 *
 * @param {BivariateChoroplethConfig} [config]
 * @returns {BivariateChoroplethMap}
 */
export const map = function (config) {
    return buildSingleLayerMap('bivariateChoropleth', config)
}

export const decorateBivariateChoroplethLayer = function (out, config) {
    //number of classes for the classification. Same for both variables.
    out.numberOfClasses_ = 3
    //stevens.greenblue
    //TODO make it possible to use diverging color ramps ?
    out.startColor_ = undefined
    out.color1_ = undefined
    out.color2_ = undefined
    out.endColor_ = undefined
    //a function returning the colors for the classes i,j
    out.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    out.classifier1_ = undefined
    out.classifier2_ = undefined
    // user defined breaks for the first and second variable.
    out.breaks1_ = undefined
    out.breaks2_ = undefined

    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunBiv

    const getBivariateCodes = () => [
        out.getEncodingStat?.('x', out.getEncodingStat?.('v1', 'v1')) || 'v1',
        out.getEncodingStat?.('y', out.getEncodingStat?.('v2', 'v2')) || 'v2',
    ]

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    const paramNames = [
        'numberOfClasses_',
        'breaks1_',
        'breaks2_',
        'startColor_',
        'color1_',
        'color2_',
        'endColor_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier1_',
        'classifier2_',
    ]
    paramNames.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[k](config[k])
        })
    }

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
        const setupClassifiers = () => {
            const [c1, c2] = getBivariateCodes()
            let stat1 = out.statData(c1).getArray()
            let stat2 = out.statData(c2).getArray()

            const range = [...Array(out.numberOfClasses()).keys()]

            // classifier1
            if (!out.classifier1_) {
                if (out.breaks1_) {
                    out.classifier1(scaleThreshold().domain(out.breaks1_).range(range))
                } else {
                    out.classifier1(scaleQuantile().domain(stat1).range(range))
                }
            }

            // classifier2
            if (!out.classifier2_) {
                if (out.breaks2_) {
                    out.classifier2(scaleThreshold().domain(out.breaks2_).range(range))
                } else {
                    out.classifier2(scaleQuantile().domain(stat2).range(range))
                }
            }

            // define bivariate color scale
            if (!out.classToFillStyle_) {
                const scale = scaleBivariate(out.numberOfClasses(), out.startColor(), out.color1(), out.color2(), out.endColor())
                out.classToFillStyle(scale)
            }
        }

        const classifyRegions = (regions) => {
            regions
                .attr('ecl1', function (rg) {
                    const [c1] = getBivariateCodes()
                    const sv = out.statData(c1).get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    // if (rg.properties.id.length == 4) console.log(rg)
                    return +out.classifier1_(+v)
                })
                .attr('ecl2', function (rg) {
                    const [, c2] = getBivariateCodes()
                    const sv = out.statData(c2).get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier2_(+v)
                })
                .attr('nd', function (rg) {
                    const [c1, c2] = getBivariateCodes()
                    const sv1 = out.statData(c1).get(rg.properties.id)
                    const sv2 = out.statData(c2).get(rg.properties.id)
                    if (sv1 || sv2) {
                        let v = sv1?.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        v = sv2?.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return
                    }
                })
        }

        // Initialize classifier
        setupClassifiers()

        // Apply classification and assign 'ecl' attribute based on map type
        if (map.svg_) {
            let selector = getRegionsSelector(map)
            classifyRegions(map.svg().selectAll(selector))

            // Handle mixed NUTS level, separating NUTS level 0
            if (map.nutsLevel_ === 'mixed') {
                const nuts0Regions = map.svg().selectAll('path.em-nutsrg0')
                classifyRegions(nuts0Regions)
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
            const finalizeStyle = () => {
                // A later map/inset update can interrupt this transition. Interaction
                // must be restored whether the transition completes or is cancelled.
                regions.style('pointer-events', null)

                regions.each(function () {
                    const sel = select(this)
                    sel.attr('fill___', sel.style('fill'))
                })

                addMouseEventsToRegions(map, regions)

                if (out.gridCartogram_) {
                    map.svg()
                        .selectAll('.em-grid-text')
                        .each(function () {
                            const cellColor = select(this.parentNode).style('fill')
                            select(this).attr('fill', getTextColorForBackground(cellColor))
                        })
                }
            }

            regions
                .style('pointer-events', 'none') // disable interaction during transition
                .transition()
                .duration(out.transitionDuration())
                .style('fill', function (rg) {
                    const nd = select(this).attr('nd')
                    if (nd) return out.noDataFillStyle() || 'gray'

                    const ecl1 = select(this).attr('ecl1')
                    const ecl2 = select(this).attr('ecl2')
                    if (!ecl1 && !ecl2) return getCSSPropertyFromClass('em-nutsrg', 'fill') // GISCO-2678 - lack of data no longer means no data, instead it is explicitly set using ':'.
                    if (ecl2 === 'nd') return out.noDataFillStyle() || 'gray'
                    let color = out.classToFillStyle_(+ecl1, +ecl2)
                    return color
                })
                .end()
                .then(finalizeStyle, finalizeStyle)

            if (out.nutsLevel_ == 'mixed') {
                styleMixedNUTS(map)
            }
        }
    }

    // when mixing different NUTS levels (e.g. showing NUTS 1 and NUTS 2 data simultaneously)
    const styleMixedNUTS = function (map) {
        map.svg()
            .selectAll(getRegionsSelector(map))
            .each(function () {
                if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
                const sel = select(this)
                const ecl1 = sel.attr('ecl1')
                const ecl2 = sel.attr('ecl2')
                const lvl = sel.attr('lvl')

                // Determine display visibilitys
                const isVisible = ecl1 || ecl2 || lvl === '0'

                // Apply styles efficiently
                sel.style('display', isVisible ? 'block' : 'none')

                if ((ecl1 || ecl2) && lvl !== '0') {
                    const stroke = sel.style('stroke') || '#777'
                    const strokeWidth = sel.style('stroke-width') || 0.2
                    sel.style('stroke', stroke).style('stroke-width', strokeWidth)
                }
            })
    }

    const addMouseEventsToRegions = (map, regions) => {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)

        const clearStaleLegendHighlight = () => {
            if (!map._bivariateLegendHighlightActive) return

            regions.filter('[ecl1],[ecl2]').each(function () {
                const sel = select(this)
                const original = sel.attr('data-fill')
                if (original) sel.style('fill', original)
            })
            map._bivariateLegendHighlightActive = false
        }

        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                // A legend square can miss mouseout when the pointer moves rapidly onto the map
                // while that square is being raised. Restore every dimmed region before applying
                // the normal single-region hover style.
                clearStaleLegendHighlight()
                select(this).style('fill', map.hoverColor_)
                const tooltipHost = map._tooltip || out._tooltip
                tooltipHost?.mouseover(out.tooltip_.textFunction(rg, map), e)
                if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const tooltipHost = map._tooltip || out._tooltip
                tooltipHost?.mousemove(e)
                if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                const newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', newFill)
                    const tooltipHost = map._tooltip || out._tooltip
                    tooltipHost?.mouseout()
                }
                if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
            })
    }

    //@override
    out.getLegendConstructor = function () {
        return BivariateLegend.legend
    }

    return out
}

registerLayerType('bivariateChoropleth', 'base', decorateBivariateChoroplethLayer)
registerLayerType('chbi', 'base', decorateBivariateChoroplethLayer)

const scaleBivariate = function (numberOfClasses, startColor, color1, color2, endColor) {
    const steps = Math.max(1, numberOfClasses)
    const hasCustomCorners = [startColor, color1, color2, endColor].every((c) => typeof c === 'string' && c.trim().length > 0)
    const defaultPalette = buildLegacyDefaultPalette(steps)

    // Default palette: old oranges/blues blend behavior.
    if (!hasCustomCorners) {
        if (defaultPalette) {
            return function (ecl1, ecl2) {
                if (ecl1 == null || ecl2 == null || ecl1 === ':' || ecl2 === ':') return null
                return defaultPalette[ecl1 * steps + ecl2]
            }
        }
    }

    // If custom corners match legacy defaults, return exact legacy palette so explicit
    // corner configuration yields identical output as leaving colors unspecified.
    if (hasCustomCorners && defaultPalette) {
        const legacyCorners = getPaletteCorners(defaultPalette, steps)
        if (
            areColorsEqual(startColor, legacyCorners.startColor) &&
            areColorsEqual(color1, legacyCorners.color1) &&
            areColorsEqual(color2, legacyCorners.color2) &&
            areColorsEqual(endColor, legacyCorners.endColor)
        ) {
            return function (ecl1, ecl2) {
                if (ecl1 == null || ecl2 == null || ecl1 === ':' || ecl2 === ':') return null
                return defaultPalette[ecl1 * steps + ecl2]
            }
        }
    }

    // Custom palette from explicit corner colors.
    const cs = []
    const denom = Math.max(1, steps - 1)
    const rampS1 = interpolateRgb(startColor, color1)
    const ramp2E = interpolateRgb(color2, endColor)
    for (let i = 0; i < steps; i++) {
        const t = i / denom
        const colFun = interpolateRgb(rampS1(t), ramp2E(t))
        const row = []
        for (let j = 0; j < steps; j++) row.push(colFun(j / denom))
        cs.push(row)
    }

    return function (ecl1, ecl2) {
        if (ecl1 == null || ecl2 == null || ecl1 === ':' || ecl2 === ':') return null
        return cs[ecl1][ecl2]
    }
}

const buildLegacyDefaultPalette = function (count) {
    const baseOranges = schemeOranges[6]?.slice(0, -1)
    const baseBlues = schemeBlues[6]?.slice(0, -1)
    const oranges = baseOranges && resampleColorRamp(baseOranges, count)
    const blues = baseBlues && resampleColorRamp(baseBlues, count)
    if (!oranges || !blues) return null
    return cross(blues, oranges).map(([a, b]) => mixblend(a, b))
}

const getPaletteCorners = function (palette, count) {
    const idx = (i, j) => i * count + j
    return {
        startColor: palette[idx(0, 0)],
        color1: palette[idx(count - 1, 0)],
        color2: palette[idx(0, count - 1)],
        endColor: palette[idx(count - 1, count - 1)],
    }
}

const areColorsEqual = function (a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    try {
        return rgb(a).formatHex().toLowerCase() === rgb(b).formatHex().toLowerCase()
    } catch {
        return a.trim().toLowerCase() === b.trim().toLowerCase()
    }
}

const mixblend = function (a, b) {
    const colorA = rgb(a)
    const colorB = rgb(b)
    const l = Math.min(250, colorB.r + colorB.g + colorB.b)
    colorA.r *= colorB.r / l
    colorA.g *= colorB.g / l
    colorA.b *= colorB.b / l
    return colorA.formatHex()
}

const resampleColorRamp = function (ramp, count) {
    if (!Array.isArray(ramp) || !ramp.length || count <= 0) return []
    if (count === 1) return [ramp[0]]
    if (count === ramp.length) return ramp.slice()

    const last = ramp.length - 1
    const sampled = []
    for (let i = 0; i < count; i++) {
        const t = (i / (count - 1)) * last
        const idx = Math.floor(t)
        const nextIdx = Math.min(last, idx + 1)
        const localT = t - idx
        sampled.push(localT === 0 ? ramp[idx] : interpolateRgb(ramp[idx], ramp[nextIdx])(localT))
    }
    return sampled
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunBiv = function (rg, map) {
    const layer = map.activeLayer?.() || map
    const buf = []
    //region name
    const regionName = rg.properties.na || rg.properties.name
    if (rg.properties.id) {
        //name and code
        buf.push('<div class="em-tooltip-bar" >' + regionName + ' (' + rg.properties.id + ') </div>')
    } else {
        //region name
        buf.push('<div class="em-tooltip-bar" >' + regionName + '</div>')
    }

    //stat 1 value
    const c1 = layer.getEncodingStat?.('x', layer.getEncodingStat?.('v1', 'v1')) || 'v1'
    const c2 = layer.getEncodingStat?.('y', layer.getEncodingStat?.('v2', 'v2')) || 'v2'
    const sv1 = layer.statData(c1).get(rg.properties.id)
    const unit1 = layer.statData(c1).unitText()
    //stat 2 value
    const sv2 = layer.statData(c2).get(rg.properties.id)
    const unit2 = layer.statData(c2).unitText()

    buf.push(`
        <div class="em-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;">
        <table class="em-tooltip-table">
        <tbody>
        <tr>
        <td>
        ${sv1 && sv1.value ? spaceAsThousandSeparator(sv1.value) : ''} ${unit1 && sv1 && sv1.value ? unit1 : ''}
        ${!sv1 || (sv1.value != 0 && !sv1.value) ? layer.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
        ${sv2 && sv2.value ? spaceAsThousandSeparator(sv2.value) : ''} ${unit2 && sv2 && sv2.value ? unit2 : ''}
        ${!sv2 || (sv2.value != 0 && !sv2.value) ? layer.noDataText_ : ''}
        </td>
        </tr>
        </tbody>
        </table>
        </div>
    `)

    return buf.join('')
}
