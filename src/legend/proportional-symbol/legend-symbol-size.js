import { getFontSizeFromClass } from '../../core/utils'
import { symbolsLibrary } from '../../maptypes/map-proportional-symbols'
import { symbol } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'
import { max } from 'd3-array'
import { highlightRegions, unhighlightRegions } from './legend-proportional-symbols'
/**
 * Builds a legend which illustrates the statistical values of different symbol sizes
 *
 * @param {*} map map instance
 * @param {*} container parent legend object from core/legend.js
 */
export function buildSizeLegend(out, baseX, baseY) {
    const map = out.map
    out._sizeLegendContainer = out.lgg
        .append('g')
        .attr('class', 'size-legend-container')
        .attr('id', 'size-legend-container')
        .attr('transform', `translate(${baseX},${baseY})`)

    if (!map.psCustomSVG_ && map.psShape_ == 'circle') {
        buildCircleLegend(out)
        if (out.sizeLegend.noData) {
            let y = out._sizeLegendContainer.node().getBBox().height + 15 // padding after the circle legend
            const container = out._sizeLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${0},${y})`)
            out.appendNoDataLegend(container, out.sizeLegend.noDataText, highlightRegions, unhighlightRegions)
        }
        return
    } else if (map.psShape_ == 'spike') {
        buildSpikeLegend(out)
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

        let x = 0
        const container = out._sizeLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        out.appendNoDataLegend(container, out.sizeLegend.noDataText, highlightRegions, unhighlightRegions)
    }
}

/**
 * @description builds a nested circle legend for proportional circles
 * @param {*} m map
 */
function buildCircleLegend(out) {
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

function buildSpikeLegend(out) {
    const map = out.map
    const spike = (length, width = map.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`
    const maxSize = map.classifierSize_(map.classifierSize_.domain()[1])

    // Determine values for the legend
    const legendValues = out.sizeLegend.values || map.classifierSize_.ticks(4).slice(1) // Use user-defined values or default ticks

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
        out.appendNoDataLegend(container, out.sizeLegend.noDataText, highlightRegions, unhighlightRegions)
    }
}

/**
 * @description builds a size legend item for proportional D3 shapes (e.g. square, triangle, star)
 * @param {number} symbolSize the size of the symbol item
 */
function buildD3SymbolItem(out, value, symbolSize, index, labelFormatter) {
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
