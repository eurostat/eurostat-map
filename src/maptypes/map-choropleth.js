import { select } from 'd3-selection'
import { min, max } from 'd3-array'
import { scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
import { interpolateYlOrBr } from 'd3-scale-chromatic'
import * as StatMap from '../core/stat-map'
import * as ChoroplethLegend from '../legend/legend-choropleth'
import { executeForAllInsets, spaceAsThousandSeparator } from '../core/utils'

/**
 * Returns a chroropleth map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config)

    //the number of classes
    out.numberOfClasses_ = 7
    //the classification method
    out.classificationMethod_ = 'quantile' // or: equinter, threshold
    //the threshold, when the classification method is 'threshold'
    out.threshold_ = [0]
    //colors to use for classes
    out.colors_ = null
    //when computed automatically, ensure the threshold are nice rounded values
    out.makeClassifNice_ = true
    //the color function [0,1] -> color
    out.colorFun_ = interpolateYlOrBr
    //a function returning the color from the class i
    out.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    out.classifier_ = undefined
    // set tooltip function
    out.tooltip_.textFunction = choroplethTooltipFunction

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
        'numberOfClasses_',
        'classificationMethod_',
        'threshold_',
        'makeClassifNice_',
        'colorFun_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier_',
        'colors_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override of some special getters/setters
    out.colorFun = function (v) {
        if (!arguments.length) {
            return out.colorFun_
        }
        out.colorFun_ = v
        // update class style function
        if (out.filtersDefinitionFun_) {
            // if dot density
            out.classToFillStyle(getFillPatternLegend())
        } else {
            out.classToFillStyle(getColorLegend(out.colorFun(), out.colors_))
        }
        return out
    }
    out.threshold = function (v) {
        if (!arguments.length) return out.threshold_
        out.threshold_ = v
        out.numberOfClasses(v.length + 1)
        return out
    }
    out.filtersDefinitionFun = function (v) {
        if (!arguments.length) return out.filtersDefinitionFun_
        out.filtersDefinitionFun_ = v
        if (out.svg()) out.filtersDefinitionFun_(out.svg(), out.numberOfClasses_)
        return out
    }

    //override attribute values with config values
    if (config)
        [
            'numberOfClasses',
            'classificationMethod',
            'threshold',
            'makeClassifNice',
            'colorFun',
            'classToFillStyle',
            'noDataFillStyle',
            'colors_',
        ].forEach(function (key) {
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
        // Helper function to generate a range [0, 1, 2, ..., nb-1]
        const generateRange = (nb) => [...Array(nb).keys()]

        // Configure classifier based on the selected classification method
        const setupClassifier = () => {
            const dataArray = out.statData().getArray()
            const range = generateRange(out.numberOfClasses())

            switch (out.classificationMethod_) {
                case 'quantile':
                    out.classifier(scaleQuantile().domain(dataArray).range(range))
                    break
                case 'equinter':
                    out.classifier(
                        scaleQuantize()
                            .domain([min(dataArray), max(dataArray)])
                            .range(range)
                    )
                    if (out.makeClassifNice_) out.classifier().nice()
                    break
                case 'threshold':
                    out.numberOfClasses(out.threshold_.length + 1)
                    out.classifier(scaleThreshold().domain(out.threshold_).range(generateRange(out.numberOfClasses())))
                    break
            }
        }

        // Apply classifier and set 'ecl' attribute to regions based on value
        const classifyRegions = (regions) => {
            regions.attr('ecl', (rg) => {
                const regionData = out.statData().get(rg.properties.id)
                if (!regionData) return // Lack of data is handled explicitly
                const value = regionData.value
                if (value === ':' || value === null) return 'nd'
                return value != null ? +out.classifier_(value) : undefined
            })
        }

        // Initialize classifier
        setupClassifier()

        // Apply classification and assign 'ecl' attribute based on map type
        if (map.svg_) {
            const selector = map.geo_ === 'WORLD' ? '#em-worldrg path' : '#em-nutsrg path'
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
        // Define function to get a class' color
        if (out.filtersDefinitionFun_) {
            // Dot density style
            out.classToFillStyle(getFillPatternLegend())
        } else {
            // Color legend style
            out.classToFillStyle(getColorLegend(out.colorFun(), out.colors_))
        }

        // Apply color and events to regions if SVG exists
        if (map.svg_) {
            const selector = out.geo_ === 'WORLD' ? '#em-worldrg path' : '#em-nutsrg path'
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
                })
                .catch((err) => {
                    //console.error('Error applying transition to regions:', err)
                })

            // Apply additional settings for mixed NUTS level view
            if (out.nutsLevel_ === 'mixed') {
                styleMixedNUTS(map)
            }

            // Update labels for statistical values if required
            if (out.labelsToShow_.includes('values')) {
                out.updateValuesLabels(map)
            }
        }
    }

    //@override
    out.getLegendConstructor = function () {
        return ChoroplethLegend.legend
    }

    const styleMixedNUTS = function (map) {
        map.svg()
            .selectAll('#em-nutsrg path')
            .style('display', function (rg) {
                const sel = select(this)
                const ecl = sel.attr('ecl')
                const lvl = sel.attr('lvl')
                const countryId = rg.properties.id.slice(0, 2)
                return (ecl && out.countriesToShow_.includes(countryId)) || lvl === '0' ? 'block' : 'none'
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
        if (out.geo_ === 'WORLD') {
            // World template logic
            if (!ecl) return out.cntrgFillStyle_
            if (ecl === 'nd') return out.noDataFillStyle() || 'gray'
            const fillStyle = out.classToFillStyle_(ecl, out.numberOfClasses_)
            return fillStyle || out.cntrgFillStyle_
        } else {
            // NUTS template logic
            const countryId = rg.properties.id.slice(0, 2)
            if (out.countriesToShow_.includes(countryId)) {
                if (!ecl) return out.nutsrgFillStyle_
                if (ecl === 'nd') return out.noDataFillStyle() || 'gray'
                return out.classToFillStyle()(ecl, out.numberOfClasses_)
            }
            return out.nutsrgFillStyle_
        }
    }

    const addMouseEventsToRegions = function (map, regions) {
        regions
            .on('mouseover', function (e, rg) {
                const sel = select(this)
                const countryId = rg.properties.id.slice(0, 2)
                if (out.geo_ === 'WORLD' || out.countriesToShow_.includes(countryId)) {
                    sel.style('fill', map.hoverColor_) // Apply highlight color
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                }
            })
            .on('mousemove', function (e) {
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function () {
                const sel = select(this)
                sel.style('fill', sel.attr('fill___')) // Revert to original color
                if (map._tooltip) map._tooltip.mouseout()
            })
    }

    return out
}

//build a color legend object
export const getColorLegend = function (colorFun, colorArray) {
    colorFun = colorFun || interpolateOrRd
    if (colorArray) {
        return function (ecl, numberOfClasses) {
            return colorArray[ecl]
        }
    }
    return function (ecl, numberOfClasses) {
        return colorFun(ecl / (numberOfClasses - 1))
    }
}

/**
 * Build a fill pattern legend object { nd:"white", 0:"url(#pattern_0)", 1:"url(#pattern_1)", ... }
 */
export const getFillPatternLegend = function () {
    return function (ecl) {
        return 'url(#pattern_' + ecl + ')'
    }
}

const choroplethTooltipFunction = function (region, map) {
    const buf = []

    // Header with region name and ID
    const regionName = region.properties.na
    const regionId = region.properties.id
    buf.push(`
        <div class="estat-vis-tooltip-bar">
            <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
        </div>
    `)

    // Retrieve region's data value and unit
    const statData = map.statData()
    const sv = statData.get(regionId)
    const unit = statData.unitText() || ''

    // No data case
    if (!sv || (sv.value !== 0 && !sv.value) || sv.value === ':') {
        buf.push(`
            <div class="estat-vis-tooltip-text no-data">
                <table class="nuts-table">
                    <tbody>
                        <tr><td>${map.noDataText_}</td></tr>
                    </tbody>
                </table>
            </div>
        `)
        return buf.join('')
    }

    // Data display
    buf.push(`
        <div class="estat-vis-tooltip-text">
            <table class="nuts-table">
                <tbody>
                    <tr><td>${spaceAsThousandSeparator(sv.value)} ${unit}</td></tr>
                </tbody>
            </table>
        </div>
    `)

    // Optional status flag
    const statusFlag = sv.status
    if (statusFlag && map.tooltip_.showFlags) {
        const flagText = map.tooltip_.showFlags === 'short' ? statusFlag : flags[statusFlag] || statusFlag
        buf.push(` <span class="status-flag">${flagText}</span>`)
    }

    return buf.join('')
}
