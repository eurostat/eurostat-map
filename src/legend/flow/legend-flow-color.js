import { color } from 'd3-color'
import { getFontSizeFromClass } from '../../core/utils'
import {
    appendLegendSwatch,
    appendLegendSwatchLabel,
    appendLegendSwatchRows,
    assignLabelRows,
    swatchBarLayout,
    swatchStackStart,
    thresholdsDecorator,
} from '../legend-swatch'

// explain flow line colors
export function drawFlowColorLegend(out, x, y) {
    // out.map is the top-level facade; flow-specific state lives on the actual layer (out.layer).
    const map = out.layer
    const cfg = out.flowColorLegend

    // Create/clear container
    out._flowColorContainer?.remove()
    out._flowColorContainer = out.lgg.append('g').attr('class', 'em-flow-color-legend').attr('transform', `translate(${x}, ${y})`)

    const title = out._flowColorContainer
        .append('text')
        .attr('class', 'em-color-legend-title')
        .attr('id', 'em-color-legend-title')
        .attr('y', 0)
        .attr('dy', '0.8em')
        .text(cfg.title || 'Destination')

    let legendItems = []
    const customColors = typeof map.flowColor_ === 'function'
    if (customColors) {
        if (cfg.items && cfg.items.length > 0) {
            legendItems = cfg.items
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
    const titlePadding = cfg.titlePadding ?? 10
    const shapeWidth = out.shapeWidth || 18
    const shapeHeight = out.shapeHeight || 18
    // Contiguous swatches by default, like the discrete choropleth legend (not the 5px categorical gap)
    const rowGap = cfg.shapePadding ?? 0
    const labelOffsetX = out.labelOffsets?.x ?? 5
    const titleOffset = swatchStackStart({ titleHeight: titleBoxHeight, titlePadding })

    // labels at the boundaries between the classes (a threshold scale), instead of one label per swatch
    const thresholds = Array.isArray(cfg.thresholds) && cfg.thresholds.length ? cfg.thresholds : null

    const swatches =
        cfg.orientation === 'horizontal'
            ? drawHorizontalColorBar(out, legendItems, { thresholds, shapeHeight, top: titleOffset })
            : drawVerticalColorStack(out, legendItems, { thresholds, shapeWidth, shapeHeight, rowGap, labelOffsetX, top: titleOffset })

    const scopedLinks = () => out.map.svg().selectAll('.em-flow-container .em-flow-link, .em-flow-container .em-flow-link-bundled')

    legendItems.forEach((item, i) => {
        const { row, swatch, label } = swatches[i]
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
                label?.style('font-weight', 'bold')
                swatch.attr('stroke', 'black').attr('stroke-width', 2)
            })
            .on('mouseleave', () => {
                scopedLinks().classed('highlighted', false).classed('dimmed', false)
                label?.style('font-weight', null)
                swatch.attr('stroke', null).attr('stroke-width', null)
            })
    })
}

/** The default layout: a column of swatches, each with its label (or with threshold labels at the seams). */
function drawVerticalColorStack(out, items, { thresholds, shapeWidth, shapeHeight, rowGap, labelOffsetX, top }) {
    const cfg = out.flowColorLegend
    const tickLength = 4
    const rows = appendLegendSwatchRows(out._flowColorContainer, thresholds ? items.map((item) => ({ ...item, label: null })) : items, {
        shapeWidth,
        shapeHeight,
        startY: top,
        gap: rowGap,
        labelX: shapeWidth + labelOffsetX,
        rowClass: 'em-color-legend-item em-legend-item',
        labelDy: '0.35em',
        decorate: thresholds
            ? thresholdsDecorator({
                  count: items.length,
                  sepLength: shapeWidth,
                  tickLength,
                  labelX: shapeWidth + tickLength + labelOffsetX,
                  shapeHeight,
                  labelText: (i) => thresholds[i] ?? '',
              })
            : undefined,
    })
    return rows
}

/**
 * A horizontal bar of contiguous swatches running low to high. Threshold labels sit under the seams between the
 * swatches, `minLabel` / `maxLabel` under the two ends of the bar (or each swatch's own label, centred under it, when
 * there are no thresholds). Labels that would touch are moved onto a second row, so they can never overlap.
 */
function drawHorizontalColorBar(out, items, { thresholds, shapeHeight, top }) {
    const cfg = out.flowColorLegend
    const container = out._flowColorContainer
    const count = items.length
    const barWidth = cfg.width ?? out.width ?? 200
    const tickLength = 4
    const barBottom = top + shapeHeight
    const bar = swatchBarLayout({ count, width: barWidth })
    const labelFontSize = getFontSizeFromClass('em-legend-label') || 12

    const rows = items.map((item, j) => {
        const row = container.append('g').attr('class', 'em-color-legend-item em-legend-item')
        const swatch = appendLegendSwatch(row, { x: bar.itemX(j), y: top, width: bar.itemWidth, height: shapeHeight, color: item.color })
        if (j > 0)
            row.append('line')
                .attr('class', 'em-legend-separator')
                .attr('x1', bar.itemX(j))
                .attr('y1', top)
                .attr('x2', bar.itemX(j))
                .attr('y2', barBottom)
        return { row, swatch, label: null }
    })

    // labels, left to right: min bound, thresholds (or swatch labels), max bound
    const labelled = []
    const add = (x, anchor, text) => {
        if (text == null || text === '') return
        const tick = container
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', x)
            .attr('y1', barBottom)
            .attr('x2', x)
            .attr('y2', barBottom + tickLength)
        const label = appendLegendSwatchLabel(container, { x, y: barBottom + tickLength + 2, dy: '0.9em', anchor, text })
        labelled.push({ label, tick })
    }
    add(0, 'start', cfg.minLabel)
    if (thresholds) thresholds.forEach((text, j) => j < count - 1 && add(bar.seamX(j), 'middle', text))
    else {
        items.forEach((item, j) => {
            const label = appendLegendSwatchLabel(rows[j].row, {
                x: bar.itemX(j) + bar.itemWidth / 2,
                y: barBottom + 4,
                dy: '0.9em',
                anchor: 'middle',
                text: item.label,
            })
            rows[j].label = label
            labelled.push({ label })
        })
    }
    add(barWidth, 'end', cfg.maxLabel)

    // never let two labels touch: those that would, go on a second row. Their tick is lengthened to reach them,
    // unless it would run through a label on a row above.
    const { rows: labelRow } = assignLabelRows(labelled.map(({ label }) => label.node()))
    const boxes = labelled.map(({ label }) => label.node().getBBox())
    labelled.forEach(({ label, tick }, k) => {
        if (!labelRow[k]) return
        const shift = labelRow[k] * (labelFontSize + 2)
        label.attr('y', parseFloat(label.attr('y')) + shift)
        if (!tick) return
        const tickX = parseFloat(tick.attr('x1'))
        const blocked = boxes.some((box, m) => labelRow[m] < labelRow[k] && tickX >= box.x - 1 && tickX <= box.x + box.width + 1)
        if (!blocked) tick.attr('y2', barBottom + tickLength + shift)
    })
    return rows
}

function normalizeColor(value) {
    const text = value?.trim()
    return color(text)?.formatRgb() ?? text
}
