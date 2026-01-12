import { symbolsLibrary } from '../../map-types/map-proportional-symbols'

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
        out.sizeLegend._cursorY =
            out.boxPadding +
            (out.sizeLegend.title ? out.titleFontSize + out.sizeLegend.titlePadding : 0)
    }

    const maxSize = map.classifierSize_(map.classifierSize_.domain()[1])
    const x = maxSize
    const y = out.sizeLegend._cursorY + out.sizeLegend.shapePadding

    // Container for symbol + label
    const itemContainer = out._sizeLegendContainer
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .attr('class', 'em-size-legend-item')

    // Draw D3 symbol
    const shape = getShape(out)
    const d = shape.size(symbolSize * symbolSize)()

    itemContainer
        .append('g')
        .style('fill', (d) => (map.classifierColor_ ? out.sizeLegend.shapeFill : map.psFill_))
        .style('fill-opacity', map.psFillOpacity())
        .style('stroke', out.sizeLegend.shapeStroke ? out.sizeLegend.shapeStroke : map.psStroke())
        .style('stroke-width', map.psStrokeWidth())
        .append('path')
        .attr('d', d)
        .attr('transform', () => `translate(${out.sizeLegend.shapeOffsets.x},${out.sizeLegend.shapeOffsets.y})`)

    // Label position
    const labelX = maxSize / 2 + out.sizeLegend.labelOffsets.x + out.boxPadding

    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em') // ~vertical centering
        .attr('x', labelX)
        .attr('y', 0)
        .text(labelFormatter(value))

    // Measure actual height and advance the stacking cursor
    const hb = itemContainer.node().getBBox().height
    out.sizeLegend._cursorY += hb + out.sizeLegend.shapePadding
}