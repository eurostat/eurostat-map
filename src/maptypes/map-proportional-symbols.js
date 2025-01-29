import { scaleSqrt, scaleLinear, scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
// import {extent} from 'd3-array'
import { select } from 'd3-selection'
import { interpolateOrRd } from 'd3-scale-chromatic'
import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force'
import * as StatMap from '../core/stat-map'
import * as ProportionalSymbolLegend from '../legend/legend-proportional-symbols'
import { symbol, symbolCircle, symbolDiamond, symbolStar, symbolCross, symbolSquare, symbolTriangle, symbolWye } from 'd3-shape'
import { spaceAsThousandSeparator, getCSSPropertyFromClass, executeForAllInsets, getRegionsSelector } from '../core/utils'

/**
 * Returns a proportional symbol map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true)

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
    out.psFill_ = '#2d50a0' //same fill for all symbols when no visual variable (setData()) for 'color' is specified
    out.psFillOpacity_ = 1
    out.psStroke_ = '#ffffff'
    out.psStrokeWidth_ = 0.2
    out.psClasses_ = 5 // number of classes to use for colouring
    out.psColors_ = null //colours to use for threshold colouring
    out.psColorFun_ = interpolateOrRd
    out.psClassToFillStyle_ = undefined //a function returning the color from the class i

    //the threshold, when the classification method is 'threshold'
    out.psThreshold_ = [0]
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

    //dorling cartogram
    out.dorling_ = false

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
        'psMaxSize_',
        'psMinSize_',
        'psMaxValue_',
        'psMinValue_',
        'psFill_',
        'psFillOpacity_',
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
        'psThreshold_',
        'psColors_',
        'psCustomSVG_',
        'psOffset_',
        'psClassificationMethod_',
        'psClasses_',
        'dorling_',
        'psSpikeWidth_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        [
            'psMaxSize',
            'psMinSize',
            'psFill',
            'psFillOpacity',
            'psStroke',
            'psStrokeWidth',
            'classifierSize',
            'classifierColor',
            'psShape',
            'psCustomShape',
            'psBarWidth',
            'psClassToFillStyle',
            'psColorFun',
            'noDataFillStyle',
            'psThreshold',
            'psColors',
            'psCustomSVG',
            'psOffset',
            'psClassificationMethod',
            'psClasses',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    //override of some special getters/setters
    out.psColorFun = function (v) {
        if (!arguments.length) return out.psColorFun_
        out.psColorFun_ = v
        out.psClassToFillStyle_ = getColorLegend(out.psColorFun_, out.psColors_)
        return out
    }
    out.psThreshold = function (v) {
        if (!arguments.length) return out.psThreshold_
        out.psThreshold_ = v
        out.psClasses(v.length + 1)
        return out
    }

    //@override
    out.updateClassification = function () {
        //define classifiers for sizing and colouring (out.classifierSize_ & out.classifierColor_)
        defineClassifiers()

        // apply classification to all insets that are outside of the main map's SVG
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyClassificationToMap)
        }

        // apply to main map
        applyClassificationToMap(out)

        return out
    }

    /**
     * @description assigns a color to each symbol, based on their statistical value
     * @param {*} map
     */
    function applyClassificationToMap(map) {
        if (map.svg_) {
            if (out.classifierColor_) {
                //assign color class to each symbol, based on their value
                // at this point, the symbol path hasnt been appended. Only the parent g.em-centroid element (in map-template)
                let colorData = map.statData('color')
                map.svg_.selectAll('.em-centroid').attr('ecl', function (rg) {
                    const sv = colorData.get(rg.properties.id)
                    if (!sv) {
                        return 'nd'
                    }
                    const v = sv.value
                    if (v !== 0 && !v) {
                        return 'nd'
                    }
                    let c = +out.classifierColor_(+v)
                    return c
                })
            }
        }
    }

    /**
     * @description defines classifier functions (out.classifierColor and out.classifierSize) for both symbol size and color
     */
    function defineClassifiers() {
        // set default scale
        if (!out.psSizeScale_) {
            if (out.psShape_ == 'spike') {
                out.psSizeScale_ = 'linear'
            } else {
                out.psSizeScale_ = 'sqrt'
            }
        }

        //simply return the array [0,1,2,3,...,nb-1]
        const getA = function (nb) {
            return [...Array(nb).keys()]
        }

        // use size dataset
        let sizeDomain
        let data = out.statData('size').getArray()
        // let domain = extent(data)
        let min = out.psMinValue_ ? out.psMinValue_ : out.statData('size').getMin()
        let max = out.psMaxValue_ ? out.psMaxValue_ : out.statData('size').getMax()

        sizeDomain = data ? [min, max] : [out.statData().getMin(), out.statData().getMax()]

        let scale = out.psSizeScale_ == 'sqrt' ? scaleSqrt : scaleLinear
        out.classifierSize(scale().domain(sizeDomain).range([out.psMinSize_, out.psMaxSize_]))

        // colour
        if (out.statData('color').getArray()) {
            //use suitable classification type for colouring
            if (out.psClassificationMethod_ === 'quantile') {
                //https://github.com/d3/d3-scale#quantile-scales
                const domain = out.statData('color').getArray()
                const range = getA(out.psClasses_)
                out.classifierColor(scaleQuantile().domain(domain).range(range))
            } else if (out.psClassificationMethod_ === 'equinter') {
                //https://github.com/d3/d3-scale#quantize-scales
                const domain = out.statData('color').getArray()
                const range = getA(out.psClasses_)
                out.classifierColor(
                    scaleQuantize()
                        .domain([min(domain), max(domain)])
                        .range(range)
                )
                if (out.makeClassifNice_) out.classifierColor().nice()
            } else if (out.psClassificationMethod_ === 'threshold') {
                //https://github.com/d3/d3-scale#threshold-scales
                out.psClasses(out.psThreshold().length + 1)
                const range = getA(out.psClasses_)
                out.classifierColor(scaleThreshold().domain(out.psThreshold()).range(range))
            }
        }
    }

    /**
     * Applies proportional symbol styling to a map object
     *
     * @param {*} map
     * @returns
     */
    function applyStyleToMap(map) {
        //see https://bl.ocks.org/mbostock/4342045 and https://bost.ocks.org/mike/bubble-map/
        //define style per class
        if (!out.psClassToFillStyle()) out.psClassToFillStyle(getColorLegend(out.psColorFun_, out.psColors_))

        // if size dataset not defined then use default
        let sizeData = map.statData('size').getArray() ? map.statData('size') : map.statData()

        if (map.svg_) {
            //clear previous symbols
            let prevSymbols = map.svg_.selectAll(':not(#em-insets-group) g.em-centroid > *')
            prevSymbols.remove()

            //change draw order according to size, then reclassify (there was an issue with nodes changing ecl attributes)
            if (map._centroidFeatures) {
                updateSymbolsDrawOrder(map)
                applyClassificationToMap(map)
            }

            // append symbols
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

            // set style of symbols
            const selector = getRegionsSelector(map)
            let regions = map.svg().selectAll(selector)

            if (map.geo_ !== 'WORLD') {
                if (map.nutsLevel_ == 'mixed') {
                    addSymbolsToMixedNUTS(map, sizeData, regions)
                }

                // nuts regions fill colour only for those with sizeData
                regions.style('fill', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        // NO INPUT
                        return out.noDataFillStyle_
                    } else if ((sv && sv.value) || (sv && sv.value == 0)) {
                        if (sv.value == ':') {
                            // DATA NOT AVAILABLE
                            return out.noDataFillStyle_
                        }
                        // DATA
                        return getCSSPropertyFromClass('em-nutsrg', 'fill')
                    }
                })

                // apply 'nd' class to no data for legend item hover
                regions.attr('ecl', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        // NO INPUT
                        return 'nd'
                    } else if ((sv && sv.value) || (sv && sv.value == 0)) {
                        if (sv.value == ':') {
                            // DATA NOT AVAILABLE
                            return 'nd'
                        }
                    }
                })
            } else {
                // world countries fill
                regions.style('fill', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0) || sv.value == ':') {
                        return out.worldFillStyle_
                    } else {
                        return getCSSPropertyFromClass('em-nutsrg', 'fill')
                    }
                })
            }

            // set color/stroke/opacity styles
            setSymbolStyles(symb)

            addMouseEvents(map)

            // Update labels for statistical values if required
            if (out.labels_?.values) {
                out.updateValuesLabels(map)
            }
        }
        return map
    }

    const addMouseEvents = function (map) {
        let symbols = map.svg().selectAll('g.em-centroid')
        symbols
            .on('mouseover', function (e, rg) {
                const sel = select(this.childNodes[0])
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            .on('mousemove', function (e, rg) {
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function (e) {
                const sel = select(this.childNodes[0])
                let newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', newFill)
                    if (out._tooltip) out._tooltip.mouseout()
                }
            })
    }

    /**
     * OVERRIDE
     * @description update the statistical values labels on the map
     * @param {Object} map eurostat-map map instance
     * @return {} out
     */
    out.updateValuesLabels = function (map) {
        // apply to main map
        if (!map) {
            map = out
        }
        //clear previous labels
        let prevLabels = map.svg_.selectAll('g.em-stat-label > *')
        prevLabels.remove()
        let prevShadows = map.svg_.selectAll('g.em-stat-label-shadow > *')
        prevShadows.remove()

        let statLabels = map.svg_.selectAll('g.em-stat-label')
        let sizeData = map.statData('size').getArray() ? map.statData('size') : map.statData()

        statLabels
            .filter((d) => {
                const sv = sizeData.get(d.properties.id)
                if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                    return false
                } else {
                    return true
                }
            })
            .append('text')
            .text(function (d) {
                const sv = sizeData.get(d.properties.id)
                if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                    return ''
                } else {
                    if (sv.value !== ':') {
                        return spaceAsThousandSeparator(sv.value)
                    }
                }
            })

        //add shadows to labels
        if (out.labelShadow_) {
            map.svg_
                .selectAll('g.em-stat-label-shadow')
                .filter((d) => {
                    const sv = sizeData.get(d.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        return false
                    } else {
                        return true
                    }
                })
                .append('text')
                .text(function (d) {
                    const sv = sizeData.get(d.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        return ''
                    } else {
                        if (sv.value !== ':') {
                            return spaceAsThousandSeparator(sv.value)
                        }
                    }
                })
        }
        return out
    }

    /**
     * @description sets color/stroke/opacity styles of all symbols
     * @param {d3.selection} symb symbols d3 selection
     */
    function setSymbolStyles(symb) {
        symb.style('fill-opacity', out.psFillOpacity())
            .style('stroke', out.psStroke())
            .style('stroke-width', out.psStrokeWidth())
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
    function updateSymbolsDrawOrder(map) {
        let zoomGroup = map.svg_ ? map.svg_.select('#zoomgroup' + map.svgId_) : null
        const gcp = zoomGroup.select('#g_ps')
        let sizeData = map.statData('size').getArray() ? map.statData('size') : map.statData()

        map._centroidFeatures.sort(function (a, b) {
            // A negative value indicates that a should come before b.
            // A positive value indicates that a should come after b.
            // Zero or NaN indicates that a and b are considered equal.
            let valA = sizeData.get(a.properties.id)
            let valB = sizeData.get(b.properties.id)

            if (valA || valA?.value == 0 || valB || valB?.value == 0) {
                if ((valA || valA?.value == 0) && (valB || valB?.value == 0)) {
                    // Both values exist
                    // Biggest circles at the bottom
                    return valB.value - valA.value
                } else if ((valA || valA?.value == 0) && (!valB || !valB?.value == 0)) {
                    // Only valA exists
                    return -1
                } else if ((valB || valB?.value == 0) && (!valA || !valA?.value == 0)) {
                    // Only valB exists
                    return 1
                }
            } else {
                return 0
            }
        })

        let centroids = gcp
            .selectAll('g.em-centroid')
            .data(map._centroidFeatures)
            .join('g')
            .attr('transform', function (d) {
                return 'translate(' + d.properties.centroid[0].toFixed(3) + ',' + d.properties.centroid[1].toFixed(3) + ')'
            })

        // update colors
        //setSymbolStyles(symbols)
    }

    function appendSpikesToMap(map, sizeData) {
        //The spike function creates a triangular path of the given length (height) with a base width of 7 pixels.
        const spike = (length, width = out.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`
        let symbolContainers = map.svg().selectAll('g.em-centroid')

        // Append circles to each symbol container
        const spikes = symbolContainers
            .append('path')
            .attr('d', (d) => {
                const datum = sizeData.get(d.properties.id)
                const value = datum ? out.classifierSize_(datum.value) : 0
                let path = spike(value)
                return path
            })
            .style('fill', (d) => d.color || 'steelblue') // Adjust color as needed
            //.attr('fill', map.psFill_)
            .attr('fill-opacity', map.psFillOpacity_)
            .attr('stroke', map.psStroke_)
            .attr('stroke-width', map.psStrokeWidth_)

        return spikes
    }

    /**
     * @description Appends <circle> elements for each region in the map SVG
     * @param {*} map map instance
     * @param {*} sizeData statistical data for size e.g. map.statData('size')
     * @return {void}
     */
    function appendCirclesToMap(map, sizeData) {
        let symbolContainers = map.svg().selectAll('g.em-centroid')

        // Append circles to each symbol container
        const circles = symbolContainers
            .append('circle')
            .attr('r', function (d) {
                // calculate radius
                const datum = sizeData.get(d.properties.id)
                const radius = datum ? out.classifierSize_(datum.value) : 0
                return radius
            })
            .style('fill', (d) => d.color || 'steelblue') // Adjust color as needed

        if (out.dorling_) {
            applyDorlingForce(map, sizeData)
        }

        return circles
    }

    function applyDorlingForce(map, sizeData) {
        let symbolContainers = map.svg().selectAll('g.em-centroid')
        // Initialize the force simulation
        const simulation = forceSimulation(map._centroidFeatures)
            .force(
                'x',
                forceX((d) => {
                    console.log(d.properties.centroid)
                    return d.properties.centroid[0]
                })
            )
            .force(
                'y',
                forceY((d) => {
                    return d.properties.centroid[1]
                })
            )
            .force(
                'collide',
                forceCollide((d) => {
                    if (d.properties.radius) {
                        return d.properties.radius
                    } else {
                        const datum = sizeData.get(d.properties.id)
                        const radius = datum ? out.classifierSize_(datum.value) : 0
                        d.properties.radius = radius
                        return radius
                    }
                })
            )
            .on('tick', () => {
                // Update elements with the new positions and radii
                symbolContainers.attr('transform', function (d) {
                    return 'translate(' + d.x + ',' + d.y + ')'
                })
            })
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
                .svg()
                .select('#g_ps')
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
            // to use transitions we need to refactor the drawing functions to promises e.g. appendBarsToMap().then(()=>{})
            //this is because .attr('fill___', function () {select(this).style('fill')}) doesnt work unless you execute it after the transition ends.
            // e.g.
            // .transition()
            // .duration(out.transitionDuration())
            // .style('fill', function (rg) {})
            // .end()
            // .then()
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
            .svg()
            .select('#g_ps')
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
    function addSymbolsToMixedNUTS(map, sizeData, regions) {
        // Toggle symbol visibility - only show regions with sizeData stat values when mixing different NUTS levels
        let symb = map
            .svg()
            .selectAll('g.em-centroid')
            .style('display', function (rg) {
                const sv = sizeData.get(rg.properties.id)
                if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                    // no symbol for no input
                    return 'none'
                } else if (map.geo_ == 'WORLD') {
                    return 'block'
                }
            })

        // toggle display of mixed NUTS levels
        regions.style('display', function (rg) {
            const sv = sizeData.get(rg.properties.id)
            if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
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

        return symb
    }

    //@override
    out.updateStyle = function () {
        // apply to main map
        applyStyleToMap(out)

        // apply style to insets
        // apply classification to all insets
        if (out.insetTemplates_) {
            for (const geo in out.insetTemplates_) {
                if (Array.isArray(out.insetTemplates_[geo])) {
                    for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
                        // insets with same geo that do not share the same parent inset
                        if (Array.isArray(out.insetTemplates_[geo][i])) {
                            // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
                            for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
                                if (out.insetTemplates_[geo][i][c].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo][i][c])
                            }
                        } else {
                            if (out.insetTemplates_[geo][i].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo][i])
                        }
                    }
                } else {
                    // unique inset geo_
                    if (out.insetTemplates_[geo].svgId_ !== out.svgId_) applyStyleToMap(out.insetTemplates_[geo])
                }
            }
        }

        return out
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

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunPs = function (region, map) {
    const buf = []

    // Header with region name and ID
    const regionName = region.properties.na
    const regionId = region.properties.id
    buf.push(`
        <div class="estat-vis-tooltip-bar">
            <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
        </div>
    `)

    //stat 1 value
    const v1 = map.statData('size').getArray() ? map.statData('size') : map.statData()
    const sv1 = v1.get(region.properties.id)
    if (!sv1 || (sv1.value != 0 && !sv1.value)) buf.push(map.noDataText_)
    else {
        //unit 1
        const unit1 = v1.unitText()
        buf.push(`<div class="estat-vis-tooltip-text">${spaceAsThousandSeparator(sv1.value)} ${unit1 ? unit1 : ' '}</div>`)
    }

    //stat 2 value
    if (map.statData('color').getArray()) {
        const sv2 = map.statData('color').get(region.properties.id)
        if (!sv2 || (sv2.value != 0 && !sv2.value)) buf.push(map.noDataText_)
        else {
            //stat 2
            const unit2 = map.statData('color').unitText()
            buf.push(`<div class="estat-vis-tooltip-text">${spaceAsThousandSeparator(sv2.value)} ${unit2 ? unit2 : ' '}</div>`)
        }
    }

    return buf.join('')
}
