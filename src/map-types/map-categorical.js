import { select, style } from 'd3-selection'
import { scaleOrdinal } from 'd3-scale'
import { schemeSet3 } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as CategoricalLegend from '../legend/legend-categorical'
import { executeForAllInsets, getCSSPropertyFromClass, getRegionsSelector, getTextColorForBackground } from '../core/utils'
import { applyPatternFill } from '../core/pattern-fill'

/**
 * Returns a categorical map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, false, 'ct')

    /** Fill style for each category/class. Ex.: { urb: "#fdb462", int: "#ffffb3", rur: "#ccebc5" } */
    out.classToFillStyle_ = undefined
    /** Text label for each category/class. Ex.: { "urb": "Urban", "int": "Intermediate", "rur": "Rural" } */
    out.classToText_ = undefined
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunCat

    //the classifier: a function which returns a class number from a stat value.
    out.classifier_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['classToFillStyle_', 'classToText_', 'noDataFillStyle_', 'tooltipText_', 'classifier_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        ['classToFillStyle', 'classToText', 'noDataFillStyle', 'tooltipText', 'classifier'].forEach(function (key) {
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

    const applyClassificationToMap = function (map) {
        //get domain (unique values)
        const domain = out.statData().getUniqueValues()

        //get range [0,1,2,3,...,domain.length-1]
        const range = [...Array(domain.length).keys()]

        //make classifier
        //only use user-define classes
        const ctfs = out.classToFillStyle_ ? out.classToFillStyle() : undefined
        if (ctfs) {
            const categories = Object.keys(ctfs)
            out.classifier(
                scaleOrdinal()
                    .domain(categories) // Only classify known categories
                    .range(categories.map((_, i) => i)) // Assign numerical classes
            )
        } else {
            // Use all unique values if no user-defined classes exist
            out.classifier(scaleOrdinal().domain(domain).range(range))
        }

        // Apply classifier and set 'ecl' attribute to regions based on value
        const classifyRegions = (regions) => {
            regions.attr('ecl', (rg) => {
                const sv = out.statData().get(rg.properties.id)
                if (!sv) return

                const v = sv.value
                if (v === ':') return 'nd' // No data

                const value = isNaN(v) ? v : +v // Convert numbers, keep strings as is

                // 🔹 Ensure only known values are classified
                const classifierDomain = out.classifier().domain()
                if (!classifierDomain.includes(value)) return // Skip unknown values

                return out.classifier()(value)
            })
        }

        let selector = getRegionsSelector(map)
        classifyRegions(map.svg().selectAll(selector))

        // Handle mixed NUTS level, separating NUTS level 0
        if (map.nutsLevel_ === 'mixed') {
            const nuts0Regions = map.svg().selectAll('path.em-nutsrg0')
            classifyRegions(nuts0Regions)
        }
    }

    //@override
    out.updateStyle = function () {
        //if no color specified, use some default colors
        if (!out.classToFillStyle()) {
            const ctfs = {}
            const dom = out.classifier().domain()
            for (let i = 0; i < dom.length; i++) ctfs[dom[i]] = schemeSet3[i % 12]
            out.classToFillStyle(ctfs)
        }

        // apply classification to all insets
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
        }

        // apply to main map
        applyStyleToMap(out)
        return out
    }

    function applyStyleToMap(map) {
        // Apply color and events to regions if SVG exists
        if (map.svg_) {
            const selector = getRegionsSelector(map)
            const regions = map.svg().selectAll(selector)

            // Apply transition and set initial fill colors with data-driven logic
            regions
                .transition()
                .duration(out.transitionDuration())
                .style('fill', regionsFillFunction)
                .end()
                .then(() => {
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
                })
                .catch((err) => {
                    //console.error('Error applying transition to regions:', err)
                })

            // Apply additional settings for mixed NUTS level view
            if (out.nutsLevel_ === 'mixed') {
                styleMixedNUTS(map)
            }

            // Update labels for statistical values if required
            if (out.labels_) {
                if (out.labels_.values) out.updateValuesLabels(map)
            }

            //add hatching if needed
            if (out.patternFill_) {
                applyPatternFill(map, out.patternFill_)
            }
        }
    }

    // when mixing different NUTS levels (e.g. showing NUTS 1 and NUTS 2 data simultaneously)
    const styleMixedNUTS = function (map) {
        map.svg()
            .selectAll(getRegionsSelector(map))
            .style('display', function (rg) {
                if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
                const sel = select(this)
                const ecl = sel.attr('ecl')
                const lvl = sel.attr('lvl')
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

    const regionsFillFunction = function (rg) {
        const ecl = select(this).attr('ecl') // 'this' refers to the current DOM element
        if (out.Geometries.userGeometries) {
            if (!ecl) return getCSSPropertyFromClass('em-nutsrg', 'fill')
            if (ecl === 'nd') return out.noDataFillStyle() || 'gray'
            return out.classToFillStyle_[out.classifier().domain()[ecl]]
        } else {
            if (out.geo_ === 'WORLD') {
                // World template logic
                if (!ecl) return out.cntrgFillStyle_
                if (ecl === 'nd') return out.noDataFillStyle() || 'gray'
                const fillStyle = out.classToFillStyle_[out.classifier().domain()[ecl]]
                return fillStyle || out.cntrgFillStyle_
            } else {
                // NUTS template logic
                const countryId = rg.properties.id.slice(0, 2)
                if (!ecl) return getCSSPropertyFromClass('em-nutsrg', 'fill')
                if (ecl === 'nd') return out.noDataFillStyle() || 'gray'
                return out.classToFillStyle_[out.classifier().domain()[ecl]]
            }
        }
    }

    const addMouseEventsToRegions = function (map, regions) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        // Set up mouse events
        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', map.hoverColor_) // Apply highlight color
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', sel.attr('fill___')) // Revert to original color
                if (out._tooltip) out._tooltip.mouseout()
            })
    }

    //@override
    out.getLegendConstructor = function () {
        return CategoricalLegend.legend
    }

    return out
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunCat = function (rg, map) {
    const buf = []
    if (rg.properties.id) {
        //name and code
        buf.push('<div class="em-tooltip-bar">' + rg.properties.na + ' (' + rg.properties.id + ') </div>')
    } else {
        //region name
        buf.push('<div class="em-tooltip-bar">' + rg.properties.na + '</div>')
    }
    //get stat value
    const sv = map.statData().get(rg.properties.id)
    //case when no data available
    if (!sv || (sv.value != 0 && !sv.value)) {
        buf.push(map.noDataText_)
        return buf.join('')
    }
    const val = sv.value
    if (map.classToText_) {
        const lbl = map.classToText_[val]
        //display label and value
        buf.push(`
    <div class="em-tooltip-text">
    <table class="nuts-table">
    <tbody>
    <tr>
    <td>
    ${lbl ? lbl : val}
    </td>
    </tr>
    </tbody>
    </table>
    </div>
`)
        return buf.join('')
    }
    //display just value
    buf.push(`
    <div class="em-tooltip-text">
    <table class="nuts-table">
    <tbody>
    <tr>
    <td>
    ${val}
    </td>
    </tr>
    </tbody>
    </table>
    </div>
`)
    return buf.join('')
}
