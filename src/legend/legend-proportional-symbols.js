import { format } from 'd3-format'
import { select } from 'd3-selection'
import * as Legend from './legend'
import { symbolsLibrary } from '../maptypes/map-proportional-symbols'
import { symbol } from 'd3-shape'
import { executeForAllInsets, getFontSizeFromClass, spaceAsThousandSeparator } from '../core/utils'
import { formatDefaultLocale } from 'd3-format'
import { max } from 'd3-array'
import { appendPatternFillLegend } from './legend-pattern-fill'

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
    const out = Legend.legend(map)

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
        labelOffset: { x: 10, y: 0 }, //the distance between the legend box elements to the corresponding text label
        decimals: 0, //the number of decimal for the legend labels
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
        decimals: 0, //the number of decimal for the legend labels
        labelFormatter: undefined, // user-defined d3 format function
        labelType: 'thresholds', // type of labels to show: thresholds or ranges
        labels: null, // user-defined labels for each class
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
                    if (config[key][p] !== undefined) {
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
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node()) {
            const lgg = out.lgg

            //remove previous content
            lgg.selectAll('*').remove()

            //draw legend background box
            out.makeBackgroundBox()
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            // reset height counters
            out.sizeLegend._totalBarsHeight = 0
            out.sizeLegend._totalD3SymbolsHeight = 0

            // initial x and y positions for the internal legend elements
            const baseY = out.getBaseY()
            const baseX = out.getBaseX()

            // legend for size
            if (map.classifierSize_) {
                buildSizeLegend(baseX, baseY)
            }
            if (map.classifierColor_ && out.colorLegend) {
                buildColorLegend(baseX, baseY)
            }

            // Append pattern fill legend items BELOW the main legend
            // Get the total height of the choropleth legend box
            const legendHeight = out.lgg.node().getBBox().height
            appendPatternFillLegend(map, out.lgg, {
                shapeWidth: out.shapeWidth,
                shapeHeight: out.shapeHeight,
                labelOffset: out.labelOffset,
                boxPadding: out.boxPadding,
                offsetY: legendHeight + out.boxPadding + 5, // << this shifts pattern legend down
            })

            //set legend box dimensions
            out.setBoxDimension()
        }
    }

    /**
     * Builds a legend which illustrates the statistical values of different symbol sizes
     *
     * @param {*} map map instance
     * @param {*} container parent legend object from core/legend.js
     */
    function buildSizeLegend(baseX, baseY) {
        out._sizeLegendContainer = out.lgg
            .append('g')
            .attr('class', 'size-legend-container')
            .attr('id', 'size-legend-container')
            .attr('transform', `translate(${baseX},${baseY})`)

        if (!map.psCustomSVG_ && map.psShape_ == 'circle') {
            buildCircleLegend(baseX, baseY)
            if (out.sizeLegend.noData) {
                let y = baseY + out._sizeLegendContainer.node().getBBox().height + 25
                appendNoDataLegend(baseX, y, out.sizeLegend.noDataText)
            }
            return
        } else if (map.psShape_ == 'spike') {
            buildSpikeLegend(out.sizeLegend)
            return
        }

        //define format for labels
        let labelFormatter = out.sizeLegend.labelFormatter || spaceAsThousandSeparator
        //draw title
        if (out.sizeLegend.title) {
            out._sizeLegendContainer.append('text').attr('class', 'em-legend-title').attr('x', baseX).attr('y', baseY).text(out.sizeLegend.title)
        }

        let domain = map.classifierSize_.domain()
        let maxVal = domain[1] //maximum value of dataset (used for first or last symbol by default)

        // if user defines values for legend manually
        if (out.sizeLegend.values) {
            out.sizeLegend.cellNb = out.sizeLegend.values.length
        }

        //draw legend elements for classes: symbol + label

        // for custom paths
        map.customSymbols = { nodeHeights: 0 } // save some custom settings for buildCustomSVGItem

        for (let i = 1; i < out.sizeLegend.cellNb + 1; i++) {
            //define class number
            const c = out.ascending ? out.sizeLegend.cellNb - i + 1 : i
            //define raw value
            let val = out.sizeLegend.values ? out.sizeLegend.values[c - 1] : maxVal / c
            //calculate shape size
            let symbolSize = map.classifierSize_(val)

            if (map.psShape_ == 'bar') {
                buildBarsItem(map, val, symbolSize, i, labelFormatter)
            } else if (map.psShape_ == 'custom' || map.psCustomSVG_) {
                buildCustomSVGItem(map, val, symbolSize, i, labelFormatter)
            } else {
                buildD3SymbolItem(map, val, symbolSize, i, labelFormatter)
            }
        }

        if (out.sizeLegend.noData) {
            let y = out._sizeLegendContainer.node().getBBox().height
            if (out.colorLegend) {
                y += out.colorLegend.shapeHeight + 5
            }
            let x = out.boxPadding
            appendNoDataLegend(container, out.sizeLegend.noDataText)
        }
    }

    function buildSpikeLegend(map, sizeLegendConfig) {
        const spike = (length, width = map.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`

        let maxSize = map.classifierSize_(map.classifierSize_.domain()[1])

        // Determine values for the legend
        let legendValues = out.sizeLegend.values || map.classifierSize_.ticks(4).slice(1) // Use user-defined values or default ticks

        const fontSize = getFontSizeFromClass('em-legend-label') // Adjust font size
        const labelSpacing = fontSize - 2 // Ensure labels are just below the spikes

        const legend = out._sizeLegendContainer
            .append('g')
            .attr('id', 'em-spike-legend')
            .attr('transform', `translate(${out.boxPadding + 5},0)`)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .style('font-size', `${fontSize}px`)
            .selectAll()
            .data(legendValues) // Now uses user-defined values if provided
            .join('g')
            .attr('transform', (d, i) => `translate(${40 * i + out.boxPadding},${maxSize + 5})`) // Increase spacing

        // Append spikes
        legend
            .append('path')
            .attr('fill', map.psFill_)
            .attr('fill-opacity', map.psFillOpacity_)
            .attr('stroke', map.psStroke_)
            .attr('stroke-width', map.psStrokeWidth_)
            .attr('d', (d) => spike(map.classifierSize_(d))) // Correctly maps values to spike size

        // Append labels directly below each spike
        legend
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', labelSpacing) // Ensure text is right below spikes
            .text((d) => map.classifierSize_.tickFormat(4, 's')(d))

        // 🔹 Add "No Data" item with more spacing
        if (out.sizeLegend.noData) {
            let y = maxSize + labelSpacing + fontSize + 5 // Adjust position below the labels
            let x = out.boxPadding
            const container = out._sizeLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
            appendNoDataLegend(container, out.sizeLegend.noDataText)
        }
    }

    //'no data' legend box
    function appendNoDataLegend(container, noDataText) {
        const map = out.map

        //append symbol & style
        container
            .append('rect')
            .attr('class', 'em-legend-rect')
            .style('fill', map.noDataFillStyle())
            .attr('width', out.colorLegend ? out.colorLegend.shapeWidth : out.noDataShapeWidth)
            .attr('height', out.colorLegend ? out.colorLegend.shapeHeight : out.noDataShapeHeight)
            .on('mouseover', function () {
                highlightRegions(map, 'nd')
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, 'nd')
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(map)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions, 'nd')
                }
            })

        //'no data' label
        container
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', out.colorLegend ? out.colorLegend.shapeWidth + out.colorLegend.labelOffset.x : out.noDataShapeWidth + 5)
            .attr('y', out.colorLegend ? out.colorLegend.shapeHeight / 2 : out.noDataShapeHeight / 2)
            .text(noDataText)
    }

    function highlightRegions(map, ecl) {
        // TODO: change this to estat logic of making all other classes transparent?
        let selector = out.geo_ === 'WORLD' ? '#em-worldrg' : '#em-nutsrg'
        if (map.Geometries.userGeometries) selector = '#em-user-regions' // for user-defined geometries
        const sel = map.selectAll(selector).selectAll("[ecl='" + ecl + "']")
        sel.style('fill', map.hoverColor())
        sel.attr('fill___', function () {
            select(this).style('fill')
        })
    }

    function unhighlightRegions(map, ecl) {
        let selector = out.geo_ === 'WORLD' ? '#em-worldrg' : '#em-nutsrg'
        if (map.Geometries.userGeometries) selector = '#em-user-regions' // for user-defined geometries
        const sel = map.selectAll(selector).selectAll("[ecl='" + ecl + "']")
        sel.style('fill', function () {
            select(this).attr('fill___')
        })
    }

    /**
     * @description builds a size legend item for proportional D3 shapes (e.g. square, triangle, star)
     * @param {number} symbolSize the size of the symbol item
     */
    function buildD3SymbolItem(value, symbolSize, index, labelFormatter) {
        const map = out.map
        let symbolHeight = map.psShape_ == 'triangle' || map.psShape_ == 'diamond' ? symbolSize : symbolSize / 2
        if (out.sizeLegend._totalD3SymbolsHeight == 0) out.sizeLegend._totalD3SymbolsHeight += symbolHeight + out.boxPadding //add first item height to y
        let maxSize = map.classifierSize_(map.classifierSize_.domain()[1])
        // x and y position of item in legend
        let x = maxSize
        let y =
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) +
            out.sizeLegend._totalD3SymbolsHeight +
            (out.sizeLegend.shapePadding * index - 1)

        out.sizeLegend._totalD3SymbolsHeight += symbolSize

        //container for symbol and label
        let itemContainer = out._sizeLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-size-legend-item')

        // draw D3 symbol
        let shape = getShape()
        let d = shape.size(symbolSize * symbolSize)()
        itemContainer
            .append('g')
            // .attr('transform', `translate(${x},${y})`)
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_
            })
            .style('fill-opacity', map.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
            .style('stroke-width', map.psStrokeWidth())
            .append('path')
            .attr('d', d)
            .attr('transform', () => {
                return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })

        //label position
        let labelX = maxSize / 2 + out.sizeLegend.labelOffset.x + out.boxPadding

        //append label
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', labelX)
            .attr('y', 0)
            .text(labelFormatter(value))
    }

    /**
     * @description
     * @param {*} m
     * @param {*} value
     * @param {*} symbolSize
     * @param {*} index
     * @param {*} labelFormatter
     */
    function buildCustomSVGItem(value, symbolSize, index, labelFormatter) {
        const map = out.map
        let x = out.boxPadding //set X offset
        let y

        //first item
        if (!map.customSymbols.prevSymb) {
            y = out.boxPadding + (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) + 20
            map.customSymbols.initialTranslateY = y
            map.customSymbols.prevScale = symbolSize
        }

        //following items
        if (map.customSymbols.prevSymb) {
            let prevNode = map.customSymbols.prevSymb.node()
            let bbox = prevNode.getBBox()
            map.customSymbols.nodeHeights = map.customSymbols.nodeHeights + bbox.height * map.customSymbols.prevScale
            y = map.customSymbols.initialTranslateY + map.customSymbols.nodeHeights + out.sizeLegend.shapePadding * (index - 1)
            map.customSymbols.prevScale = symbolSize
        }

        //container for symbol and label
        let itemContainer = out._sizeLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-size-legend-item')

        // draw standard symbol
        map.customSymbols.prevSymb = itemContainer
            .append('g')
            .attr('class', 'em-size-legend-symbol')
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_
            })
            .style('fill-opacity', map.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
            .style('stroke-width', map.psStrokeWidth())
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .append('g')
            .html(map.psCustomSVG_)
            .attr('transform', () => {
                if (map.psCustomSVG_) return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y}) scale(${symbolSize})`
                else return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })

        //label position
        let labelX = x + map.classifierSize_(map.classifierSize_.domain()[0]) + out.sizeLegend.labelOffset.x
        let labelY = out.sizeLegend.shapeOffset.y / 2 + 1 //y + out.sizeLegend.labelOffset.y

        //append label
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', labelX)
            .attr('y', labelY)
            .text(labelFormatter(value))
    }

    /**
     * @description
     * @param {*} m
     * @param {*} symbolSize
     */
    function buildBarsItem(value, symbolSize, index, labelFormatter) {
        const map = out.map
        // for vertical bars we dont use a dynamic X offset because all bars have the same width
        let x = out.boxPadding
        //we also dont need the y offset
        let y = out.boxPadding + (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0) + out.sizeLegend._totalBarsHeight + 10

        out.sizeLegend._totalBarsHeight += symbolSize + 10

        //set shape size and define 'd' attribute
        let shape = getShape()
        let d = shape.size(symbolSize * symbolSize)()

        //container for symbol and label
        let itemContainer = out._sizeLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-size-legend-item')

        // draw bar symbol
        itemContainer
            .append('g')
            .style('fill', (d) => {
                // if secondary stat variable is used for symbol colouring, then dont colour the legend symbols using psFill()
                return map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_
            })
            .style('fill-opacity', map.psFillOpacity())
            .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
            .style('stroke-width', map.psStrokeWidth())
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5)
            .append('path')
            .attr('d', d)
            .attr('transform', () => {
                if (map.psCustomSVG_) return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y}) scale(${symbolSize})`
                else return `translate(${out.sizeLegend.shapeOffset.x},${out.sizeLegend.shapeOffset.y})`
            })
        //label position
        let labelX = x + map.psBarWidth_ + out.sizeLegend.labelOffset.x
        let labelY = symbolSize / 2 + out.sizeLegend.labelOffset.y

        //append label
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', labelX)
            .attr('y', labelY)
            .text(labelFormatter(value))
    }

    /**
     * @description builds a nested circle legend for proportional circles
     * @param {*} m map
     */
    function buildCircleLegend() {
        const map = out.map
        let y = 0

        //assign default circle radiuses if none specified by user
        let domain = map.classifierSize_.domain()
        if (!out.sizeLegend.values) {
            // default legend values
            out._sizeLegendValues = [Math.floor(domain[1]), Math.floor(domain[1] / 2), Math.floor(domain[0])]
        } else {
            // user defined legend values
            out._sizeLegendValues = out.sizeLegend.values
        }

        //draw size legend title

        if (out.sizeLegend.title) {
            let titleFontSize = getFontSizeFromClass('em-size-legend-title')
            y = titleFontSize
            out._sizeLegendContainer
                .append('text')
                .attr('class', 'em-size-legend-title')
                .attr('id', 'em-size-legend-title')
                .attr('y', y)
                .text(out.sizeLegend.title)

            y += titleFontSize
        }

        let maxRadius = map.classifierSize_(max(out._sizeLegendValues)) //maximum circle radius to be shown in legend
        let x = out.boxPadding + maxRadius
        y += maxRadius * 2 + out.sizeLegend.titlePadding

        let itemContainer = out._sizeLegendContainer
            .append('g')
            .attr('transform', `translate(${x},${y})`)
            .attr('class', 'em-circle-legend')
            .attr('id', 'em-circle-legend')
            .attr('text-anchor', 'right')
            .style('fill', 'black')
            .selectAll('g')
            .data(out._sizeLegendValues.filter((d) => map.classifierSize_(d))) // Filter data before binding
            .join('g')
            .attr('class', 'em-legend-item')

        //circles
        itemContainer
            .append('circle')
            .attr('class', 'em-legend-circle')
            .style('fill', 'none')
            .attr('stroke', 'black')
            .attr('cy', (d) => -map.classifierSize_(d))
            .attr('r', map.classifierSize_)

        //labels
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('y', (d, i) => {
                let y = -1 - 2 * map.classifierSize_(d)
                return y
            })
            .attr('x', maxRadius + 5)
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
                let y = -1 - 2 * map.classifierSize_(d)
                return y
            })
            .attr('x2', maxRadius + 5)
            .attr('y2', (d, i) => {
                let y = -1 - 2 * map.classifierSize_(d)
                return y
            })

        return out
    }

    /**
     * Builds a legend illustrating the statistical values of different symbol colours
     *
     * @param {*} m map
     */
    function buildColorLegend(baseX, baseY) {
        // color legend main container
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'color-legend-container')

        // position it below size legend
        if (out._sizeLegendContainer) {
            out._colorLegendContainer.attr('transform', `translate(0,${out._sizeLegendContainer.node().getBBox().height})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
        }

        if (out.colorLegend.labelType === 'ranges') {
            buildColorRangesLegend()
        } else {
            buildColorThresholdsLegend()
        }
    }

    function getColorThresholds() {
        const map = out.map
        const thresholds =
            map.psThresholds_.length > 1
                ? map.psThresholds_
                : Array.from({ length: map.psClasses_ })
                      .map((_, index) => {
                          return map.classifierColor_.invertExtent(index)[out.ascending ? 0 : 1]
                      })
                      .slice(1) // Remove the first entry and return the rest as an array
        return thresholds
    }

    function buildColorRangesLegend() {
        const map = out.map
        const f = out.colorLegend.labelFormatter || spaceAsThousandSeparator
        const thresholds = getColorThresholds()
        const numberOfClasses = map.psClasses_
        const container = out._colorLegendContainer
        const x = 0 // x position of color legend cells

        //title
        if (out.colorLegend.title) {
            container
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', x)
                .attr('y', out.titleFontSize + out.colorLegend.marginTop)
                .text(out.colorLegend.title)
        }

        for (let i = 0; i < numberOfClasses; i++) {
            let y =
                out.titleFontSize +
                out.colorLegend.titlePadding +
                out.colorLegend.marginTop +
                i * (out.colorLegend.shapeHeight + out.colorLegend.shapePadding)

            const ecl = out.ascending ? i : numberOfClasses - i - 1

            const itemContainer = container.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-legend-item')

            // Rectangle
            itemContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .style('fill', map.psClassToFillStyle()(ecl, numberOfClasses))
                .attr('width', out.colorLegend.shapeWidth)
                .attr('height', out.colorLegend.shapeHeight)
                .on('mouseover', function () {
                    highlightRegions(map, ecl)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, ecl)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions)
                    }
                })

            // Label
            itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('dy', '0.35em') // ~vertical centering
                .attr('x', out.colorLegend.shapeWidth + out.colorLegend.labelOffset.x)
                .attr('y', out.colorLegend.shapeHeight / 2)
                .text(() => {
                    if (out.colorLegend.labels) return out.colorLegend.labels[i] // user-defined labels
                    if (i === 0) return `> ${f(thresholds[thresholds.length - 1])}`
                    if (i === thresholds.length) return `< ${f(thresholds[0])}`
                    return `${f(thresholds[thresholds.length - i - 1])} - < ${f(thresholds[thresholds.length - i])}`
                })
        }

        // Optionally add no-data
        if (out.colorLegend.noData) {
            let y = out.titleFontSize + out.colorLegend.marginTop + numberOfClasses * out.colorLegend.shapeHeight + 20 // add 20 to separate it from the rest
            appendNoDataLegend(x, y, out.colorLegend.noDataText)
        }
    }

    function buildColorThresholdsLegend(baseX, baseY) {
        //define format for labels
        const labelFormatter = out.colorLegend.labelFormatter || spaceAsThousandSeparator

        //title
        if (out.colorLegend.title) {
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.titleFontSize + out.colorLegend.marginTop)
                .text(out.colorLegend.title)
        }

        // x position of color legend cells
        let x = baseX

        //draw legend elements for classes: rectangle + label
        let numberOfClasses = map.psClasses_

        for (let i = 0; i < numberOfClasses; i++) {
            //the vertical position of the legend element
            let y = out.titleFontSize + out.colorLegend.titlePadding + out.colorLegend.marginTop + i * out.colorLegend.shapeHeight // account for title + margin

            //the class number, depending on order
            const ecl = out.ascending ? i : numberOfClasses - i - 1

            let itemContainer = out._colorLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-legend-item')

            //append symbol & style
            itemContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .style('fill', map.psClassToFillStyle()(ecl, numberOfClasses))
                .attr('width', out.colorLegend.shapeWidth)
                .attr('height', out.colorLegend.shapeHeight)
                .on('mouseover', function () {
                    highlightRegions(map, ecl)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, ecl)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions, ecl)
                    }
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
            if (i < numberOfClasses - 1) {
                itemContainer
                    .append('text')
                    .attr('class', 'em-legend-label')
                    .attr('dy', '0.35em') // ~vertical centering
                    .attr('x', out.colorLegend.sepLineLength + out.colorLegend.tickLength + out.colorLegend.labelOffset.x)
                    .attr('y', out.colorLegend.shapeHeight)
                    .text(
                        out.colorLegend.labels
                            ? out.colorLegend.labels[i]
                            : labelFormatter(map.classifierColor_.invertExtent(out.ascending ? ecl + 1 : ecl - 1)[out.ascending ? 0 : 1])
                    )
            }
        }

        //'no data' legend box
        if (out.colorLegend.noData) {
            let y = out.titleFontSize + out.colorLegend.marginTop + numberOfClasses * out.colorLegend.shapeHeight + 20 // add 20 to separate it from the rest
            appendNoDataLegend(x, y, out.colorLegend.noDataText)
        }
    }

    /**
     * @description returns the d3.symbol object chosen by the user
     * @return {d3.shape || SVG}
     */
    function getShape() {
        const map = out.map
        let shape
        if (map.psCustomSVG_) {
            shape = map.psCustomSVG_
        } else if (map.psCustomShape_) {
            shape = map.psCustomShape_
        } else if (map.psShape_ == 'bar') {
            //for rectangles, we use a custom d3 symbol
            let drawRectangle = (context, size) => {
                let height = Math.sqrt(size)
                context.moveTo(0, 0)
                context.lineTo(0, height)
                context.lineTo(map.psBarWidth_, height)
                context.lineTo(map.psBarWidth_, 0)
                context.lineTo(0, 0)
                context.closePath()
            }
            shape = symbol().type({ draw: drawRectangle })
        } else {
            let symbolType = symbolsLibrary[map.psShape_] || symbolsLibrary['circle']
            shape = symbol().type(symbolType)
        }
        return shape
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl) {
        //for ps, the symbols are the children of each em-prop-symbols element
        const allSymbols = map.svg_.selectAll('#em-prop-symbols').selectAll('[ecl]')

        // Set all symbols to white
        allSymbols.each(function (d, i) {
            let symbol = select(this.childNodes[0])
            symbol.style('fill', 'white')
        })

        // Highlight only the selected regions by restoring their original color
        const selectedSymbols = allSymbols.filter("[ecl='" + ecl + "']")
        selectedSymbols.each(function (d, i) {
            let symbol = select(this.childNodes[0])
            symbol.style('fill', symbol.attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        //for ps, the symbols are the children of each em-prop-symbols element
        const allSymbols = map.svg_.selectAll('#em-prop-symbols').selectAll('[ecl]')

        // Restore each region's original color from the fill___ attribute
        allSymbols.each(function (d, i) {
            let symbol = select(this.childNodes[0])
            symbol.style('fill', symbol.attr('fill___')) // Restore original color for selected regions
        })
    }

    return out
}
