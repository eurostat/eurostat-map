import { format } from 'd3-format'
import { select } from 'd3-selection'
import * as lg from '../core/legend'
import { symbolsLibrary } from '../maptypes/map-proportional-symbols'
import { symbol } from 'd3-shape'
import { getFontSizeFromClass, spaceAsThousandSeparator } from '../core/utils'
import { formatDefaultLocale } from 'd3-format'
import { max } from 'd3-array'

//set legend labels locale
formatDefaultLocale({
    decimal: '.',
    thousands: ' ',
    grouping: [3],
    currency: ['', '€'],
})

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = lg.legend(map)

    out.ascending = false //the order of the legend elements. Set to false to invert.
    out.legendSpacing = 35 //spacing between color & size legends (if applicable)
    out.labelFontSize = 12 //the font size of the legend labels

    out.noDataShapeWidth = 25
    out.noDataShapeHeight = 20

    //size legend config (legend illustrating the values of different symbol sizes)
    out.sizeLegend = {
        title: null,
        titleFontSize: 12,
        titlePadding: 5, //padding between title and legend body
        values: undefined, //manually define raw data values
        cellNb: 3, //number of elements in the legend
        shapePadding: 5, //the y distance between consecutive legend shape elements
        shapeOffset: { x: 0, y: 0 },
        shapeFill: 'white',
        shapeStroke: null,
        labelOffset: { x: 5, y: 0 }, //the distance between the legend box elements to the corresponding text label
        labelDecNb: 0, //the number of decimal for the legend labels
        labelFormatter: undefined,
        _totalBarsHeight: 0,
        _totalD3SymbolsHeight: 0,
        noData: false, // show no data legend item
        noDataText: 'No data', //no data text label
    }

    // color legend config (legend illustrating the data-driven colour classes)
    out.colorLegend = {
        title: null,
        titleFontSize: 12,
        titlePadding: 10, //padding between title and legend body
        marginTop: 30, // margin top (distance between color and size legend)
        shapeWidth: 25, //the width of the legend box elements
        shapeHeight: 20, //the height of the legend box elements
        shapePadding: 1, //the distance between consecutive legend shape elements in the color legend
        labelOffset: { x: 5, y: 0 }, //distance (x) between label text and its corresponding shape element
        labelDecNb: 0, //the number of decimal for the legend labels
        labelFormatter: undefined, // user-defined d3 format function
        noData: true, //show no data
        noDataText: 'No data', //no data text label
        sepLineLength: 24, // //the separation line length
        sepLineStroke: 'black', //the separation line color
        sepLineStrokeWidth: 1, //the separation line width
        tickLength: 5, // threshold ticks length in px
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (key == 'colorLegend' || key == 'sizeLegend') {
                for (let p in out[key]) {
                    //override each property in size and color legend configs
                    if (config[key][p]) {
                        out[key][p] = config[key][p]
                    }
                }
                if (config.colorLegend == false) out.colorLegend = false
            } else {
                out[key] = config[key]
            }
        }

    //@override
    out.update = function () {
        const m = out.map
        const lgg = out.lgg

        // update legend parameters if necessary
        if (m.legend_)
            for (let key in m.legend_) {
                if (key == 'colorLegend' || key == 'sizeLegend') {
                    for (let p in out[key]) {
                        //override each property in size and color legend m.legend_
                        if (typeof m.legend_[key][p] !== 'undefined') {
                            out[key][p] = m.legend_[key][p]
                        }
                    }
                } else {
                    out[key] = m.legend_[key]
                }
            }

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        // reset height counters
        out.sizeLegend._totalBarsHeight = 0
        out.sizeLegend._totalD3SymbolsHeight = 0

        // legend for size
        out._sizeLegendNode = lgg.append('g').attr('class', 'size-legend-container')
        if (m.classifierSize_) {
            buildSizeLegend(m, out.sizeLegend)
        }
        // legend for ps color values
        out._colorLegendNode = lgg.append('g').attr('class', 'color-legend-container')

        // position it below size legend
        out._colorLegendNode.attr('transform', `translate(0,${out._sizeLegendNode.node().getBBox().height})`)
        if (m.classifierColor_ && out.colorLegend) {
            buildColorLegend(m, out.colorLegend)
        }

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend which illustrates the statistical values of different symbol sizes
     *
     * @param {*} map map instance
     * @param {*} container parent legend object from core/legend.js
     */
    function buildSizeLegend(m) {
        if (!m.psCustomSVG_ && m.psShape_ == 'circle') {
            buildCircleLegend(m, out.sizeLegend)
            if (out.sizeLegend.noData) {
                let y = out._sizeLegendNode.node().getBBox().height + 25
                let x = out.boxPadding
                let container = out._sizeLegendNode
                    .append('g')
                    .attr('transform', `translate(${x},${y})`)
                    .attr('class', 'em-legend-rect')

                buildNoDataLegend(x, y, container, out.sizeLegend.noDataText)
            }
            return
        }

        //define format for labels
        let labelFormatter = out.sizeLegend.labelFormatter || spaceAsThousandSeparator
        //draw title
        if (out.sizeLegend.title) {
            out._sizeLegendNode
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding)
                .text(out.sizeLegend.title)
        }

        let domain = m.classifierSize_.domain()
        let maxVal = domain[1] //maximum value of dataset (used for first or last symbol by default)

        // if user defines values for legend manually
        if (out.sizeLegend.values) {
            out.sizeLegend.cellNb = out.sizeLegend.values.length
        }

        //draw legend elements for classes: symbol + label

        // for custom paths
        m.customSymbols = { nodeHeights: 0 } // save some custom settings for buildCustomSVGItem

        for (let i = 1; i < out.sizeLegend.cellNb + 1; i++) {
            //define class number
            const c = out.ascending ? out.sizeLegend.cellNb - i + 1 : i
            //define raw value
            let val = out.sizeLegend.values ? out.sizeLegend.values[c - 1] : maxVal / c
            //calculate shape size
            let symbolSize = m.classifierSize_(val)

            if (m.psShape_ == 'bar') {
                buildBarsItem(map, val, symbolSize, i, labelFormatter)
            } else if (m.psShape_ == 'custom' || m.psCustomSVG_) {
                buildCustomSVGItem(map, val, symbolSize, i, labelFormatter)
            } else {
                buildD3SymbolItem(map, val, symbolSize, i, labelFormatter)
            }
        }

        if (out.sizeLegend.noData) {
            let y = out._sizeLegendNode.node().getBBox().height
            if (out.colorLegend) {
                y += out.colorLegend.shapeHeight + 5
            }
            let x = out.boxPadding
            let container = out._sizeLegendNode
                .append('g')
                .attr('transform', `translate(${x},${y})`)
                .attr('class', 'em-legend-rect')

            buildNoDataLegend(x, y, container, out.sizeLegend.noDataText)
        }
    }

    //'no data' legend box
    function buildNoDataLegend(x, y, container, noDataText) {
        let m = out.map

        //append symbol & style
        container
            .append('g')
            .style('fill', m.noDataFillStyle())
            .style('fill-opacity', m.psFillOpacity())
            .style('stroke', '#000')
            .attr('stroke-width', 0.4)
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('width', out.colorLegend ? out.colorLegend.shapeWidth : out.noDataShapeWidth)
            .attr('height', out.colorLegend ? out.colorLegend.shapeHeight : out.noDataShapeHeight)
            .on('mouseover', function () {
                const parents = m.svg_.select('#g_ps').selectAll("[ecl='nd']")
                let cellFill = select(this.parentNode).style('fill')
                // save legend cell fill color to revert during mouseout:
                select(this).attr('fill___', cellFill)
                //for ps, the symbols are the children of each g_ps element but could also be nutsrg
                parents.each(function (d, i) {
                    let ps = select(this.childNodes[0])
                    ps.style('fill', m.noDataFillStyle())
                })
                select(this).style('fill', m.hoverColor())

                let ecl = 'nd'

                // main map
                highlightRegions(m.svg_, ecl)

                // all external insets
                if (out.map.insetTemplates_) {
                    let insets = out.map.insetTemplates_
                    for (const geo in insets) {
                        if (Array.isArray(insets[geo])) {
                            for (var i = 0; i < insets[geo].length; i++) {
                                // insets with same geo that do not share the same parent inset
                                if (Array.isArray(insets[geo][i])) {
                                    // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
                                    for (var c = 0; c < insets[geo][i].length; c++) {
                                        if (insets[geo][i][c].svgId_ !== out.svgId_)
                                            highlightRegions(insets[geo][i][c].svg(), ecl)
                                    }
                                } else {
                                    if (insets[geo][i].svgId_ !== out.svgId_) highlightRegions(insets[geo][i].svg(), ecl)
                                }
                            }
                        } else {
                            // unique inset geo_
                            if (insets[geo].svgId_ !== out.svgId_) highlightRegions(insets[geo].svg(), ecl)
                        }
                    }
                }
            })
            .on('mouseout', function () {
                //for ps, the symbols are the children of each g_ps element
                const parents = m.svg_.select('#g_ps').selectAll("[ecl='nd']")
                let cellFill = select(this).attr('fill___')
                parents.each(function (d, i) {
                    let ps = select(this.childNodes[0])
                    ps.style('fill', cellFill)
                })
                select(this).style('fill', m.noDataFillStyle())

                let ecl = 'nd'
                // regions
                unhighlightRegions(m.svg_, ecl)
                // apply hover to all external insets
                if (out.map.insetTemplates_) {
                    let insets = out.map.insetTemplates_
                    for (const geo in insets) {
                        if (Array.isArray(insets[geo])) {
                            for (var i = 0; i < insets[geo].length; i++) {
                                // insets with same geo that do not share the same parent inset
                                if (Array.isArray(insets[geo][i])) {
                                    // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
                                    for (var c = 0; c < insets[geo][i].length; c++) {
                                        if (insets[geo][i][c].svgId_ !== out.svgId_)
                                            unhighlightRegions(insets[geo][i][c].svg(), ecl)
                                    }
                                } else {
                                    if (insets[geo][i].svgId_ !== out.svgId_) unhighlightRegions(insets[geo][i].svg(), ecl)
                                }
                            }
                        } else {
                            // unique inset geo_
                            if (insets[geo].svgId_ !== out.svgId_) unhighlightRegions(insets[geo].svg(), ecl)
                        }
                    }
                }
            })

        //'no data' label
        container
            .append('text')
            .attr('x', out.colorLegend ? out.colorLegend.shapeWidth + out.colorLegend.labelOffset.x : out.noDataShapeWidth + 5)
            .attr('y', out.colorLegend ? out.colorLegend.shapeHeight / 2 : out.noDataShapeHeight / 2)
            .attr('dominant-baseline', 'middle')
            .attr('class', 'em-legend-label')
            .text(noDataText)
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)
    }

    function highlightRegions(map, ecl) {
        // TODO: change this to estat logic of making all other classes transparent?
        let selector = out.map.geo_ == 'WORLD' ? '#g_worldrg' : '#g_nutsrg'
        const sel = map.selectAll(selector).selectAll("[ecl='" + ecl + "']")
        sel.style('fill', out.map.hoverColor())
        sel.attr('fill___', function () {
            select(this).style('fill')
        })
    }

    function unhighlightRegions(map, ecl) {
        let selector = out.map.geo_ == 'WORLD' ? '#g_worldrg' : '#g_nutsrg'
        const sel = map.selectAll(selector).selectAll("[ecl='" + ecl + "']")
        sel.style('fill', function () {
            select(this).attr('fill___')
        })
    }

    /**
     * @description builds a size legend item for proportional D3 shapes (e.g. square, triangle, star)
     * @param {*} m map instance
     * @param {number} symbolSize the size of the symbol item
     */
    function buildD3SymbolItem(m, value, symbolSize, index, labelFormatter) {
        let symbolHeight = out.map.psShape_ == 'triangle' || out.map.psShape_ == 'diamond' ? symbolSize : symbolSize / 2
        if (out.sizeLegend._totalD3SymbolsHeight == 0) out.sizeLegend._totalD3SymbolsHeight += symbolHeight + out.boxPadding //add first item height to y
        let maxSize = m.classifierSize_(m.classifierSize_.domain()[1])
        // x and y position of item in legend
        let x = maxSize
        let y =
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) +
            out.sizeLegend._totalD3SymbolsHeight +
            (out.sizeLegend.shapePadding * index - 1)

        out.sizeLegend._totalD3SymbolsHeight += symbolSize

        //container for symbol and label
        let itemContainer = out._sizeLegendNode
            .append('g')
            .attr('transform', `translate(${x},${y})`)
            .attr('class', 'em-size-legend-item')

        // draw D3 symbol
        let shape = getShape()
        let d = shape.size(symbolSize * symbolSize)()
        itemContainer
            .append('g')
            // .attr('transform', `translate(${x},${y})`)
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return m.classifierColor_ ? out.sizeLegend.shapeFill : m.psFill_
            })
            .style('fill-opacity', m.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : m.psStroke())
            .style('stroke-width', m.psStrokeWidth())
            .append('path')
            .attr('d', d)
            .attr('transform', () => {
                return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })

        //label position
        let labelX = maxSize / 2 + out.sizeLegend.labelOffset.x

        //append label
        itemContainer
            .append('text')
            .attr('x', labelX)
            .attr('y', 0)
            .attr('dominant-baseline', 'middle')
            .attr('text-anchor', 'start')
            .attr('class', 'eurostatmap-legend-label')
            .text(labelFormatter(value))
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)
    }

    /**
     * @description
     * @param {*} m
     * @param {*} value
     * @param {*} symbolSize
     * @param {*} index
     * @param {*} labelFormatter
     */
    function buildCustomSVGItem(m, value, symbolSize, index, labelFormatter) {
        let x = out.boxPadding //set X offset
        let y

        //first item
        if (!m.customSymbols.prevSymb) {
            y = out.boxPadding + (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) + 20
            m.customSymbols.initialTranslateY = y
            m.customSymbols.prevScale = symbolSize
        }

        //following items
        if (m.customSymbols.prevSymb) {
            let prevNode = m.customSymbols.prevSymb.node()
            let bbox = prevNode.getBBox()
            m.customSymbols.nodeHeights = m.customSymbols.nodeHeights + bbox.height * m.customSymbols.prevScale
            y = m.customSymbols.initialTranslateY + m.customSymbols.nodeHeights + out.sizeLegend.shapePadding * (index - 1)
            m.customSymbols.prevScale = symbolSize
        }

        //container for symbol and label
        let itemContainer = out._sizeLegendNode
            .append('g')
            .attr('transform', `translate(${x},${y})`)
            .attr('class', 'em-size-legend-item')

        // draw standard symbol
        m.customSymbols.prevSymb = itemContainer
            .append('g')
            .attr('class', 'em-size-legend-symbol')
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return m.classifierColor_ ? out.sizeLegend.shapeFill : m.psFill_
            })
            .style('fill-opacity', m.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : m.psStroke())
            .style('stroke-width', m.psStrokeWidth())
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .append('g')
            .html(out.map.psCustomSVG_)
            .attr('transform', () => {
                if (out.map.psCustomSVG_)
                    return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y}) scale(${symbolSize})`
                else return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })

        //label position
        let labelX = x + m.classifierSize_(m.classifierSize_.domain()[0]) + out.sizeLegend.labelOffset.x
        let labelY = out.sizeLegend.shapeOffset.y / 2 + 1 //y + out.sizeLegend.labelOffset.y

        //append label
        itemContainer
            .append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('dominant-baseline', 'middle')
            .attr('text-anchor', 'start')
            .attr('class', 'eurostatmap-legend-label')
            .text(labelFormatter(value))
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)
    }

    /**
     * @description
     * @param {*} m
     * @param {*} symbolSize
     */
    function buildBarsItem(m, value, symbolSize, index, labelFormatter) {
        // for vertical bars we dont use a dynamic X offset because all bars have the same width
        let x = out.boxPadding
        //we also dont need the y offset
        let y =
            out.boxPadding +
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) +
            out.sizeLegend._totalBarsHeight +
            10

        out.sizeLegend._totalBarsHeight += symbolSize + 10

        //set shape size and define 'd' attribute
        let shape = getShape()
        let d = shape.size(symbolSize * symbolSize)()

        //container for symbol and label
        let itemContainer = out._sizeLegendNode
            .append('g')
            .attr('transform', `translate(${x},${y})`)
            .attr('class', 'em-size-legend-item')

        // draw bar symbol
        itemContainer
            .append('g')
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return m.classifierColor_ ? out.sizeLegend.shapeFill : m.psFill_
            })
            .style('fill-opacity', m.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : m.psStroke())
            .style('stroke-width', m.psStrokeWidth())
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .append('path')
            .attr('d', d)
            .attr('transform', () => {
                if (out.map.psCustomSVG_)
                    return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y}) scale(${symbolSize})`
                else return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })
        //label position
        let labelX = x + out.map.psBarWidth_ + out.sizeLegend.labelOffset.x
        let labelY = symbolSize / 2 + out.sizeLegend.labelOffset.y

        //append label
        itemContainer
            .append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('dominant-baseline', 'middle')
            .attr('text-anchor', 'start')
            .attr('class', 'eurostatmap-legend-label')
            .text(labelFormatter(value))
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)
    }

    /**
     * @description builds a nested circle legend for proportional circles
     * @param {*} m map
     */
    function buildCircleLegend(m) {
        //assign default circle radiuses if none specified by user
        let domain = m.classifierSize_.domain()
        if (!out.sizeLegend.values) {
            // default legend values
            out._sizeLegendValues = [Math.floor(domain[1]), Math.floor(domain[1] / 2), Math.floor(domain[0])]
        } else {
            // user defined legend values
            out._sizeLegendValues = out.sizeLegend.values
        }

        //draw title
        if (!out.sizeLegend.title && out.title) out.sizeLegend.title = out.title //if unspecified, set size legend title as root legend title
        if (out.sizeLegend.title) {
            out._sizeLegendNode
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + out.titleFontSize)
                .text(out.sizeLegend.title)
        }

        let maxRadius = m.classifierSize_(max(out._sizeLegendValues)) //maximum circle radius to be shown in legend
        let x = out.boxPadding + maxRadius
        let y = out.boxPadding + maxRadius * 2 + (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) + 20

        let itemContainer = out._sizeLegendNode
            .append('g')
            .attr('transform', `translate(${x},${y})`)
            .attr('class', 'circle-legend')
            .attr('text-anchor', 'right')
            .style('fill', 'black')
            .selectAll('g')
            .data(out._sizeLegendValues)
            .join('g')
            .attr('class', 'eurostatmap-legend-item')

        //circles
        itemContainer
            .append('circle')
            .attr('class', 'eurostatmap-legend-circle')
            .style('fill', 'none')
            .attr('stroke', 'black')
            .attr('cy', (d) => -m.classifierSize_(d))
            .attr('r', m.classifierSize_)

        //labels
        itemContainer
            .append('text')
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)
            .attr('class', 'eurostatmap-legend-label')
            .attr('y', (d, i) => {
                let y = -1 - 2 * m.classifierSize_(d) - out.labelFontSize
                return y
            })
            .attr('x', maxRadius + 5)
            .attr('dy', '1.2em')
            .attr('xml:space', 'preserve')
            .text((d) => {
                return d.toLocaleString('en').replace(/,/gi, ' ')
            })
        //line pointing to top of corresponding circle:
        itemContainer
            .append('line')
            .style('stroke-dasharray', 2)
            .style('stroke', 'grey')
            .attr('x1', 2)
            .attr('y1', (d, i) => {
                let y = -1 - 2 * m.classifierSize_(d) //add padding
                return y
            })
            .attr('xml:space', 'preserve')
            .attr('x2', maxRadius + 5)
            .attr('y2', (d, i) => {
                let y = -1 - 2 * m.classifierSize_(d) //add padding
                return y
            })

        return out
    }

    /**
     * Builds a legend illustrating the statistical values of different symbol colours
     *
     * @param {*} m map
     */
    function buildColorLegend(m) {
        //define format for labels
        let f = out.colorLegend.labelFormatter || spaceAsThousandSeparator
        const svgMap = m.svg()

        //title
        if (out.colorLegend.title) {
            out._colorLegendNode
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.titleFontSize + out.colorLegend.marginTop)
                .text(out.colorLegend.title)
        }

        // x position of color legend cells
        let x = out.boxPadding

        //draw legend elements for classes: rectangle + label
        let clnb = m.psClasses_

        for (let i = 0; i < clnb; i++) {
            //the vertical position of the legend element
            let y = out.titleFontSize + out.colorLegend.titlePadding + out.colorLegend.marginTop + i * out.colorLegend.shapeHeight // account for title + margin

            //the class number, depending on order
            const ecl = out.ascending ? i : clnb - i - 1

            let itemContainer = out._colorLegendNode
                .append('g')
                .attr('transform', `translate(${x},${y})`)
                .attr('class', 'em-legend-rect')

            //append symbol & style
            itemContainer
                .append('g')
                .style('fill', m.psClassToFillStyle()(ecl, clnb))
                .style('fill-opacity', m.psFillOpacity())
                .style('stroke', m.psStroke())
                .style('stroke-width', 1)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5)
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('width', out.colorLegend.shapeWidth)
                .attr('height', out.colorLegend.shapeHeight)
                .on('mouseover', function () {
                    //for ps, the symbols are the children of each g_ps element
                    const parents = svgMap.select('#g_ps').selectAll("[ecl='" + ecl + "']")
                    let cellFill = select(this.parentNode).style('fill')
                    // save legend cell fill color to revert during mouseout:
                    select(this).attr('fill___', cellFill)
                    parents.each(function (d, i) {
                        let ps = select(this.childNodes[0])
                        ps.style('fill', m.hoverColor())
                    })
                    select(this).style('fill', m.hoverColor())
                })
                .on('mouseout', function () {
                    //for ps, the symbols are the children of each g_ps element
                    const parents = svgMap.select('#g_ps').selectAll("[ecl='" + ecl + "']")
                    let cellFill = select(this).attr('fill___')
                    parents.each(function (d, i) {
                        let ps = select(this.childNodes[0])
                        ps.style('fill', cellFill)
                    })
                    select(this).style('fill', m.psClassToFillStyle()(ecl, clnb))
                })

            //separation line
            if (i > 0) {
                itemContainer
                    .append('line')
                    .attr('class', 'em-legend-separator')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', 0 + out.colorLegend.sepLineLength)
                    .attr('y2', 0)
            }

            // Append tick line
            if (i > 0) {
                itemContainer
                    .append('line')
                    .attr('class', 'em-legend-tick')
                    .attr('x1', out.colorLegend.shapeWidth)
                    .attr('y1', 0)
                    .attr('x2', out.colorLegend.sepLineLength + out.colorLegend.tickLength)
                    .attr('y2', 0)
            }

            //label
            if (i < clnb - 1) {
                itemContainer
                    .append('text')
                    .attr('class', 'em-legend-label')
                    .attr('x', out.colorLegend.sepLineLength + out.colorLegend.tickLength + out.colorLegend.labelOffset.x)
                    .attr('y', out.colorLegend.shapeHeight)
                    .attr('dominant-baseline', 'middle')
                    .text((d) => {
                        let text = f(m.classifierColor_.invertExtent(out.ascending ? ecl + 1 : ecl - 1)[out.ascending ? 0 : 1])
                        return text
                    })
                    .style('font-size', out.labelFontSize + 'px')
                    .style('font-family', m.fontFamily_)
                    .style('fill', out.fontFill)
            }
        }

        //'no data' legend box
        if (out.colorLegend.noData) {
            let y = out.titleFontSize + out.colorLegend.marginTop + clnb * out.colorLegend.shapeHeight + 20 // add 20 to separate it from the rest
            let container = out._colorLegendNode
                .append('g')
                .attr('transform', `translate(${x},${y})`)
                .attr('class', 'em-legend-rect')

            buildNoDataLegend(x, y, container, out.colorLegend.noDataText)
        }
    }

    /**
     * @description returns the d3.symbol object chosen by the user
     * @return {d3.shape || SVG}
     */
    function getShape() {
        let shape
        if (out.map.psCustomSVG_) {
            shape = out.map.psCustomSVG_
        } else if (out.map.psCustomShape_) {
            shape = out.map.psCustomShape_
        } else if (out.map.psShape_ == 'bar') {
            //for rectangles, we use a custom d3 symbol
            let drawRectangle = (context, size) => {
                let height = Math.sqrt(size)
                context.moveTo(0, 0)
                context.lineTo(0, height)
                context.lineTo(out.map.psBarWidth_, height)
                context.lineTo(out.map.psBarWidth_, 0)
                context.lineTo(0, 0)
                context.closePath()
            }
            shape = symbol().type({ draw: drawRectangle })
        } else {
            let symbolType = symbolsLibrary[out.map.psShape_] || symbolsLibrary['circle']
            shape = symbol().type(symbolType)
        }
        return shape
    }

    return out
}
