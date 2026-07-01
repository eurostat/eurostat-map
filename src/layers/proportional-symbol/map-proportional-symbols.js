import { select } from 'd3-selection'
import { interpolateOrRd } from 'd3-scale-chromatic'
import * as StatMap from '../../core/stat-map.js'
import * as ProportionalSymbolLegend from '../../legend/proportional-symbol/legend-proportional-symbols.js'
import { spaceAsThousandSeparator, executeForAllInsets, getRegionsSelector, getTextColorForBackground } from '../../core/utils.js'
import { applyPatternFill } from '../../core/decoration/pattern-fill.js'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling.js'
import { applyClassificationToMap, defineClassifiers } from './ps-classification.js'
import { updateBackgroundColor } from './ps-background.js'
import { addMouseEvents } from './ps-interactions.js'
import { appendSpikesToMap } from './symbols/spikes.js'
import { appendCirclesToMap } from './symbols/circles.js'
import { appendBarsToMap } from './symbols/bars.js'
import { appendD3SymbolsToMap } from './symbols/d3-symbols.js'
import { appendCustomSymbolsToMap } from './symbols/custom.js'
import { appendLabelsToSymbols } from '../../core/decoration/labels.js'
import { getCentroidsGroup } from '../../core/geo/centroids.js'
import { registerLayerType } from '../../core/layer-registry.js'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/layers/proportional-symbol/ProportionalSymbolConfig').ProportionalSymbolConfig} ProportionalSymbolConfig */
/** @typedef {import('../../types/layers/proportional-symbol/ProportionalSymbolMap').ProportionalSymbolMap} ProportionalSymbolMap */

/**
 * Returns a proportional symbol map.
 *
 * @param {ProportionalSymbolConfig} [config]
 * @returns {ProportionalSymbolMap}
 */
export const map = function (config) {
    return StatMap.buildSingleLayerMap('proportionalSymbol', config)
}

const getLayerAndMap = function (layerOrMap) {
    if (layerOrMap.map) {
        return { layer: layerOrMap, map: layerOrMap.map }
    }
    return { layer: layerOrMap, map: layerOrMap }
}

