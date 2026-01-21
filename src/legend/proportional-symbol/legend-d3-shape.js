import { symbolsLibrary } from '../../map-types/proportional-symbol/map-proportional-symbols'
import { symbol } from 'd3-shape'

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

/**
 * @description builds a size legend item for proportional D3 shapes (e.g. square, triangle, star)
 * @param {number} symbolSize the size of the symbol item
 */
export function buildD3SymbolItem(out, value, symbolSize, index, labelFormatter) {
    const map = out.map

    // Initialize running Y cursor for stacking
    if (out.sizeLegend._cursorY == null) {
        out.sizeLegend._cursorY = out.boxPadding + (out.sizeLegend.title ? out.sizeLegend.titlePadding : 0)
    }

    const maxSize = map.classifierSize_(map.classifierSize_.domain()[1])
    const x = maxSize
    const y = out.sizeLegend._cursorY + out.sizeLegend.shapePadding

    // Container for symbol + label
    const itemContainer = out._sizeLegendContainer
        .append('g')
        .attr('class', 'em-size-legend-item')
        .attr('transform', `translate(${x},${y})`)

    // --- Draw D3 symbol ---
    const shape = getShape(out)
    const d = shape.size(symbolSize * symbolSize)()

    const symbolGroup = itemContainer
        .append('g')
        .style('fill', map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_)
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke || map.psStroke())
        .style('stroke-width', out.sizeLegend.shapeStrokeWidth || map.psStrokeWidth())

    const symbolPath = symbolGroup
        .append('path')
        .attr('d', d)

    // hift symbol down by half its height (baseline-align it)
    const symBBox = symbolPath.node().getBBox()
    symbolPath.attr(
        'transform',
        `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y + symBBox.height / 2})`
    )

    // --- Label ---
    const labelX = maxSize / 2 + out.sizeLegend.labelOffsets.x + out.boxPadding

    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em')
        .attr('x', labelX)
        .attr('y', symBBox.height / 2)
        .text(labelFormatter(value))

    // --- Advance cursor using final rendered height ---
    const hb = itemContainer.node().getBBox().height
    out.sizeLegend._cursorY += hb + out.sizeLegend.shapePadding
}