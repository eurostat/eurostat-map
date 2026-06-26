//map-choropleth.js
import { select } from 'd3-selection'
import { min, max } from 'd3-array'
import { scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
import { interpolateYlGnBu } from 'd3-scale-chromatic'
import { piecewise, interpolateLab } from 'd3-interpolate'
import { createStatMap, buildSingleLayerMap } from '../../core/stat-map'
import { registerLayerType } from '../../core/layer-registry'
import * as ChoroplethLegend from '../../legend/choropleth/legend-choropleth'
import {
    applyNiceNumbers,
    checkIfDiverging,
    executeForAllInsets,
    getRegionsSelector,
    getTextColorForBackground,
    spaceAsThousandSeparator,
    flags,
} from '../../core/utils'
import { jenks, ckmeans } from 'simple-statistics'
import { applyPatternFill } from '../../core/decoration/pattern-fill'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/layers/choropleth/ChoroplethConfig').ChoroplethConfig} ChoroplethConfig */
/** @typedef {import('../../types/layers/choropleth/ChoroplethMap').ChoroplethMap} ChoroplethMap */

/**
 * Returns a choropleth map.
 * @param {ChoroplethConfig} [config]
 * @returns {ChoroplethMap}
 */
export const map = function (config) {
    return buildSingleLayerMap('choropleth', config)
}

/**
 * Decorates a Layer object with choropleth-specific state and methods.
 * @param {object} layer
 * @param {object} config
 */
export const decorateChoroplethLayer = function (layer, config) {
    //the number of classes
    layer.numberOfClasses_ = 7
    //the classification method
    layer.classificationMethod_ = 'quantile' // or: ckmeans, jenks, equinter, threshold
    //the threshold, when the classification method is 'threshold'
    layer.thresholds_ = [0]
    //colors to use for classes
    layer.colors_ = null
    //when computed automatically, ensure the threshold are nice rounded values
    layer.makeClassifNice_ = false
    //the color function [0,1] -> color
    const paletteA = ['#D4DAF0', '#C1C9EB', '#A8B4E6', '#93A2DC', '#7C90D6', '#677CD2', '#5169BE', '#3C57B0', '#2644A7', '#15246B']
    layer.colorFunction_ = (t) => piecewise(interpolateLab, paletteA)(Math.min(Math.max(0, t), 1)) // default
    //a function returning the color from the class i
    layer.classToFillStyle_ = undefined
    //the classifier: a function which return a class number from a stat value.
    layer.classifier_ = undefined
    // set tooltip function
    layer.tooltip_ = layer.tooltip_ || {}
    layer.tooltip_.textFunction = choroplethTooltipFunction

    // continuous color schemes
    layer.colorSchemeType_ = 'discrete' // or 'continuous'
    layer.valueTransform_ = (x) => x // for distribution stretching in continuous mode
    layer.valueUntransform_ = (x) => x // the legends need to 'untransform' the value to show the original value
    layer.skipNormalization_ = false // whether to skip normalization step for continuous color schemes (e.g. for pre-normalized data like quantile)
    layer.pointOfDivergence_ = null // the point in the domain where the color diverges (e.g. 0 for a diverging color scheme)

    // Getter/setters for exposed attributes
    const paramNames = [
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
        'skipNormalization_',
    ]
    paramNames.forEach(function (att) {
        layer[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return layer[att]
            layer[att] = v
            return layer
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) layer[k](config[k])
        })
    }

    //override of some special getters/setters
    layer.colorFunction = function (v) {
        if (!arguments.length) return layer.colorFunction_
        layer.colorFunction_ = v
        if (layer.filtersDefinitionFunction_) {
            // dot density style
            layer.classToFillStyle(getFillPatternLegend())
        } else {
            // update color function
            const newFunction = getColorFunction(layer.colorFunction_, layer.colors_, layer.colorSchemeType_)
            layer.classToFillStyle(newFunction)
        }

        return layer
    }
    layer.threshold = function (v) {
        if (!arguments.length) return layer.thresholds_
        layer.thresholds_ = v
        layer.numberOfClasses(v.length + 1)
        return layer
    }
    layer.filtersDefinitionFunction = function (v) {
        if (!arguments.length) return layer.filtersDefinitionFunction_
        layer.filtersDefinitionFunction_ = v
        const map = layer.map
        if (map && map.svg()) layer.filtersDefinitionFunction_(map.svg(), layer.numberOfClasses_)
        return layer
    }

    //@override
    layer.updateClassification = function () {
        try {
            const map = layer.map
            // apply classification to all insets that are outside of the main map's SVG
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, applyClassificationToMap)
            }

            // apply to main map
            applyClassificationToMap(map)

            return layer
        } catch (e) {
            console.error('Error in updateClassification:', e.message)
            console.error(e)
        }
    }

    function applyClassificationToMap(map) {
        const generateRange = (nb) => [...Array(nb).keys()]
        const fillData = layer.getEncodingStatData?.('fill', undefined, 'default') || map.statData()
        const dataArray = fillData.getArray()
        const dataArrayNumeric = (dataArray || []).map((v) => +v).filter((v) => Number.isFinite(v))

        if (dataArray) {
            const setupClassifier = () => {
                const range = generateRange(layer.numberOfClasses_)

                if (layer.colorSchemeType_ === 'continuous') {
                    const valueTransform = layer.valueTransform_ || ((d) => d)

                    if (layer.skipNormalization_) {
                        // Transform already outputs 0-1 (e.g. quantile, jenks)
                        // No domain normalisation needed
                        layer.domain_ = null
                    } else {
                        const transformedValues = dataArrayNumeric.map(valueTransform)
                        const minVal = min(transformedValues)
                        const maxVal = max(transformedValues)
                        const isDiverging = checkIfDiverging(layer)
                        const isFullScale = typeof layer.colorFunction_?.domain === 'function'

                        if (!isFullScale) {
                            if (isDiverging) {
                                const divergence = valueTransform(layer.pointOfDivergence_ ?? 0)
                                layer.domain_ = [minVal, divergence, maxVal]
                            } else {
                                layer.domain_ = [minVal, maxVal]
                            }
                        }
                    }

                    layer.classifier((val) => val) // identity
                }

                switch (layer.classificationMethod_) {
                    case 'quantile': {
                        layer.classifier(scaleQuantile().domain(dataArrayNumeric).range(range))
                        break
                    }
                    case 'equal-interval':
                    case 'equinter': {
                        layer.classifier(
                            scaleQuantize()
                                .domain([min(dataArrayNumeric), max(dataArrayNumeric)])
                                .range(range)
                        )
                        break
                    }
                    case 'threshold': {
                        layer.numberOfClasses(layer.thresholds_.length + 1)
                        layer.classifier(scaleThreshold().domain(layer.thresholds_).range(generateRange(layer.numberOfClasses_)))
                        break
                    }
                    case 'jenks': {
                        const jenksBreaks = jenks(dataArrayNumeric, layer.numberOfClasses_) //data, lowerClassLimits, nClasses
                        const domain = jenksBreaks.slice(1, -1)
                        layer.classifier(scaleThreshold().domain(domain).range(range))
                        break
                    }
                    case 'ckmeans': {
                        const ckmeansBreaks = ckmeans(dataArrayNumeric, layer.numberOfClasses_).map((cluster) => cluster.pop())
                        const domain = ckmeansBreaks.slice(0, -1)
                        layer.classifier(scaleThreshold().domain(domain).range(range))
                        break
                    }
                }

                // For quantile, keep exact quantile thresholds so class counts stay balanced.
                if (layer.makeClassifNice_) {
                    const rawThresholds = layer.classifier_.domain()
                    const niceThresholds = applyNiceNumbers(rawThresholds, dataArrayNumeric)
                    layer.classifier_.domain(niceThresholds)
                }
            }

            // add class attributes to region elements
            const classifyRegions = (regions) => {
                regions
                    .attr('ni', null) // reset
                    .attr('ecl', null)

                regions.each(function (rg) {
                    const sel = select(this)

                    const regionData = fillData.get(rg.properties.id)

                    //no input
                    if (!regionData) {
                        sel.attr('ni', 1)
                        return
                    }

                    const value = regionData.value

                    // no data
                    if (value === ':' || value == null || Number.isNaN(value)) {
                        sel.attr('ecl', 'nd')
                        return
                    }

                    //continuous (raw value as attribute for color function)
                    if (layer.colorSchemeType_ === 'continuous') {
                        sel.attr('ecl', value)
                        return
                    }

                    // classification into discrete classes
                    sel.attr('ecl', +layer.classifier_(value))
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
    }

    //@override
    layer.updateStyle = function () {
        try {
            const map = layer.map
            // apply style to insets
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, applyStyleToMap)
            }

            // apply to main map
            applyStyleToMap(map)

            return layer
        } catch (e) {
            console.error('Error in updateStyle:', e.message)
            console.error(e)
        }
    }

    function applyStyleToMap(map) {
        // Define function to get a class' color
        if (layer.filtersDefinitionFunction_) {
            // Dot density style
            layer.classToFillStyle(getFillPatternLegend())
        } else {
            // Color legend style
            layer.classToFillStyle(getColorFunction(layer.colorFunction_, layer.colors_))
        }

        // Apply color and events to regions if SVG exists
        if (map.svg_) {
            const selector = getRegionsSelector(map)
            const regions = map.svg().selectAll(selector)

            // Apply transition and set initial fill colors with data-driven logic
            regions
                .style('pointer-events', 'none') // disable interaction during transition
                .transition()
                .duration(map.transitionDuration())
                .style('fill', regionsFillFunction)
                .end()
                .then(() => {
                    // Re-enable interaction after the transition
                    regions.style('pointer-events', null)
                    // Store the original color for each region
                    regions.each(function () {
                        const sel = select(this)
                        sel.attr('fill___', sel.style('fill'))
                    })
                    // Set up mouse events
                    addMouseEventsToRegions(map, regions)

                    // update font color for grid cartograms (contrast)
                    if (layer.map.gridCartogram_) {
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
            if (map.nutsLevel_ === 'mixed') {
                styleMixedNUTS(map)
            }

            // Update labels for statistical values if required
            if (map.labels_) {
                if (map.labels_.values) map.updateValuesLabels(map)
            }

            //add hatching if needed
            if (map.patternFill_) {
                applyPatternFill(map, map.patternFill_)
            }
        }
    }

    //@override
    layer.getLegendConstructor = function () {
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

    const regionsFillFunction = function (rg) {
        const sel = select(this)
        const ecl = sel.attr('ecl') // may be a class index or a raw value
        const isNoInput = sel.attr('ni') === '1'
        const colorSchemeType = layer.colorSchemeType_ || 'discrete'

        if (!ecl && ecl !== '0') {
            return // input not added
        }

        // Data not available or region missing in input data
        if (ecl === 'nd' || isNoInput) {
            return layer.noDataFillStyle_ || 'gray'
        }

        // Dot-density or pattern-fill mode
        if (layer.filtersDefinitionFunction_) {
            return layer.classToFillStyle_(ecl)
        }

        // Continuous color scheme
        if (colorSchemeType === 'continuous') {
            const rawValue = +ecl
            return getContinuousColor(rawValue, layer)
        }

        // Discrete color scheme
        if (layer.map.Geometries?.userGeometries) {
            return layer.classToFillStyle_(ecl, layer.numberOfClasses_ || 1)
        }

        if (layer.map.geo_ === 'WORLD') {
            const fillStyle = layer.classToFillStyle_(ecl, layer.numberOfClasses_ || 1)
            return fillStyle || layer.map.cntrgFillStyle_
        }

        // Default (NUTS case)
        return layer.classToFillStyle_(ecl, layer.numberOfClasses_ || 1)
    }

    const addMouseEventsToRegions = function (map, regions) {
        const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
        regions
            .on('mouseover', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', map.hoverColor_) // Apply highlight color
                if (map._tooltip) map._tooltip.mouseover(layer.tooltip_.textFunction(rg, layer))
                if (map.onRegionMouseOver_) map.onRegionMouseOver_(e, rg, this, map)
            })
            .on('mousemove', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                if (map._tooltip) map._tooltip.mousemove(e)
                if (map.onRegionMouseMove_) map.onRegionMouseMove_(e, rg, this, map)
            })
            .on('mouseout', function (e, rg) {
                if (shouldOmit(rg.properties.id)) return
                const sel = select(this)
                sel.style('fill', sel.attr('fill___')) // Revert to original color
                if (map._tooltip) map._tooltip.mouseout()
                if (map.onRegionMouseOut_) map.onRegionMouseOut_(e, rg, this, map)
            })
    }

    // Manually highlight a region by ID (simulate mouseover)
    layer.highlightRegion = function (regionId) {
        const map = layer.map
        if (!map.svg_) return layer

        const selector = getRegionsSelector(map)
        const region = map
            .svg()
            .selectAll(selector)
            .filter((d) => d.properties.id === regionId)

        if (!region.empty()) {
            const rg = region.datum()
            const sel = region
            sel.style('fill', map.hoverColor_ || 'orange')

            if (map._tooltip) {
                const html = layer.tooltip_.textFunction(rg, layer)
                map._tooltip.mouseover(html)

                // Get region bounds (in SVG space)
                const bbox = region.node().getBBox()

                // Apply current zoom/pan transform
                const transform = map.__lastTransform || { x: 0, y: 0, k: 1 }
                const scaledX = (bbox.x + bbox.width / 2) * transform.k + transform.x
                const scaledY = (bbox.y + bbox.height / 2) * transform.k + transform.y

                // Convert to screen coords
                const mapRect = map.svg().node().getBoundingClientRect()
                const x = mapRect.left + scaledX
                const y = mapRect.top + scaledY

                map._tooltip.ensureTooltipOnScreen(x, y)
            }

            if (map.onRegionMouseOver_) {
                map.onRegionMouseOver_(null, rg, region.node(), map)
            }
        }
        return layer
    }

    // Manually clear the highlight (simulate mouseout)
    layer.clearHighlight = function () {
        const map = layer.map
        if (!map.svg_) return layer

        const selector = getRegionsSelector(map)
        map.svg()
            .selectAll(selector)
            .each(function () {
                const sel = select(this)
                const original = sel.attr('fill___')
                if (original) sel.style('fill', original)
            })

        if (map._tooltip) {
            map._tooltip.mouseout()
        }

        return layer
    }

    return layer
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

const choroplethTooltipFunction = function (region, layer) {
    if (layer.map.tooltip_.omitRegions && layer.map.tooltip_.omitRegions.includes(region.properties.id)) {
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
    const statData = layer.getEncodingStatData?.('fill', undefined, 'default') || layer.map.statData()
    const sv = statData.get(regionId)
    const unit = statData.unitText() || ''

    // No data case
    if (!sv || (sv.value !== 0 && !sv.value) || sv.value === ':') {
        buf.push(`
            <div class="em-tooltip-text no-data">
                <table class="em-tooltip-table">
                    <tbody>
                        <tr><td>${layer.map.noDataText_}</td></tr>
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
    if (statusFlag && layer.map.tooltip_.showFlags) {
        const flagText = layer.map.tooltip_.showFlags === 'short' ? statusFlag : flags[statusFlag] || statusFlag
        buf.push(` <span class="status-flag">${flagText}</span>`)
    }

    return buf.join('')
}

function getContinuousColor(value, layer) {
    const colorFn = layer.colorFunction_
    const transform = layer.valueTransform_ || ((d) => d)
    const transformed = transform(value)
    if (isNaN(transformed)) return layer.noDataFillStyle_ || 'gray'

    // skipNormalization: transform already returns 0-1
    if (layer.skipNormalization_) {
        return colorFn(Math.min(Math.max(transformed, 0), 1))
    }

    const domain = layer.domain_ || [0, 1]
    const isD3Scale = typeof colorFn?.domain === 'function'
    if (isD3Scale) return colorFn(transformed)

    let t
    if (domain.length === 3) {
        const [d0, , d2] = domain
        const divT = transform(layer.pointOfDivergence_ ?? 0)
        t = transformed < divT ? (0.5 * (transformed - d0)) / (divT - d0) : 0.5 + (0.5 * (transformed - divT)) / (d2 - divT)
    } else {
        const [d0, d1] = domain
        t = (transformed - d0) / (d1 - d0)
    }

    return colorFn(Math.min(Math.max(t, 0), 1))
}

registerLayerType('choropleth', 'base', decorateChoroplethLayer)
registerLayerType('ch', 'base', decorateChoroplethLayer)
