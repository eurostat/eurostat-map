import { getFontSizeFromClass } from '../../core/utils'
import { symbolsLibrary } from '../../map-types/proportional-symbol/map-proportional-symbols.js'
import { symbol } from 'd3-shape'
import { spaceAsThousandSeparator } from '../../core/utils'

import { select } from 'd3-selection'
import { drawCircleSizeLegend } from '../legend-circle-size'
import { buildSpikeLegend } from './legend-spike'
import { buildD3SymbolItem } from './legend-d3-shape'

/**
 * Builds a legend which illustrates the statistical values of different symbol sizes
 *
 * @param {*} map map instance
 * @param {*} container parent legend object from core/legend.js
 */
export function drawSizeLegend(out, baseX, baseY) {
    const map = out.map

    // container for size legend
    out._sizeLegendContainer = out.lgg
        .append('g')
        .attr('class', 'em-size-legend-container')
        .attr('id', 'em-size-legend-container')
        .attr('transform', `translate(${baseX},${baseY})`)

    // reset per-draw cursors/accumulators
    out.sizeLegend._cursorY = null

    // draw legend
    if (!map.psCustomSVG_ && map.psShape_ === 'circle') {
        // circle size legend
        drawCircleSizeLegend(
            out,
            out._sizeLegendContainer,
            out.sizeLegend.values,
            map.classifierSize_,
            out.sizeLegend.title,
            out.sizeLegend.titlePadding
        )
        // DO NOT return; we want No Data appended after everything
    } else if (map.psShape_ === 'spike') {
        buildSpikeLegend(out)
    } else {
        // bars, other d3 shapes, custom SVG paths

        const container = out._sizeLegendContainer
        //draw size legend title
        if (out.sizeLegend.title) {
            const sizeLegendTitleFontSize = getFontSizeFromClass('em-size-legend-title')
            // append title to the legend
            container
                .append('text')
                .attr('class', 'em-legend-title em-size-legend-title')
                .attr('id', 'em-size-legend-title')
                .attr('x', 0)
                .attr('y', sizeLegendTitleFontSize)
                .text(out.sizeLegend.title)
        }

        // define format for labels
        const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator
        const domain = map.classifierSize_.domain()

        // for custom paths
        map.customSymbols = { nodeHeights: 0 } // save some custom settings for buildCustomSVGItem

        // if user doesnt define values for legend manually
        if (!out.sizeLegend.values) {
            out.sizeLegend.values = [domain[1], domain[0]] // default to min and max values
        }

        let length = out.sizeLegend.values.length
        if (!length || length < 2) {
            console.warn('eurostat-map: sizeLegend.values length must be at least 2')
            length = 2
        }
        for (let i = 1; i < length + 1; i++) {
            // define class number
            // define raw value
            const val = out.sizeLegend.values[i - 1]
            // calculate shape size
            const symbolSize = map.classifierSize_(val)

            if (map.psShape_ === 'bar') {
                buildBarsItem(out, val, symbolSize, i, labelFormatter)
            } else if (map.psShape_ === 'custom' || map.psCustomSVG_) {
                buildCustomSVGItem(out, val, symbolSize, i, labelFormatter)
            } else {
                buildD3SymbolItem(out, val, symbolSize, i, labelFormatter)
            }
        }
    }

    // append No Data after all size-legend content is in the container
    if (out.sizeLegend.noData) addNoDataLegend(out)
}

function addNoDataLegend(out) {
    const bbox = out._sizeLegendContainer.node().getBBox()
    const paddings = {
        default: 20,
        bar: 35,
        spike: 1,
        circle: 1,
        square: 20,
    } // add some extra padding for bars and spikes
    const padding = paddings[out.map.psShape_] || paddings['default']
    const noDataHeight = out.noDataShapeHeight
    const y = bbox.height + padding + noDataHeight / 2 // padding after the size legend
    const x = 0
    const container = out._sizeLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
    out.appendNoDataLegend(container, out.sizeLegend.noDataText, highlightPsRegions, unhighlightPsRegions)
}

/**
 * @description
 * @param {*} m
 * @param {*} value
 * @param {*} symbolSize
 * @param {*} index
 * @param {*} labelFormatter
 */
function buildCustomSVGItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map

    if (out.sizeLegend._cursorY == null) {
        out.sizeLegend._cursorY =
            out.boxPadding + (out.sizeLegend.title ? out.sizeLegend.titlePadding : 0)
    }

    const maxSize = map.classifierSize_(map.classifierSize_.domain()[1])
    const symbolColumnX = out.boxPadding + maxSize
    const y = out.sizeLegend._cursorY

    // Row container
    const itemContainer = out._sizeLegendContainer
        .append('g')
        .attr('class', 'em-size-legend-item')
        .attr('transform', `translate(${symbolColumnX},${y})`) 

    // Symbol wrapper
    const symbolGroup = itemContainer
        .append('g')
        .attr('class', 'em-size-legend-symbol')
        .style('fill', map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_)
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke || map.psStroke())
        .style('stroke-width', out.sizeLegend.shapeStrokeWidth || map.psStrokeWidth())

    // SVG content
    const svgGroup = symbolGroup
        .append('g')
        .html(map.psCustomSVG_)
        .attr('transform', `scale(${symbolSize})`)

    //  Measure rendered symbol
    const bbox = svgGroup.node().getBBox()

    //  CENTER X AND Y RELATIVE TO ROW CENTER
    svgGroup.attr(
        'transform',
        `translate(${-bbox.x - bbox.width / 2},${-bbox.y - bbox.height / 2}) scale(${symbolSize})`
    )

    // Label aligned to same row center
    const labelX =
        symbolColumnX +
        map.classifierSize_(map.classifierSize_.domain()[0]) +
        out.sizeLegend.labelOffsets.x

    const labelY = 0

    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em')
        .attr('x', labelX)
        .attr('y', labelY)
        .text(labelFormatter(value))

    // Advance cursor by FULL row height
    const h = itemContainer.node().getBBox().height
    out.sizeLegend._cursorY += h + out.sizeLegend.shapePadding
}

/**
 * @description
 * @param {*} m
 * @param {*} symbolSize
 */
function buildBarsItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map

    // init stacking cursor
    if (out.sizeLegend._cursorY == null) {
        out.sizeLegend._cursorY = out.boxPadding + (out.sizeLegend.title ? out.sizeLegend.titlePadding : 0)
    }

    const x = out.boxPadding // bars start from the left
    const y = out.sizeLegend._cursorY + out.sizeLegend.shapePadding

    // make bar path (height ≈ symbolSize because size() gets area = symbolSize^2)
    const shape = getShape(out)
    const d = shape.size(symbolSize * symbolSize)()

    // container for one bar + label
    const itemContainer = out._sizeLegendContainer.append('g').attr('class', 'em-size-legend-item').attr('transform', `translate(${x},${y})`)

    // draw bar
    itemContainer
        .append('g')
        .style('fill', map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_)
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
        .style('stroke-width', out.sizeLegend.shapeStrokeWidth || map.psStrokeWidth())
        .append('path')
        .attr('d', d)
        .attr('transform', `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y})`)

    // label (to the right, vertically centered)
    const labelX = x + map.psBarWidth_ + out.sizeLegend.labelOffsets.x
    const labelY = symbolSize / 2 + out.sizeLegend.labelOffsets.y

    itemContainer.append('text').attr('class', 'em-legend-label').attr('dy', '0.35em').attr('x', labelX).attr('y', labelY).text(labelFormatter(value))
    

    // advance stacking cursor by actual rendered height
    const hb = itemContainer.node().getBBox().height
    out.sizeLegend._cursorY += hb + out.sizeLegend.shapePadding
}

/**
 * @description returns the d3.symbol object chosen by the user
 * @return {d3.shape || SVG}
 */
function getShape(out) {
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

function highlightPsRegions(map, ecl) {
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    // Set all symbols to visible
    allSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', '0')
    })

    // Highlight only the selected regions by restoring their original opacity
    const selectedSymbols = allSymbols.filter("[ecl='" + ecl + "']")
    selectedSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', map.psFillOpacity_) // Restore original opacity for selected regions
    })
}

// Reset all regions to their original opacitys on mouseout
function unhighlightPsRegions(map) {
    const allSymbols = map.getCentroidsGroup(map).selectAll('[ecl]')

    // Restore each region's original opacity from the fill___ attribute
    allSymbols.each(function (d, i) {
        let symbol = select(this)
        symbol.style('opacity', map.psFillOpacity_) // Restore original opacity for selected regions
    })
}
