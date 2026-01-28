import { max, min } from 'd3-array'
import { select } from 'd3-selection'
import { interpolateOrRd } from 'd3-scale-chromatic'
import * as StatMap from '../../core/stat-map.js'
import * as ProportionalSymbolLegend from '../../legend/proportional-symbol/legend-proportional-symbols.js'
import { symbol, symbolCircle, symbolDiamond, symbolStar, symbolCross, symbolSquare, symbolTriangle, symbolWye } from 'd3-shape'
import { spaceAsThousandSeparator, executeForAllInsets, getRegionsSelector, getTextColorForBackground, updateCSSRule } from '../../core/utils.js'
import { applyPatternFill } from '../../core/pattern-fill.js'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling.js'
import { applyClassificationToMap, defineClassifiers } from './ps-classification.js'
import { updateBackgroundColor } from './ps-background.js'
import { addMouseEvents } from './ps-interactions.js'
import { appendSpikesToMap } from './symbols/spikes.js'
import { appendCirclesToMap } from './symbols/circles.js'

/**
 * Returns a proportional symbol map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'ps')

    //shape
    out.psShape_ = 'circle' // accepted values: circle, bar, square, star, diamond, wye, cross
    out.psCustomShape_ // see http://using-d3js.com/05_10_symbols.html#h_66iIQ5sJIT
    out.psCustomSVG_ // see http://bl.ocks.org/jessihamel/9648495
    out.psSpikeWidth_ = 7 // 'spike' shape widths
    out.psOffset_ = { x: 0, y: 0 }

    //size
    out.psMaxSize_ = 30 // max symbol size
    out.psMinSize_ = 5 // min symbol size
    out.psBarWidth_ = 10 //for vertical bars
    out.psMaxValue_ = undefined // allow the user to manually define the domain of the sizing scale. E.g. if the user wants to use the same scale across different maps.
    out.psMinValue_ = undefined
    out.psSizeScale_ = undefined // 'sqrt' or 'linear'

    //colour
    out.psFill_ = '#009569' //same fill for all symbols when no visual variable (setData()) for 'color' is specified
    out.psFillOpacity_ = 1
    out.psStroke_ = '#ffffff'
    out.psStrokeWidth_ = 0.2
    out.psStrokeOpacity_ = 1
    out.psClasses_ = 5 // number of classes to use for colouring
    out.psColors_ = null //colours to use for threshold colouring
    out.psColorFun_ = interpolateOrRd
    out.psClassToFillStyle_ = undefined //a function returning the color from the class i
    out.psBrightenFactor_ = 0.9 // factor for brightening background color of regions

    //the threshold, when the classification method is 'threshold'
    out.psThresholds_ = [0]
    //the classification method
    out.psClassificationMethod_ = 'quantile' // or: equinter, threshold
    //when computed automatically, ensure the threshold are nice rounded values
    out.makeClassifNice_ = true
    //
    //the classifier: a function which return the symbol size/color from the stat value.
    out.classifierSize_ = undefined
    out.classifierColor_ = undefined
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunPs

    out.psCodeLabels_ = false // show country codes in symbols

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
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
        'dorlingStrength_',
        'dorlingIterations_',
        'animateDorling_',
        'psSpikeWidth_',
        'psCodeLabels_',
        'psBrightenFactor_',
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

    //override of some special getters/setters
    out.psColorFun = function (v) {
        if (!arguments.length) return out.psColorFun_
        out.psColorFun_ = v
        out.psClassToFillStyle_ = getColorLegend(out.psColorFun_, out.psColors_)
        return out
    }
    out.psThresholds = function (v) {
        if (!arguments.length) return out.psThresholds_
        out.psThresholds_ = v
        out.psClasses(v.length + 1)
        return out
    }

    //@override
    out.updateClassification = function () {
        try {
            //define classifiers for sizing and colouring (out.classifierSize_ & out.classifierColor_)
            defineClassifiers(out)

            // apply classification to all insets that are outside of the main map's SVG
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
            }

            // apply to main map
            applyClassificationToMap(out)

            return out
        } catch (e) {
            console.error('Error in proportional symbols classification: ' + e.message)
            console.error(e)
        }
    }

    /**
     * Applies proportional symbol styling to a map object
     *
     * @param {*} map
     * @returns
     */
    function applyStyleToMap(map) {
        // update region color according to symbol color
        updateBackgroundColor(map, out.psFill_)

        //define style per class
        if (!out.psClassToFillStyle()) out.psClassToFillStyle(getColorLegend(out.psColorFun_, out.psColors_))

        // if size dataset not defined then use default
        const sizeData = getSizeStatData(map)

        if (map.svg_) {
            //clear previous centroids
            let prevSymbols = map.svg_.selectAll(':not(#em-insets-group) g.em-centroid > *')
            prevSymbols.remove()

            // 'small' centroids on top of big ones
            out.updateSymbolsDrawOrder(map)

            // append symbols to centroids
            let symb
            if (out.psCustomSVG_) {
                symb = appendCustomSymbolsToMap(map, sizeData)
            } else if (out.psShape_ == 'bar') {
                symb = appendBarsToMap(map, sizeData)
            } else if (out.psShape_ == 'circle') {
                symb = appendCirclesToMap(map, sizeData)
            } else if (out.psShape_ == 'spike') {
                symb = appendSpikesToMap(map, sizeData)
            } else {
                // circle, cross, star, triangle, diamond, square, wye or custom
                symb = appendD3SymbolsToMap(map, sizeData)
            }

            setRegionStyles(map, sizeData)
            setSymbolStyles(symb)
            appendLabelsToSymbols(map, sizeData)
            addMouseEvents(map, out)

            // Update labels for statistical values if required
            if (out.labels_?.values) {
                out.updateValuesLabels(map)
            }

            //add hatching if needed
            if (out.patternFill_) {
                applyPatternFill(map, out.patternFill_)
            }
        }
        return map
    }

    const setRegionStyles = function (map, sizeData) {
        // set style of symbols
        const selector = getRegionsSelector(map)
        const regions = map.svg().selectAll(selector)

        if (map.geo_ !== 'WORLD') {
            if (map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, sizeData, regions)
                // Build centroidFeatures so Dorling has something to simulate
                const centroids = []
                map.svg()
                    .selectAll('g.em-centroid')
                    .each(function (d) {
                        if (!d.properties?.centroid) return
                        centroids.push(d) // d already has properties and id
                    })
                map.Geometries.centroidsFeatures = centroids
            }

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

            // 1) clear any previous inline fill so CSS can apply to regions that now have data
            regions.style('fill', null)

            // 2) apply gray only to current no-data (":") regions
            regions
                .filter((rg) => {
                    const sv = sizeData.get(rg.properties.id)
                    return sv && sv.value === ':'
                })
                .style('fill', out.noDataFillStyle())
                .attr('fill___', out.noDataFillStyle()) // save for legend mouseover
        }
    }

    const appendLabelsToSymbols = function (map, sizeData) {
        let symbolContainers = map.svg().selectAll('g.em-centroid')
        //country code labels
        if (out.psCodeLabels_) {
            const countryCodeLabel = symbolContainers
                .filter((d) => {
                    const datum = sizeData.get(d.properties.id)
                    return datum?.value !== ':' && datum?.value != null // Ignore `':'`, `null`, and `undefined`
                })
                .append('text')
                .attr('class', 'em-circle-code-label')
                .text((d) => {
                    const datum = sizeData.get(d.properties.id)
                    return datum?.value === ':' ? '' : d.properties.id // Hide text if value is ':'
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'sans-serif')
                .style('font-size', (d) => {
                    // calculate radius
                    const datum = sizeData.get(d.properties.id)
                    const radius = datum ? out.classifierSize_(+datum.value) : 0
                    // size adjustment factor depends on symbol type, and whether stat values are also added to the circles
                    let factor = out.labels_?.values && sizeData.get(d.properties.id)?.value ? 0.8 : 0.9
                    if (out.psShape_ === 'square') factor = factor - 0.4
                    return `${radius * factor}px`
                })
                .attr('fill', function () {
                    const fill = window.getComputedStyle(this.parentNode.firstChild)?.fill
                    return getTextColorForBackground(fill)
                })
                .attr('dy', (d) => (out.labels_?.values && sizeData.get(d.properties.id)?.value ? '-0.3em' : '0'))
        }

        //stat labels
        if (out.labels_?.values) {
            const statLabels = symbolContainers
                .filter((d) => {
                    const datum = sizeData.get(d.properties.id)
                    return datum?.value !== ':' && datum?.value != null // Ignore `':'`, `null`, and `undefined`
                })
                .append('text')
                .attr('class', 'em-circle-stat-label')
                .text((d) => {
                    const datum = sizeData.get(d.properties.id)
                    if (datum?.value) return datum.value
                })
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-family', 'sans-serif')
                .style('font-size', (d) => {
                    // calculate radius
                    const datum = sizeData.get(d.properties.id)
                    const radius = datum ? out.classifierSize_(+datum.value) : 0
                    return `${radius * 0.4}px`
                })
                .attr('fill', function () {
                    const fill = window.getComputedStyle(this.parentNode.firstChild)?.fill || out.psFill_
                    return getTextColorForBackground(fill)
                })
                .attr('dy', (d) => (out.psCodeLabels_ ? '0.8em' : '0'))
        }
    }

    /**
     * @description sets color/stroke/opacity styles of all symbols
     * @param {d3.selection} symb symbols d3 selection
     */
    function setSymbolStyles(symb) {
        symb.attr('fill-opacity', out.psFillOpacity())
            .attr('stroke-opacity', out.psStrokeOpacity())
            .attr('stroke', out.psStroke())
            .attr('stroke-width', out.psStrokeWidth())
            .style('fill', function () {
                if (out.classifierColor_) {
                    //for ps, ecl attribute belongs to the parent g.em-centroid node created in map-template
                    const ecl = select(this.parentNode).attr('ecl')
                    if (!ecl || ecl === 'nd') return out.noDataFillStyle_ || 'gray'
                    let color = out.psClassToFillStyle_(ecl, out.psClasses_)
                    return color
                } else {
                    return out.psFill_
                }
            })
            .attr('fill___', function () {
                let fill = select(this).style('fill')
                return fill // save for legend mouseover
            })
    }

    /**
     * @description Updates the draw order of the symbols according to their data values
     * @param {*} map map instance
     */
    out.updateSymbolsDrawOrder = function (map) {
        const gcp = out.getCentroidsGroup(map)
        const sizeData = getSizeStatData(map)

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
        gcp.selectAll('g.em-centroid').remove()

        // Recreate sorted symbol containers
        gcp.selectAll('g.em-centroid')
            .data(sorted, (d) => d.properties.id)
            .enter()
            .append('g')
            .attr('class', 'em-centroid')
            .attr('id', (d) => 'ps' + d.properties.id)
            .attr('transform', (d) => `translate(${d.properties.centroid[0].toFixed(3)},${d.properties.centroid[1].toFixed(3)})`)

        // Re-apply classification to the new containers
        applyClassificationToMap(map)
    }

    /**
     * @description Appends <path> elements containing symbols for each region in the map SVG
     * @param {*} map map instance
     * @param {*} sizeData e.g. map.statData('size')
     * @return {*}
     */
    function appendD3SymbolsToMap(map, sizeData) {
        return map
            .svg()
            .selectAll('g.em-centroid')
            .append('path')
            .filter((rg) => {
                const sv = sizeData.get(rg.properties.id)
                if (sv && sv.value !== ':') return rg
            })
            .attr('class', 'ps')
            .attr('d', (rg) => {
                //calculate size
                if (!sizeData) return
                const sv = sizeData.get(rg.properties.id)
                if (sv != 0 && !sv) return
                let size = out.classifierSize_(+sv.value) || 0

                //apply size to shape
                if (out.psCustomShape_) {
                    return out.psCustomShape_.size(size * size)()
                } else {
                    const symbolType = symbolsLibrary[out.psShape_] || symbolsLibrary['circle']
                    return symbol()
                        .type(symbolType)
                        .size(size * size)()
                }
            })
    }

    /**
     * @description Appends <rect> elements containing bars for each region in the map SVG
     * @param {*} map map instance
     * @param {*} sizeData e.g. map.statData('size')
     * @return {*}
     */
    function appendBarsToMap(map, sizeData) {
        return (
            map
                .getCentroidsGroup(map)
                .selectAll('g.em-centroid')
                .append('rect')
                .filter((rg) => {
                    const sv = sizeData.get(rg.properties.id)
                    if (sv && sv.value !== ':') return rg
                })
                .attr('width', out.psBarWidth_)
                //for vertical bars we scale the height attribute using the classifier
                .attr('height', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || !sv.value) {
                        return 0
                    }
                    let v = out.classifierSize_(+sv.value)
                    return v
                })
                .attr('transform', function () {
                    let bRect = this.getBoundingClientRect()
                    return `translate(${-this.getAttribute('width') / 2}` + `, -${this.getAttribute('height')})`
                })
        )
    }

    /**
     * @description Appends custom SVG symbols for each region in the map
     * @param {*} map
     * @param {*} sizeData
     * @return {*}
     */
    function appendCustomSymbolsToMap(map, sizeData) {
        return map
            .getCentroidsGroup(map)
            .selectAll('g.em-centroid')
            .append('g')
            .filter((rg) => {
                const sv = sizeData.get(rg.properties.id)
                if (sv && sv.value !== ':') return rg
            })
            .attr('class', 'ps')
            .html(out.psCustomSVG_)
            .attr('transform', (rg) => {
                //calculate size
                const sv = sizeData.get(rg.properties.id)
                let size = out.classifierSize_(+sv.value)
                if (size) {
                    return `translate(${out.psOffset_.x * size},${out.psOffset_.y * size}) scale(${size})`
                }
            })
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
                } else if (out.geo_ == 'WORLD') {
                    if (lvl !== '0') {
                        return strokeWidth || '#777'
                    }
                }
            })
    }

    //@override
    out.updateStyle = function () {
        try {
            // apply to main map
            applyStyleToMap(out)

            // apply style to insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            // dorling cartogram
            if (out.dorling_) {
                const sizeData = getSizeStatData(out)
                runDorlingSimulation(out, (d) => {
                    const datum = sizeData.get(d.properties.id)
                    const r = datum ? out.classifierSize_(+datum.value) : 0
                    return out.psShape_ === 'square' ? (r / 2) * Math.SQRT2 : r
                })
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in proportional symbols styling: ' + e.message)
            console.error(e)
        }
    }

    //@override
    out.getLegendConstructor = function () {
        return ProportionalSymbolLegend.legend
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
 * @description give a d3 symbol from a shape name
 */
export const symbolsLibrary = {
    cross: symbolCross,
    square: symbolSquare,
    diamond: symbolDiamond,
    triangle: symbolTriangle,
    star: symbolStar,
    wye: symbolWye,
    circle: symbolCircle,
}

export function getSizeStatData(map) {
    return map.statData('size').getArray() ? map.statData('size') : map.statData()
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */

const tooltipTextFunPs = function (region, map) {
    if (map.tooltip_.omitRegions && map.tooltip_.omitRegions.includes(region.properties.id)) {
        return '' // Skip tooltip for omitted regions
    }

    const regionName = region.properties.na
    const regionId = region.properties.id

    const formatValue = (val, unit, noDataText) => {
        if (val === ':') {
            return noDataText || 'Data not available'
        }
        return spaceAsThousandSeparator(val) + (unit ? ' ' + unit : '')
    }

    // Stat 1
    const v1 = map.statData('size').getArray() ? map.statData('size') : map.statData()
    const sv1 = v1.get(region.properties.id)
    const unit1 = v1.unitText?.() || ''
    const row1 = `<tr><td>${formatValue(sv1?.value, unit1, map.noDataText_)}</td></tr>`

    // Stat 2 (optional)
    let row2 = ''
    const v2 = map.statData('color')?.getArray() ? map.statData('color') : null
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
