//map-choropleth.js
import { select } from 'd3-selection'
import { min, max } from 'd3-array'
import { scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
import { interpolateYlGnBu } from 'd3-scale-chromatic'
import { piecewise, interpolateLab } from 'd3-interpolate'
import * as StatMap from '../../core/stat-map'
import * as ChoroplethLegend from '../../legend/choropleth/legend-choropleth'
import { checkIfDiverging, executeForAllInsets, getRegionsSelector, getTextColorForBackground, spaceAsThousandSeparator } from '../../core/utils'
import { jenks, ckmeans } from 'simple-statistics'
import { applyPatternFill } from '../../core/pattern-fill'

/**
 * Returns a chroropleth map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, false, 'ch')

    //the number of classes
    out.numberOfClasses_ = 7
    //the classification method
    out.classificationMethod_ = 'quantile' // or: ckmeans, jenks, equinter, threshold
    //the threshold, when the classification method is 'threshold'
    out.thresholds_ = [0]
    //colors to use for classes
    out.colors_ = null
    //when computed automatically, ensure the threshold are nice rounded values
    out.makeClassifNice_ = true
    //the color function [0,1] -> color
    let eurostatMultihue = ['#FFEB99', '#D1E9B0', '#8DD6B9', '#58C1C0', '#3792B6', '#134891', '#1d2b6f']
    out.colorFunction_ = (t) => piecewise(interpolateLab, eurostatMultihue)(Math.min(Math.max(0, t), 1)) // default
    //a function returning the color from the class i
    out.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    out.classifier_ = undefined
    // set tooltip function
    out.tooltip_.textFunction = choroplethTooltipFunction

    // continuous color schemes
    out.colorSchemeType_ = 'discrete' // or 'continuous'
    out.valueTransform_ = (x) => x // for distribution stretching in continuous mode
    out.valueUntransform_ = (x) => x // the legends need to 'untransform' the value to show the original value
    out.pointOfDivergence_ = null // the point in the domain where the color diverges (e.g. 0 for a diverging color scheme)

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
        'thresholds_',
        'makeClassifNice_',
        'colorFunction_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier_',
        'colors_',
        'colorFunction_',
        'colorSchemeType_',
        'valueTransform_',
        'valueUntransform_',
        'pointOfDivergence_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override of some special getters/setters
    out.colorFunction = function (v) {
        if (!arguments.length) return out.colorFunction_
        out.colorFunction_ = v
        if (out.filtersDefinitionFunction_) {
            // dot density style
            out.classToFillStyle(getFillPatternLegend())
        } else {
            // update color function
            const newFunction = getColorFunction(out.colorFunction_, out.colors_, out.colorSchemeType_)
            out.classToFillStyle(newFunction)
        }

        return out
    }
    out.threshold = function (v) {
        if (!arguments.length) return out.thresholds_
        out.thresholds_ = v
        out.numberOfClasses(v.length + 1)
        return out
    }
    out.filtersDefinitionFunction = function (v) {
        if (!arguments.length) return out.filtersDefinitionFunction_
        out.filtersDefinitionFunction_ = v
        if (out.svg()) out.filtersDefinitionFunction_(out.svg(), out.numberOfClasses_)
        return out
    }

    //override attribute values with config values
    if (config)
        [
            'numberOfClasses',
            'classificationMethod',
            'threshold',
            'makeClassifNice',
            'colorFunction',
            'classToFillStyle',
            'noDataFillStyle',
            'colors',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    //@override
    out.updateClassification = function () {
        try {
            // apply classification to all insets that are outside of the main map's SVG
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
            }

            // apply to main map
            applyClassificationToMap(out)

            return out
        } catch (e) {
            console.error('Error in updateClassification:', e.message)
            console.error(e)
        }
    }

    function applyClassificationToMap(map) {
        const generateRange = (nb) => [...Array(nb).keys()]
        const dataArray = out.statData().getArray()

        const setupClassifier = () => {
            const range = generateRange(out.numberOfClasses_)

            if (out.colorSchemeType_ === 'continuous') {
                const valueTransform = out.valueTransform_ || ((d) => d)
                const transformedValues = dataArray.map(valueTransform)
                const minVal = min(transformedValues)
                const maxVal = max(transformedValues)
                const isDiverging = checkIfDiverging(out)
                const isFullScale = typeof out.colorFunction_?.domain === 'function'

                if (!isFullScale) {
                    if (isDiverging) {
                        const divergence = valueTransform(out.pointOfDivergence_ ?? 0)
                        out.domain_ = [minVal, divergence, maxVal]
                    } else {
                        out.domain_ = [minVal, maxVal]
                    }
                }

                out.classifier((val) => val) // identity
            }

            switch (out.classificationMethod_) {
                case 'quantile': {
                    out.classifier(scaleQuantile().domain(dataArray).range(range))
                    break
                }
                case 'equal-interval':
                case 'equinter': {
                    out.classifier(
                        scaleQuantize()
                            .domain([min(dataArray), max(dataArray)])
                            .range(range)
                    )
                    if (out.makeClassifNice_) out.classifier().nice()
                    break
                }
                case 'threshold': {
                    out.numberOfClasses(out.thresholds_.length + 1)
                    out.classifier(scaleThreshold().domain(out.thresholds_).range(generateRange(out.numberOfClasses_)))
                    break
                }
                case 'jenks': {
                    const jenksBreaks = jenks(dataArray, out.numberOfClasses_)
                    const domain = jenksBreaks.slice(1, -1)
                    out.classifier(scaleThreshold().domain(domain).range(range))
                    break
                }
                case 'ckmeans': {
                    const ckmeansBreaks = ckmeans(dataArray, out.numberOfClasses_).map((cluster) => cluster.pop())
                    const domain = ckmeansBreaks.slice(0, -1)
                    out.classifier(scaleThreshold().domain(domain).range(range))
                    break
                }
            }
        }

        const classifyRegions = (regions) => {
            regions.attr('ecl', (rg) => {
                const regionData = out.statData().get(rg.properties.id)
                if (!regionData) return
                const value = regionData.value
                if (value === ':' || value === null) return 'nd'

                if (out.colorSchemeType_ === 'continuous') {
                    // no class index for continuous mode
                    return value
                }

                return value != null ? +out.classifier_(value) : undefined
            })
        }

        // Initialize classifier and apply classification
        setupClassifier()

        if (map.svg_) {
            const selector = getRegionsSelector(map)
            classifyRegions(map.svg().selectAll(selector))

            if (map.nutsLevel_ === 'mixed') {
                const nuts0Regions = map.svg().selectAll('path.em-nutsrg0')
                classifyRegions(nuts0Regions)
            }
        }
    }

    //@override
    out.updateStyle = function () {
        try {
            // apply style to insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            // apply to main map
            applyStyleToMap(out)

            return out
        } catch (e) {
            console.error('Error in updateStyle:', e.message)
            console.error(e)
        }
    }

    function applyStyleToMap(map) {
        // Define function to get a class' color
        if (out.filtersDefinitionFunction_) {
            // Dot density style
            out.classToFillStyle(getFillPatternLegend())
        } else {
            // Color legend style
            out.classToFillStyle(getColorFunction(out.colorFunction_, out.colors_))
        }

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

    //@override
    out.getLegendConstructor = function () {
        return ChoroplethLegend.legend
    }

    // when mixing different NUTS levels (e.g. showing NUTS 1 and NUTS 2 data simultaneously)
    const styleMixedNUTS = function (map) {
        map.svg()
            .selectAll(getRegionsSelector(map))
            .each(function () {
                if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
                const sel = select(this)
                const ecl = sel.attr('ecl')
                const lvl = sel.attr('lvl')

                // Determine display visibility
                const isVisible = ecl || lvl === '0'

                // Apply styles efficiently
                sel.style('display', isVisible ? 'block' : 'none')

                if (ecl && lvl !== '0') {
                    const stroke = sel.style('stroke') || '#777'
                    const strokeWidth = sel.style('stroke-width') || 0.2
                    sel.style('stroke', stroke).style('stroke-width', strokeWidth)
                }
            })
    }

    function getContinuousColor(value, out) {
        const colorFn = out.colorFunction_
        const domain = out.domain_ || [0, 1]
        const isD3Scale = typeof colorFn?.domain === 'function'
        const transform = out.valueTransform_ || ((d) => d)

        const transformed = transform(value)
        if (isNaN(transformed)) return out.noDataFillStyle_ || 'gray'

        if (isD3Scale) {
            return colorFn(transformed)
        }

        let t
        if (domain.length === 3) {
            const [d0, , d2] = domain
            const divT = transform(out.pointOfDivergence_ ?? 0)
            t = transformed < divT ? (0.5 * (transformed - d0)) / (divT - d0) : 0.5 + (0.5 * (transformed - divT)) / (d2 - divT)
        } else {
            const [d0, d1] = domain
            t = (transformed - d0) / (d1 - d0)
        }

        return colorFn(Math.min(Math.max(t, 0), 1))
    }

    const regionsFillFunction = function (rg) {
        const ecl = select(this).attr('ecl') // may be a class index or a raw value
        const colorSchemeType = out.colorSchemeType_ || 'discrete'

        if (!ecl && ecl !== '0') {
            return // input not added
        }

        // Data not available
        if (ecl === 'nd') {
            return out.noDataFillStyle_ || 'gray'
        }

        // Dot-density or pattern-fill mode
        if (out.filtersDefinitionFunction_) {
            return out.classToFillStyle_(ecl)
        }

        // Continuous color scheme
        if (colorSchemeType === 'continuous') {
            const rawValue = +ecl
            return getContinuousColor(rawValue, out)
        }

        // Discrete color scheme
        if (out.Geometries?.userGeometries) {
            return out.classToFillStyle_(ecl, out.numberOfClasses_ || 1)
        }

        if (out.geo_ === 'WORLD') {
            const fillStyle = out.classToFillStyle_(ecl, out.numberOfClasses_ || 1)
            return fillStyle || out.cntrgFillStyle_
        }

        // Default (NUTS case)
        return out.classToFillStyle_(ecl, out.numberOfClasses_ || 1)
    }

    const addMouseEventsToRegions = function (map, regions) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', map.hoverColor_) // Apply highlight color
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (out._tooltip) out._tooltip.mousemove(e)
                if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', sel.attr('fill___')) // Revert to original color
                if (out._tooltip) out._tooltip.mouseout()
                if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
            })
    }

    // Manually highlight a region by ID (simulate mouseover)
    out.highlightRegion = function (regionId) {
        if (!out.svg_) return out

        const selector = getRegionsSelector(out)
        const region = out
            .svg()
            .selectAll(selector)
            .filter((d) => d.properties.id === regionId)

        if (!region.empty()) {
            const rg = region.datum()
            const sel = region
            sel.style('fill', out.hoverColor_ || 'orange')

            if (out._tooltip) {
                const html = out.tooltip_.textFunction(rg, out)
                out._tooltip.mouseover(html)

                // Get region bounds (in SVG space)
                const bbox = region.node().getBBox()

                // Apply current zoom/pan transform
                const transform = out.__lastTransform || { x: 0, y: 0, k: 1 }
                const scaledX = (bbox.x + bbox.width / 2) * transform.k + transform.x
                const scaledY = (bbox.y + bbox.height / 2) * transform.k + transform.y

                // Convert to screen coords
                const mapRect = out.svg().node().getBoundingClientRect()
                const x = mapRect.left + scaledX
                const y = mapRect.top + scaledY

                out._tooltip.ensureTooltipOnScreen(x, y)
            }

            if (out.onRegionMouseOver_) {
                out.onRegionMouseOver_(null, rg, region.node(), out)
            }
        }
        return out
    }

    // Manually clear the highlight (simulate mouseout)
    out.clearHighlight = function () {
        if (!out.svg_) return out

        const selector = getRegionsSelector(out)
        out.svg()
            .selectAll(selector)
            .each(function () {
                const sel = select(this)
                const original = sel.attr('fill___')
                if (original) sel.style('fill', original)
            })

        if (out._tooltip) {
            out._tooltip.mouseout()
        }

        return out
    }

    return out
}

//build a color legend object
export const getColorFunction = function (colorFunction, colorArray, schemeType = 'discrete') {
    colorFunction = colorFunction || interpolateYlGnBu

    if (schemeType === 'continuous') {
        return function (value, domain = [0, 1]) {
            const t = (value - domain[0]) / (domain[1] - domain[0])
            return colorFunction(Math.min(Math.max(t, 0), 1))
        }
    }

    if (colorArray) {
        return function (ecl, numberOfClasses) {
            return colorArray[ecl]
        }
    }

    return function (ecl, numberOfClasses) {
        return colorFunction(ecl / (numberOfClasses - 1))
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
    if (map.tooltip_.omitRegions && map.tooltip_.omitRegions.includes(region.properties.id)) {
        return '' // Skip tooltip for omitted regions
    }
    const buf = []

    // Header with region name and ID
    const regionName = region.properties.na || region.properties.name
    const regionId = region.properties.id
    buf.push(`
        <div class="em-tooltip-bar">
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
            <div class="em-tooltip-text no-data">
                <table class="em-tooltip-table">
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
        <div class="em-tooltip-text">
            <table class="em-tooltip-table">
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