export const decorateProportionalSymbolLayer = function (layer, config) {
    //shape
    layer.psShape_ = 'circle' // accepted values: circle, bar, square, star, diamond, wye, cross
    layer.psCustomShape_ = undefined
    layer.psCustomSVG_ = undefined
    layer.psSpikeWidth_ = 7
    layer.psOffset_ = { x: 0, y: 0 }

    //size
    layer.psMaxSize_ = 30 // max symbol size
    layer.psMinSize_ = 5 // min symbol size
    layer.psBarWidth_ = 10 //for vertical bars
    layer.psMaxValue_ = undefined
    layer.psMinValue_ = undefined
    layer.psSizeScale_ = undefined // 'sqrt' or 'linear'

    //colour
    layer.psFill_ = '#009569'
    layer.psFillOpacity_ = 1
    layer.psStroke_ = '#ffffff'
    layer.psStrokeWidth_ = 0.2
    layer.psStrokeOpacity_ = 1
    layer.psClasses_ = 5
    layer.psColors_ = null
    layer.psColorFun_ = interpolateOrRd
    layer.psClassToFillStyle_ = undefined
    layer.psBrightenFactor_ = 0.9

    //the threshold, when the classification method is 'threshold'
    layer.psThresholds_ = [0]
    //the classification method
    layer.psClassificationMethod_ = 'quantile' // or: equinter, threshold
    //when computed automatically, ensure the threshold are nice rounded values
    layer.makeClassifNice_ = true
    //the classifier
    layer.classifierSize_ = undefined
    layer.classifierColor_ = undefined
    
    //specific tooltip text function
    layer.tooltip_ = layer.tooltip_ || {}
    layer.tooltip_.textFunction = tooltipTextFunPs

    layer.psCodeLabels_ = false
    
    layer.dorling_ = config?.dorling || false
    layer.dorlingSettings_ = Object.assign({}, layer.map?.dorlingSettings_ || {}, config?.dorlingSettings || {})

    const getPsSettingsSnapshot = function () {
        return {
            shape: layer.psShape_,
            customShape: layer.psCustomShape_,
            customSVG: layer.psCustomSVG_,
            spikeWidth: layer.psSpikeWidth_,
            offset: layer.psOffset_,
            barWidth: layer.psBarWidth_,
            minValue: layer.psMinValue_,
            maxValue: layer.psMaxValue_,
            fill: layer.psFill_,
            fillOpacity: layer.psFillOpacity_,
            stroke: layer.psStroke_,
            strokeWidth: layer.psStrokeWidth_,
            strokeOpacity: layer.psStrokeOpacity_,
            sizeScale: layer.psSizeScale_,
            minSize: layer.psMinSize_,
            maxSize: layer.psMaxSize_,
            classes: layer.psClasses_,
            colors: layer.psColors_,
            colorFun: layer.psColorFun_,
            classToFillStyle: layer.psClassToFillStyle_,
            thresholds: layer.psThresholds_,
            classificationMethod: layer.psClassificationMethod_,
            brightenFactor: layer.psBrightenFactor_,
            codeLabels: layer.psCodeLabels_,
        }
    }

    layer.psSettings = function (v) {
        if (!arguments.length) return getPsSettingsSnapshot()
        if (!v || typeof v !== 'object' || Array.isArray(v)) return layer

        if (v.shape !== undefined) layer.psShape_ = v.shape
        if (v.customShape !== undefined) layer.psCustomShape_ = v.customShape
        if (v.customSVG !== undefined) layer.psCustomSVG_ = v.customSVG
        if (v.spikeWidth !== undefined) layer.psSpikeWidth_ = v.spikeWidth
        if (v.offset !== undefined) layer.psOffset_ = v.offset
        if (v.barWidth !== undefined) layer.psBarWidth_ = v.barWidth
        if (v.minValue !== undefined) layer.psMinValue_ = v.minValue
        if (v.maxValue !== undefined) layer.psMaxValue_ = v.maxValue
        if (v.fill !== undefined) layer.psFill_ = v.fill
        if (v.fillOpacity !== undefined) layer.psFillOpacity_ = v.fillOpacity
        if (v.stroke !== undefined) layer.psStroke_ = v.stroke
        if (v.strokeWidth !== undefined) layer.psStrokeWidth_ = v.strokeWidth
        if (v.strokeOpacity !== undefined) layer.psStrokeOpacity_ = v.strokeOpacity
        if (v.sizeScale !== undefined) layer.psSizeScale_ = v.sizeScale
        if (v.minSize !== undefined) layer.psMinSize_ = v.minSize
        if (v.maxSize !== undefined) layer.psMaxSize_ = v.maxSize
        if (v.classes !== undefined) layer.psClasses_ = v.classes
        if (v.colors !== undefined) layer.psColors_ = v.colors
        if (v.colorFun !== undefined) layer.psColorFun_ = v.colorFun
        if (v.classToFillStyle !== undefined) layer.psClassToFillStyle_ = v.classToFillStyle
        if (v.classificationMethod !== undefined) layer.psClassificationMethod_ = v.classificationMethod
        if (v.thresholds !== undefined) {
            layer.psThresholds_ = v.thresholds
            layer.psClassificationMethod_ = 'threshold'
            layer.psClasses_ = v.thresholds.length + 1
        }
        if (v.brightenFactor !== undefined) layer.psBrightenFactor_ = v.brightenFactor
        if (v.codeLabels !== undefined) layer.psCodeLabels_ = v.codeLabels

        if (v.colorFun !== undefined || v.colors !== undefined) {
            layer.psClassToFillStyle_ = getColorLegend(layer.psColorFun_, layer.psColors_)
        }

        return layer
    }

    const paramNames = [
        'psMaxSize_',
        'psMinSize_',
        'psMaxValue_',
        'psMinValue_',
        'psFill_',
        'psFillOpacity_',
        'psStrokeOpacity_',
        'psStroke_',
        'psStrokeWidth_',
        'classifierSize_',
        'classifierColor_',
        'psShape_',
        'psCustomShape_',
        'psBarWidth_',
        'psClassToFillStyle_',
        'psColorFun_',
        'psSizeScale_',
        'noDataFillStyle_',
        'psThresholds_',
        'psColors_',
        'psCustomSVG_',
        'psOffset_',
        'psClassificationMethod_',
        'psClasses_',
        'dorling_',
        'psSpikeWidth_',
        'psCodeLabels_',
        'psBrightenFactor_',
        'dorlingSettings_',
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
        if (config.psSettings !== undefined) layer.psSettings(config.psSettings)

        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) layer[k](config[k])
        })
    }

    const deprecatedPsSettingsWrappers = [
        ['psShape', 'shape'],
        ['psCustomShape', 'customShape'],
        ['psCustomSVG', 'customSVG'],
        ['psSpikeWidth', 'spikeWidth'],
        ['psOffset', 'offset'],
        ['psBarWidth', 'barWidth'],
        ['psMinValue', 'minValue'],
        ['psMaxValue', 'maxValue'],
        ['psFill', 'fill'],
        ['psFillOpacity', 'fillOpacity'],
        ['psStroke', 'stroke'],
        ['psStrokeWidth', 'strokeWidth'],
        ['psStrokeOpacity', 'strokeOpacity'],
        ['psSizeScale', 'sizeScale'],
        ['psMinSize', 'minSize'],
        ['psMaxSize', 'maxSize'],
        ['psClasses', 'classes'],
        ['psColors', 'colors'],
        ['psColorFun', 'colorFun'],
        ['psClassToFillStyle', 'classToFillStyle'],
        ['psThresholds', 'thresholds'],
        ['psClassificationMethod', 'classificationMethod'],
        ['psBrightenFactor', 'brightenFactor'],
        ['psCodeLabels', 'codeLabels'],
    ]

    deprecatedPsSettingsWrappers.forEach(function ([legacyMethod, settingsKey]) {
        layer[legacyMethod] = function (v) {
            console.warn(`map.${legacyMethod}() is now DEPRECATED. Please use map.psSettings({ ${settingsKey} }) instead.`)
            if (!arguments.length) return layer.psSettings()[settingsKey]
            layer.psSettings({ [settingsKey]: v })
            return layer
        }
    })

    //@override
    layer.updateClassification = function () {
        try {
            const map = layer.map
            //define classifiers for sizing and colouring
            defineClassifiers(layer)

            // apply classification to all insets that are outside of the main map's SVG
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => applyClassificationToMap(inset, layer))
            }

            // apply to main map
            applyClassificationToMap(map, layer)

            return layer
        } catch (e) {
            console.error('Error in proportional symbols classification: ' + e.message)
            console.error(e)
        }
    }

    function applyStyleToMap(map) {
        //define style per class
        if (!layer.psClassToFillStyle()) layer.psClassToFillStyle(getColorLegend(layer.psColorFun_, layer.psColors_))

        // Gate background color: skip if a base layer (e.g. choropleth) is present below us!
        const hasBaseLayer = map.layers_ && map.layers_.some(l => l.role === 'base' && l !== layer)
        if (!hasBaseLayer) {
            // update region color according to symbol color
            const backgroundSymbolFill = layer.classifierColor_ ? layer.psClassToFillStyle_(layer.psClasses_ - 1, layer.psClasses_) : layer.psFill_
            updateBackgroundColor(map, backgroundSymbolFill)
        }

        // For facade maps (single-layer), inset styling must target the current map.
        // For real overlay layers, keep targeting the layer object.
        const symbolTarget = layer.map ? layer : map

        // if size dataset not defined then use default
        const sizeData = getSizeStatData(symbolTarget)

        if (map.svg_) {
            //clear previous symbols in this layer group
            const centroidsGroup = getCentroidsGroup(symbolTarget)
            centroidsGroup.selectAll('g.em-centroid > *').remove()

            // 'small' centroids on top of big ones
            layer.updateSymbolsDrawOrder.call(symbolTarget, map)

            // append symbols to centroids
            let symb
            if (layer.psCustomSVG_) {
                symb = appendCustomSymbolsToMap(map, sizeData, symbolTarget)
            } else if (layer.psShape_ == 'bar') {
                symb = appendBarsToMap(map, sizeData, symbolTarget)
            } else if (layer.psShape_ == 'circle') {
                symb = appendCirclesToMap(map, sizeData, symbolTarget)
            } else if (layer.psShape_ == 'spike') {
                symb = appendSpikesToMap(map, sizeData, symbolTarget)
            } else {
                // circle, cross, star, triangle, diamond, square, wye or custom
                symb = appendD3SymbolsToMap(map, sizeData, symbolTarget)
            }

            setRegionStyles(map, sizeData)
            setSymbolStyles(symb)
            appendLabelsToSymbols(map, sizeData, layer)

            const transitionDuration = map.transitionDuration_ || 0
            if (transitionDuration > 0) {
                setTimeout(() => {
                    addMouseEvents(map, layer)
                }, transitionDuration + 100)
            } else {
                addMouseEvents(map, layer)
            }

            // Update labels for statistical values if required
            if (map.labels_?.values) {
                map.updateValuesLabels(map)
            }

            //add hatching if needed
            if (map.patternFill_) {
                applyPatternFill(map, map.patternFill_)
            }
        }
        return map
    }

    const setRegionStyles = function (map, sizeData) {
        // set style of symbols
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)
        const hasBaseLayer = map.layers_ && map.layers_.some((l) => l.role === 'base' && l !== layer)

        if (map.geo_ !== 'WORLD') {
            if (map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, sizeData, regions)
            }

            // In layered maps with a base layer, preserve region ecl classes from the base
            // so choropleth legend hover remains functional.
            if (!hasBaseLayer) {
                // apply 'nd' class to no data regions for legend item hover
                regions.attr('ecl', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0 && sv.value !== '0')) {
                        // NO INPUT
                        return 'ni'
                    } else if (sv && sv.value) {
                        if (sv.value == ':') {
                            // DATA NOT AVAILABLE (no data)
                            return 'nd'
                        }
                    }
                })
            }

            // Only apply no-data fill colors if we are styling the background
            if (!hasBaseLayer) {
                // 1) clear any previous inline fill so CSS can apply to regions that now have data
                regions.style('fill', null)

                // 2) apply gray only to current no-data (":") regions
                regions
                    .filter((rg) => {
                        const sv = sizeData.get(rg.properties.id)
                        return sv && sv.value === ':'
                    })
                    .style('fill', layer.noDataFillStyle())
                    .attr('fill___', layer.noDataFillStyle()) // save for legend mouseover
            }
        }
    }

    /**
     * @description sets color/stroke/opacity styles of all symbols
     * @param {d3.selection} symb symbols d3 selection
     */
    function setSymbolStyles(symb) {
        symb.attr('fill-opacity', layer.psFillOpacity())
            .attr('stroke-opacity', layer.psStrokeOpacity())
            .attr('stroke', layer.psStroke())
            .attr('stroke-width', layer.psStrokeWidth())
            .style('fill', function () {
                if (layer.classifierColor_) {
                    //for ps, ecl attribute belongs to the parent g.em-centroid node created in map-template
                    const ecl = select(this.parentNode).attr('ecl')
                    if (!ecl || ecl === 'nd') return layer.noDataFillStyle_ || 'gray'
                    let color = layer.psClassToFillStyle_(ecl, layer.psClasses_)
                    return color
                } else {
                    return layer.psFill_
                }
            })
            .attr('fill___', function () {
                // Set fill___ to the same value as fill (don't read back style, as it may not be applied yet during transitions)
                if (layer.classifierColor_) {
                    const ecl = select(this.parentNode).attr('ecl')
                    if (!ecl || ecl === 'nd') return layer.noDataFillStyle_ || 'gray'
                    return layer.psClassToFillStyle_(ecl, layer.psClasses_)
                } else {
                    return layer.psFill_
                }
            })
    }

    /**
     * @description Updates the draw order of the symbols according to their data values
     * @param {*} map map instance
     */
    layer.updateSymbolsDrawOrder = function (map) {
        const target = this || layer
        const sizeData = getSizeStatData(target)

        // Ensure centroidFeatures is populated (important for mixed)
        if (!map.Geometries.centroidsFeatures || !map.Geometries.centroidsFeatures.length) {
            // Build features from whatever is currently bound to centroids
            map.Geometries.centroidsFeatures = map
                .svg()
                .selectAll('g.em-centroid')
                .data()
                .filter((d) => d?.properties?.centroid)
        }

        // Sort features by descending value (largest first so small ones are on top)
        const sorted = map.Geometries.centroidsFeatures
            .filter((f) => {
                const v = sizeData.get?.(f.properties.id)?.value
                return v != null && v !== ':' // exclude no-data
            })
            .sort((a, b) => sizeData.get(b.properties.id).value - sizeData.get(a.properties.id).value)

        // Clear old symbol containers
        const centroidsGroup = getCentroidsGroup(target)
        centroidsGroup.selectAll('g.em-centroid').remove()

        // Re-select fresh, then recreate sorted symbol containers
        centroidsGroup
            .selectAll('g.em-centroid')
            .data(sorted, (d) => d.properties.id)
            .enter()
            .append('g')
            .attr('class', 'em-centroid')
            .attr('id', (d) => 'ps' + d.properties.id)
            .attr('transform', (d) => `translate(${d.properties.centroid[0].toFixed(3)},${d.properties.centroid[1].toFixed(3)})`)

        // Re-apply classification to the new containers
        applyClassificationToMap(map, target)
    }

    /**
     * @description adds proportional symbols to each regions in a map with mixed NUTS levels (IMAGE)
     * @param {*} map
     * @param {*} sizeData
     * @param {*} regions
     * @return {*}
     */
    function styleMixedNUTSRegions(map, sizeData, regions) {
        // toggle display of mixed NUTS levels
        regions.style('display', function (rg) {
            if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
            const sv = sizeData.get(rg.properties.id)
            if (!sv || (!sv.value && sv !== 0 && sv.value !== 0 && sv.value !== '0')) {
                // no symbol for no data
                return 'none'
            } else if (map.geo_ == 'WORLD') {
                return 'block'
            }
        })

        // nuts border stroke
        regions
            .style('stroke', function (rg) {
                const sel = select(this)
                const lvl = sel.attr('lvl')
                const stroke = sel.style('stroke')
                const sv = sizeData.get(rg.properties.id)
                if (!sv || !sv.value) {
                    return
                } else {
                    if (lvl !== '0') {
                        return stroke || '#777'
                    }
                }
            })

            // nuts border stroke width
            .style('stroke-width', function (rg) {
                const sel = select(this)
                const lvl = sel.attr('lvl')
                const strokeWidth = sel.style('stroke-width')
                const sv = sizeData.get(rg.properties.id)
                if (!sv || !sv.value) {
                    return
                } else if (map.geo_ == 'WORLD') {
                    if (lvl !== '0') {
                        return strokeWidth || '#777'
                    }
                }
            })
    }

    //@override
    layer.updateStyle = function () {
        try {
            const map = layer.map
            // apply to main map
            applyStyleToMap(map)

            // apply style to insets
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, applyStyleToMap)
            }

            // dorling cartogram
            if (layer.dorling_) {
                // Dorling currently reads nodes from map.Geometries.centroidsFeatures.
                // In migrated single-layer maps, centroids are maintained on the active layer.
                if (layer.centroidsFeatures_?.length) {
                    map.Geometries.centroidsFeatures = layer.centroidsFeatures_
                }

                const sizeData = getSizeStatData(layer)
                runDorlingSimulation(
                    map,
                    (d) => {
                        const datum = sizeData.get(d.properties.id)
                        const r = datum ? layer.classifierSize_(+datum.value) : 0
                        return layer.psShape_ === 'square' ? (r / 2) * Math.SQRT2 : r
                    },
                    layer.dorlingSettings_.padding || 0
                )
            } else {
                stopDorlingSimulation(map)
            }

            return layer
        } catch (e) {
            console.error('Error in proportional symbols styling: ' + e.message)
            console.error(e)
        }
    }

    //@override
    layer.getLegendConstructor = function () {
        return ProportionalSymbolLegend.legend
    }

    return layer
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

