import { color } from 'd3-color'
import { appendLegendSwatchRows } from '../legend-swatch'

// explain flow line colors
export function drawFlowColorLegend(out, x, y) {
    // out.map is the top-level facade; flow-specific state lives on the actual layer (out.layer).
    const map = out.layer

    // Create/clear container
    out._flowColorContainer?.remove()
    out._flowColorContainer = out.lgg.append('g').attr('class', 'em-flow-color-legend').attr('transform', `translate(${x}, ${y})`)

    const title = out._flowColorContainer
        .append('text')
        .attr('class', 'em-color-legend-title')
        .attr('id', 'em-color-legend-title')
        .attr('y', 0)
        .attr('dy', '0.8em')
        .text(out.flowColorLegend.title || 'Destination')

    let legendItems = []
    const customColors = typeof map.flowColor_ === 'function'
    if (customColors) {
        if (out.flowColorLegend.items && out.flowColorLegend.items.length > 0) {
            legendItems = out.flowColorLegend.items
        } else {
            legendItems = [{ label: 'please specify legend items ...', color: '#888', key: null }]
        }
    } else {
        // “top destinations” case
        const colorScale = map.topLocationColorScale
        const topKeys = Array.from(map.topLocationKeys || [])
        legendItems = topKeys.map((key) => ({
            key,
            label: map.nodeNameMap.get(key) || key,
            color: colorScale(key),
        }))
        legendItems.push({ key: 'Other', label: 'Other', color: map.flowColor_ })
    }

    // Draw each legend row. Keep layout consistent with other swatch legends.
    const titleBoxHeight = title.node()?.getBBox()?.height || 0
    const titlePadding = out.flowColorLegend.titlePadding ?? 10
    const shapeWidth = out.shapeWidth || 18
    const shapeHeight = out.shapeHeight || 18
    // Contiguous swatches by default, like the discrete choropleth legend (not the 5px categorical gap)
    const rowGap = out.flowColorLegend.shapePadding ?? 0
    const labelOffsetX = out.labelOffsets?.x ?? 5
    const titleOffset = titleBoxHeight + titlePadding

    const scopedLinks = () => out.map.svg().selectAll('.em-flow-container .em-flow-link, .em-flow-container .em-flow-link-bundled')

    const rows = appendLegendSwatchRows(out._flowColorContainer, legendItems, {
        shapeWidth,
        shapeHeight,
        startY: titleOffset,
        gap: rowGap,
        labelX: shapeWidth + labelOffsetX,
        rowClass: 'em-color-legend-item em-legend-item',
        labelDy: '0.35em',
    })

    legendItems.forEach((item, i) => {
        const { row, swatch, label } = rows[i]
        const colorKey = normalizeColor(item.color)
        const matches = (link) => {
            if (!customColors) return link.getAttribute('data-color-key') === String(item.key)
            if (item.key != null) return link.getAttribute('data-dest') === String(item.key)
            return normalizeColor(link.getAttribute('data-color')) === colorKey
        }

        row.style('cursor', 'pointer')
            .on('mouseenter', () => {
                const links = scopedLinks()
                const matchingLinks = links.filter(function () {
                    return matches(this)
                })
                if (matchingLinks.empty()) return

                links.classed('highlighted', false).classed('dimmed', true)
                matchingLinks.classed('highlighted', true).classed('dimmed', false)
                label.style('font-weight', 'bold')
                swatch.attr('stroke', 'black').attr('stroke-width', 2)
            })
            .on('mouseleave', () => {
                scopedLinks().classed('highlighted', false).classed('dimmed', false)
                label.style('font-weight', null)
                swatch.attr('stroke', null).attr('stroke-width', null)
            })
    })
}

function normalizeColor(value) {
    const text = value?.trim()
    return color(text)?.formatRgb() ?? text
}
