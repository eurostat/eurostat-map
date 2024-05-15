import { scaleSqrt, scaleLinear, scaleQuantile, scaleQuantize, scaleThreshold } from 'd3-scale'
// import {extent} from 'd3-array'
import { select } from 'd3-selection'
import { interpolateOrRd } from 'd3-scale-chromatic'
import * as smap from '../core/stat-map'
import * as lgps from '../legend/legend-proportional-symbols'
import { symbol, symbolCircle, symbolDiamond, symbolStar, symbolCross, symbolSquare, symbolTriangle, symbolWye } from 'd3-shape'
import { spaceAsThousandSeparator } from '../lib/eurostat-map-util'

/**
 * Returns a proportional symbol map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = smap.statMap(config, true)

    //shape
    out.psShape_ = 'circle' // accepted values: circle, bar, square, star, diamond, wye, cross
    out.psCustomShape_ // see http://using-d3js.com/05_10_symbols.html#h_66iIQ5sJIT
    out.psCustomSVG_ // see http://bl.ocks.org/jessihamel/9648495
    out.psOffset_ = { x: 0, y: 0 }

    //size
    out.psMaxSize_ = 30 // max symbol size
    out.psMinSize_ = 5 // min symbol size
    out.psBarWidth_ = 10 //for vertical bars
    out.psMaxValue_ = undefined // allow the user to manually define the domain of the sizing scale. E.g. if the user wants to use the same scale across different maps.
    out.psMinValue_ = undefined
    out.psSizeFun_ = scaleSqrt

    //colour
    out.psFill_ = '#2d50a0' //same fill for all symbols when no visual variable (setData()) for 'color' is specified
    out.psFillOpacity_ = 0.7
    out.psStroke_ = '#ffffff'
    out.psStrokeWidth_ = 0.5
    out.psClasses_ = 5 // number of classes to use for colouring
    out.psColors_ = null //colours to use for threshold colouring
    out.psColorFun_ = interpolateOrRd
    out.psClassToFillStyle_ = undefined //a function returning the color from the class i
    out.noDataFillStyle_ = '#8c8c8c' //style for no data regions

    //the threshold, when the classification method is 'threshold'
    out.psThreshold_ = [0]
    //the classification method
    out.psClassifMethod_ = 'quantile' // or: equinter, threshold
    //when computed automatically, ensure the threshold are nice rounded values
    out.makeClassifNice_ = true
    //
    //the classifier: a function which return the symbol size/color from the stat value.
    out.classifierSize_ = undefined
    out.classifierColor_ = undefined
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunPs

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
        'noDataFillStyle_',
        'psThreshold_',
        'psColors_',
        'psCustomSVG_',
        'psOffset_',
        'psClassifMethod_',
        'psClasses_',
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
            'psClassifMethod',
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
        // if (out.insetTemplates_) {
        //     for (const geo in out.insetTemplates_) {
        //         if (Array.isArray(out.insetTemplates_[geo])) {
        //             for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
        //                 // insets with same geo that do not share the same parent inset
        //                 if (Array.isArray(out.insetTemplates_[geo][i])) {
        //                     // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
        //                     for (var c = 0; c < out.insetTemplates_[geo][i].length; c++) {
        //                         if (out.insetTemplates_[geo][i][c].svgId_ !== out.svgId_)
        //                             applyClassificationToMap(out.insetTemplates_[geo][i][c])
        //                     }
        //                 } else {
        //                     if (out.insetTemplates_[geo][i].svgId_ !== out.svgId_)
        //                         applyClassificationToMap(out.insetTemplates_[geo][i])
        //                 }
        //             }
        //         } else {
        //             // unique inset geo_
        //             if (out.insetTemplates_[geo].svgId_ !== out.svgId_) applyClassificationToMap(out.insetTemplates_[geo])
        //         }
        //     }
        // }

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
            if (map.classifierColor_) {
                //assign color class to each symbol, based on their value
                // at this point, the symbol path hasnt been appended. Only the parent g.symbol element (in map-template)
                let colorData = map.statData('color')
                map.svg_.selectAll('.symbol').attr('ecl', function (rg) {
                    const sv = colorData.get(rg.properties.id)
                    if (!sv) {
                        return 'nd'
                    }
                    const v = sv.value
                    if (v !== 0 && !v) {
                        return 'nd'
                    }
                    let c = +map.classifierColor_(+v)
                    return c
                })
            }
        }
    }

    /**
     * @description defines classifier functions (out.classifierColor and out.classifierSize) for both symbol size and color
     */
    function defineClassifiers() {
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

        out.classifierSize(out.psSizeFun_().domain(sizeDomain).range([out.psMinSize_, out.psMaxSize_]))

        // colour
        if (out.statData('color').getArray()) {
            //use suitable classification type for colouring
            if (out.psClassifMethod_ === 'quantile') {
                //https://github.com/d3/d3-scale#quantile-scales
                const domain = out.statData('color').getArray()
                const range = getA(out.psClasses_)
                out.classifierColor(scaleQuantile().domain(domain).range(range))
            } else if (out.psClassifMethod_ === 'equinter') {
                //https://github.com/d3/d3-scale#quantize-scales
                const domain = out.statData('color').getArray()
                const range = getA(out.psClasses_)
                out.classifierColor(
                    scaleQuantize()
                        .domain([min(domain), max(domain)])
                        .range(range)
                )
                if (out.makeClassifNice_) out.classifierColor().nice()
            } else if (out.psClassifMethod_ === 'threshold') {
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
            let prevSymbols = map.svg_.selectAll(':not(#insetsgroup) g.symbol > *')
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
            } else {
                // d3.symbol symbols
                // circle, cross, star, triangle, diamond, square, wye or custom
                symb = appendD3SymbolsToMap(map, sizeData)
            }

            // set style of symbols
            let selector = map.geo_ == 'WORLD' ? 'path.worldrg' : 'path.nutsrg'
            let regions = map.svg().selectAll(selector)

            if (map.geo_ !== 'WORLD') {
                if (map.nutsLvl_ == 'mixed') {
                    addSymbolsToMixedNUTS(map, sizeData, regions)
                }

                // nuts regions fill colour only for those with sizeData
                regions.attr('fill', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (rg.properties.id == 'ES') {
                        console.log(sv)
                    }
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        // NO INPUT
                        return out.noDataFillStyle_
                    } else if ((sv && sv.value) || (sv && sv.value == 0)) {
                        if (sv.value == ':') {
                            // DATA NOT AVAILABLE
                            return out.noDataFillStyle_
                        }
                        // DATA
                        return out.nutsrgFillStyle_
                    }
                })
            } else {
                // world countries fill
                regions.attr('fill', function (rg) {
                    const sv = sizeData.get(rg.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0) || sv.value == ':') {
                        return out.worldFillStyle_
                    } else {
                        return out.nutsrgFillStyle_
                    }
                })
            }

            // set color/stroke/opacity styles
            setSymbolColors(symb)

            // update labels of stat values, appending the stat labels to the region centroids
            if (out.labelsToShow_.includes('values')) {
                out.updateValuesLabels(map)
            }
        }
        return map
    }

    /**
     * OVERRIDE
     * @description update the statistical values labels on the map
     * @param {Object} map eurostat-map map instance
     * @return {} out
     */
    out.updateValuesLabels = function (map) {
        // apply to main map
        //clear previous labels
        let prevLabels = map.svg_.selectAll('g.stat-label > *')
        prevLabels.remove()
        let prevShadows = map.svg_.selectAll('g.stat-label-shadow > *')
        prevShadows.remove()

        let statLabels = map.svg_.selectAll('g.stat-label')
        let sizeData = map.statData('size').getArray() ? map.statData('size') : map.statData()

        statLabels
            .filter((d) => {
                if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
                    const sv = sizeData.get(d.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        return false
                    } else {
                        return true
                    }
                }
                return false
            })
            .append('text')
            .text(function (d) {
                if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
                    const sv = sizeData.get(d.properties.id)
                    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                        return ''
                    } else {
                        if (sv.value !== ':') {
                            return spaceAsThousandSeparator(sv.value)
                        }
                    }
                }
            })

        //add shadows to labels
        if (out.labelShadow_) {
            map.svg_
                .selectAll('g.stat-label-shadow')
                .filter((d) => {
                    if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
                        const sv = sizeData.get(d.properties.id)
                        if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                            return false
                        } else {
                            return true
                        }
                    }
                    return false
                })
                .append('text')
                .text(function (d) {
                    if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
                        const sv = sizeData.get(d.properties.id)
                        if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                            return ''
                        } else {
                            if (sv.value !== ':') {
                                return spaceAsThousandSeparator(sv.value)
                            }
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
    function setSymbolColors(symb) {
        symb.style('fill-opacity', out.psFillOpacity())
            .style('stroke', out.psStroke())
            .style('stroke-width', out.psStrokeWidth())
            .attr('fill', function () {
                if (out.classifierColor_) {
                    //for ps, ecl attribute belongs to the parent g.symbol node created in map-template
                    const ecl = select(this.parentNode).attr('ecl')
                    if (!ecl || ecl === 'nd') return out.noDataFillStyle_ || 'gray'
                    let color = out.psClassToFillStyle_(ecl, out.psClasses_)
                    return color
                } else {
                    return out.psFill_
                }
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
        //console.log(map._centroidFeatures)

        let sortedBySize = [...map._centroidFeatures].sort(function (a, b) {
            //A negative value indicates that a should come before b.
            //A positive value indicates that a should come after b.
            //Zero or NaN indicates that a and b are considered equal.
            let valA = sizeData.get(a.properties.id)
            let valB = sizeData.get(b.properties.id)
            if (valA || valA?.value == 0 || valB || valB?.value == 0) {
                if ((valA || valA?.value == 0) && (valB || valB?.value == 0)) {
                    //both values exist
                    //biggest circles at the bottom
                    return valB.value - valA.value
                } else if ((valA || valA?.value == 0) && (!valB || !valB?.value == 0)) {
                    //only valA exists
                    return -1
                } else if ((valB || valB?.value == 0) && (!valA || !valA?.value == 0)) {
                    //only valB exists
                    return 1
                }
            } else {
                return 0
            }
        })

        let symbols = gcp
            .selectAll('g.symbol')
            .data(
                // FILTERING BREAKS IMAGE -
                // it removes regions not present in current data, but if you update the data and add data for those regions then they are not drawn!!)
                // filter out regions with no data
                // .filter((rg) => {
                //     const sv = sizeData.get(rg.properties.id)
                //     // has size data
                //     if (sv && sv.value !== 0) {
                //         return rg
                //     }
                // })
                // sort by size
                sortedBySize
            )
            // .enter()
            .join('g')
            .attr('transform', function (d) {
                return 'translate(' + map._projection(d.geometry.coordinates) + ')'
            })

        // update colors
        setSymbolColors(symbols)
    }

    /**
     * @description Appends <circle> elements for each region in the map SVG
     * @param {*} map map instance
     * @param {*} sizeData statistical data for size e.g. map.statData('size')
     * @return {void}
     */
    function appendCirclesToMap(map, sizeData) {
        let symbolContainers = map.svg().selectAll('g.symbol')
        //console.log(symbolContainers._groups[0])

        return (
            symbolContainers
                .append('circle')
                // .filter((rg) => {
                //     const sv = sizeData.get(rg.properties.id)
                //     if (sv && sv.value !== ':') return rg
                // })
                .attr('r', (rg) => {
                    if (sizeData.get(rg.properties.id)) {
                        let datum = sizeData.get(rg.properties.id)
                        if (datum.value == 0) return 0
                        let radius = out.classifierSize_(datum.value)
                        //if (!radius) console.log(val)
                        return radius?.toFixed(3) || 0
                    } else {
                        return 0
                    }
                })
        )
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
            .selectAll('g.symbol')
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
                .selectAll('g.symbol')
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
                .transition()
                .duration(out.transitionDuration())
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
            .selectAll('g.symbol')
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
            .selectAll('g.symbol')
            .style('display', function (rg) {
                const sv = sizeData.get(rg.properties.id)
                if (
                    !sv ||
                    (!sv.value && sv !== 0 && sv.value !== 0) ||
                    !out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])
                ) {
                    // no symbol for no input
                    return 'none'
                } else if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1]) || map.geo_ == 'WORLD') {
                    return 'block'
                }
            })

        // toggle display of mixed NUTS levels
        regions.style('display', function (rg) {
            const sv = sizeData.get(rg.properties.id)
            if (
                !sv ||
                (!sv.value && sv !== 0 && sv.value !== 0) ||
                !out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])
            ) {
                // no symbol for no data
                return 'none'
            } else if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1]) || map.geo_ == 'WORLD') {
                return 'block'
            }
        })

        // nuts border stroke
        regions
            .style('stroke', function (rg) {
                const lvl = select(this).attr('lvl')
                const sv = sizeData.get(rg.properties.id)
                if (!sv || !sv.value || !out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                    return
                } else if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                    if (lvl !== '0') {
                        return out.nutsbnStroke_[parseInt(lvl)] || '#777'
                    }
                }
            })

            // nuts border stroke width
            .style('stroke-width', function (rg) {
                const lvl = select(this).attr('lvl')
                const sv = sizeData.get(rg.properties.id)
                if (!sv || !sv.value || !out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                    return
                } else if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1]) || out.geo_ == 'WORLD') {
                    if (lvl !== '0') {
                        return out.nutsbnStrokeWidth_[parseInt(lvl)] || '#777'
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
                                if (out.insetTemplates_[geo][i][c].svgId_ !== out.svgId_)
                                    applyStyleToMap(out.insetTemplates_[geo][i][c])
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
        return lgps.legend
    }

    return out
}

