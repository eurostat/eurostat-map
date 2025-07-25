import { select } from 'd3-selection'
import { scaleQuantile, scaleThreshold } from 'd3-scale'
import { interpolateRgb } from 'd3-interpolate'
import * as StatMap from '../../core/stat-map'
import * as BivariateLegend from '../../legend/choropleth/legend-choropleth-bivariate'
import {
    getCSSPropertyFromClass,
    spaceAsThousandSeparator,
    executeForAllInsets,
    getRegionsSelector,
    getTextColorForBackground,
} from '../../core/utils'

/**
 * Return a bivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, false, 'chbi')

    //number of classes for the classification. Same for both variables.
    out.numberOfClasses_ = 3
    //stevens.greenblue
    //TODO make it possible to use diverging color ramps ?
    out.startColor_ = '#e8e8e8'
    out.color1_ = '#73ae80'
    out.color2_ = '#6c83b5'
    out.endColor_ = '#2a5a5b'
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

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
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
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        ['numberOfClasses', 'startColor', 'color1', 'color2', 'endColor', 'classToFillStyle', 'noDataFillStyle'].forEach(function (key) {
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
        const setupClassifiers = () => {
            let stat1 = out.statData('v1').getArray()
            let stat2 = out.statData('v2').getArray()

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
                    const sv = out.statData('v1').get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    // if (rg.properties.id.length == 4) console.log(rg)
                    return +out.classifier1_(+v)
                })
                .attr('ecl2', function (rg) {
                    const sv = out.statData('v2').get(rg.properties.id)
                    if (!sv) return
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier2_(+v)
                })
                .attr('nd', function (rg) {
                    const sv1 = out.statData('v1').get(rg.properties.id)
                    const sv2 = out.statData('v2').get(rg.properties.id)
                    if (!sv1 || !sv2) return
                    let v = sv1.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    v = sv2.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return ''
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
            regions
                .transition()
                .duration(out.transitionDuration())
                .style('fill', function (rg) {
                    const ecl1 = select(this).attr('ecl1')
                    if (ecl1 === 'nd') return out.noDataFillStyle() || 'gray'
                    const ecl2 = select(this).attr('ecl2')
                    if (!ecl1 && !ecl2) return getCSSPropertyFromClass('em-nutsrg', 'fill') // GISCO-2678 - lack of data no longer means no data, instead it is explicitly set using ':'.
                    if (ecl2 === 'nd') return out.noDataFillStyle() || 'gray'
                    let color = out.classToFillStyle_(+ecl1, +ecl2)
                    return color
                })
                .end()
                .then(
                    () => {
                        // Store the original color for each region
                        regions.each(function () {
                            const sel = select(this)
                            sel.attr('fill___', sel.style('fill'))
                        })

                        // Set up mouse events
                        addMouseEventsToRegions(map, regions)

                        // update font color for grid cartograms (contrast)
                        if (out.gridCartogram_) {
                            map.svg()
                                .selectAll('.em-grid-text')
                                .each(function () {
                                    const cellColor = select(this.parentNode).style('fill')
                                    select(this).attr('fill', getTextColorForBackground(cellColor))
                                })
                        }
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

        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                select(this).style('fill', map.hoverColor_)
                out._tooltip?.mouseover(out.tooltip_.textFunction(rg, out))
                if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                out._tooltip?.mousemove(e)
                if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                const newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', newFill)
                    out._tooltip?.mouseout()
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

const scaleBivariate = function (numberOfClasses, startColor, color1, color2, endColor) {
    //color ramps, by row
    const cs = []
    //interpolate from first and last columns
    const rampS1 = interpolateRgb(startColor, color1)
    const ramp2E = interpolateRgb(color2, endColor)
    for (let i = 0; i < numberOfClasses; i++) {
        const t = i / (numberOfClasses - 1)
        const colFun = interpolateRgb(rampS1(t), ramp2E(t))
        const row = []
        for (let j = 0; j < numberOfClasses; j++) row.push(colFun(j / (numberOfClasses - 1)))
        cs.push(row)
    }
    //TODO compute other matrix based on rows, and average both?

    return function (ecl1, ecl2) {
        return cs[ecl1][ecl2]
    }
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunBiv = function (rg, map) {
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
    const sv1 = map.statData('v1').get(rg.properties.id)
    const unit1 = map.statData('v1').unitText()
    //stat 2 value
    const sv2 = map.statData('v2').get(rg.properties.id)
    const unit2 = map.statData('v2').unitText()

    buf.push(`
        <div class="em-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;">
        <table class="em-tooltip-table">
        <tbody>
        <tr>
        <td>
        ${sv1 && sv1.value ? spaceAsThousandSeparator(sv1.value) : ''} ${unit1 && sv1 && sv1.value ? unit1 : ''}
        ${!sv1 || (sv1.value != 0 && !sv1.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        <tr>
        <td>
        ${sv2 && sv2.value ? spaceAsThousandSeparator(sv2.value) : ''} ${unit2 && sv2 && sv2.value ? unit2 : ''}
        ${!sv2 || (sv2.value != 0 && !sv2.value) ? map.noDataText_ : ''}
        </td>
        </tr>
        </tbody>
        </table>
        </div>
    `)

    return buf.join('')
}