export function getSizeStatData(layerOrMap) {
    const { layer, map } = getLayerAndMap(layerOrMap)
    const encodedSizeData = layer.getEncodingStatData?.('size', undefined, 'size')
    if (encodedSizeData?.getArray?.()?.length) return encodedSizeData

    const legacySizeData = map.statData('size')
    if (legacySizeData?.getArray?.()?.length) return legacySizeData

    // Backward compatibility: old proportional-symbol maps often populated the
    // default stat dataset via map.statData().setData(...)
    return map.statData()
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} layerOrMap The layer or map element
 */

const tooltipTextFunPs = function (region, layerOrMap) {
    const { layer, map } = getLayerAndMap(layerOrMap)
    if (map.tooltip_.omitRegions && map.tooltip_.omitRegions.includes(region.properties.id)) {
        return '' // Skip tooltip for omitted regions
    }

    const regionName = region.properties.na
    const regionId = region.properties.id

    const formatValue = (val, unit, noDataText) => {
        if (val === ':' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val))) {
            return noDataText || 'Data not available'
        }
        return spaceAsThousandSeparator(val) + (unit ? ' ' + unit : '')
    }

    // Stat 1
    const v1 = getSizeStatData(layer)
    const sv1 = v1.get(region.properties.id)
    const unit1 = v1.unitText?.() || ''
    const row1 = `<tr><td>${formatValue(sv1?.value, unit1, map.noDataText_)}</td></tr>`

    // Stat 2 (optional)
    let row2 = ''
    let v2 = null
    const encodedColorStat = layer.getEncodingStat?.('color')
    if (encodedColorStat) {
        const encodedColorData = layer.getEncodingStatData?.('color')
        if (encodedColorData?.getArray()?.length) v2 = encodedColorData
    } else {
        const legacyColorData = map.statData('color')
        if (legacyColorData?.getArray()?.length) v2 = legacyColorData
    }

    if (v2) {
        const sv2 = v2.get(region.properties.id)
        const unit2 = v2.unitText?.() || ''
        row2 = `<tr><td>${formatValue(sv2?.value, unit2, map.noDataText_)}</td></tr>`
    }

    return `
    <div class="em-tooltip-bar">
      <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
    </div>
    <div class="em-tooltip-text">
      <table class="em-tooltip-table">
        <tbody>
          ${row1}
          ${row2}
        </tbody>
      </table>
    </div>
  `.trim()
}

registerLayerType('proportionalSymbol', 'overlay', decorateProportionalSymbolLayer)
registerLayerType('ps', 'overlay', decorateProportionalSymbolLayer)
registerLayerType('proportionalSymbols', 'overlay', decorateProportionalSymbolLayer)