//build a color legend object
export const getColorLegend = function (colorFun, colorArray) {
    colorFun = colorFun || interpolateOrRd
    if (colorArray) {
        return function (ecl, clnb) {
            return colorArray[ecl]
        }
    }
    return function (ecl, clnb) {
        return colorFun(ecl / (clnb - 1))
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
const tooltipTextFunPs = function (rg, map) {
    const buf = []
    if (rg.properties.id) {
        //name and code
        buf.push(
            '<div class="estat-vis-tooltip-bar" style="background: #515560;color: #ffffff;padding: 6px;font-size:15px;">' +
                rg.properties.na +
                ' (' +
                rg.properties.id +
                ') </div>'
        )
    } else {
        //region name
        buf.push(
            '<div class="estat-vis-tooltip-bar" style="background: #515560;color: #ffffff;padding: 6px;font-size:15px;">' +
                rg.properties.na +
                '</div>'
        )
    }

    //stat 1 value
    const v1 = map.statData('size').getArray() ? map.statData('size') : map.statData()
    const sv1 = v1.get(rg.properties.id)
    if (!sv1 || (sv1.value != 0 && !sv1.value)) buf.push(map.noDataText_)
    else {
        //unit 1
        const unit1 = v1.unitText()
        buf.push(
            `<div class="estat-vis-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;">${spaceAsThousandSeparator(
                sv1.value
            )} ${unit1 ? unit1 : ' '}</div>`
        )
    }

    //stat 2 value
    if (map.statData('color').getArray()) {
        const sv2 = map.statData('color').get(rg.properties.id)
        if (!sv2 || (sv2.value != 0 && !sv2.value)) buf.push(map.noDataText_)
        else {
            //stat 2
            const unit2 = map.statData('color').unitText()
            buf.push(
                `<div class="estat-vis-tooltip-text" style="background: #ffffff;color: #171a22;padding: 4px;font-size:15px;padding-top:0px">${spaceAsThousandSeparator(
                    sv2.value
                )} ${unit2 ? unit2 : ' '}</div>`
            )
        }
    }

    return buf.join('')
}
