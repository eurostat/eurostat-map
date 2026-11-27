import { select } from 'd3-selection'
import { getFontSizeFromClass } from '../../core/utils'
import { formatLegendValues } from '../legend-utils'
import { assignLabelRows } from '../legend-swatch'

/** The flows' own values, whose precision the labels take. */
const flowValues = (layer) => (layer.flowGraph_?.links || []).map((link) => link.value)

export function drawHorizontalFlowWidthLegend(out, baseX, baseY) {
    if (!out) return null
    // out.map is the top-level facade; strokeWidthScale is only ever set on the actual
    // flow layer, exposed here as out.layer.
    const map = out.layer || out
    if (!map || !map.strokeWidthScale) return null

    // remove previous container if any
    if (out._flowWidthContainer) out._flowWidthContainer.remove()

    //config
    const cfg = out.flowWidthLegend
    out._flowWidthContainer = out.lgg.append('g').attr('class', 'em-flow-width-legend-horizontal').attr('transform', `translate(${baseX}, ${baseY})`)

    // The layout is stacked from the top, measured as it goes: title, label rows, then the line. Nothing is placed
    // from a fixed offset, so the pieces cannot overlap whatever the title, the font or the line widths are.
    let top = 0
    if (cfg.title) {
        const title = out._flowWidthContainer
            .append('text')
            .attr('class', 'em-width-legend-title')
            .text(cfg.title || 'Flow width')
        const box = title.node().getBBox()
        top = box.y + box.height + (cfg.titlePadding ?? 8)
    }

    const x = cfg.x ?? 0
    const totalWidth = cfg.width || out.width
    const segments = cfg.segments ?? 5
    const gap = cfg.labelOffset ?? 4 // between the labels and the thickest line
    const pad = cfg.pad ?? 0

    const innerStart = x + pad
    const innerEnd = x + totalWidth - pad
    const innerWidth = Math.max(0, innerEnd - innerStart)

    // sample values (linear interpolation across domain)
    const sampleVals = []
    const max = map.maxFlowCount
    const min = map.minFlowCount
    for (let i = 0; i < segments; i++) {
        const t = segments === 1 ? 0.5 : i / (segments - 1)
        sampleVals.push(min + t * (max - min))
    }
    const values = cfg.values || sampleVals
    const format = formatLegendValues([...values, min, max], flowValues(map))

    const slabWidth = innerWidth / values.length // ← divide by count, not count-1

    // compute stroke widths using the map scale (force visible floor)
    const strokeWidths = values.map((v) => Math.max(0.5, map.strokeWidthScale(v)))
    const maxStroke = Math.max(...strokeWidths)

    const texts = out._flowWidthContainer.append('g').attr('class', 'em-flow-legend-texts')
    const lines = out._flowWidthContainer.append('g').attr('class', 'em-flow-legend-lines')

    // labels first, to know how much room they need: labels that would touch go on a second row
    const labels = values.map((val, i) => {
        const text = cfg.labels?.[i] ?? (cfg.labelFormatter ? cfg.labelFormatter(val) : format(val))
        return texts
            .append('text')
            .attr('x', innerStart + (i + 0.5) * slabWidth)
            .attr('y', 0)
            .attr('class', 'em-legend-label em-flow-legend-label em-flow-width-horizontal-label')
            .text(text)
    })
    const { rows: labelRow, count: labelRows } = assignLabelRows(labels.map((l) => l.node()))
    const box = labels[0]?.node().getBBox() || { y: 0, height: 0 }
    const rowHeight = box.height + 2
    const labelsBottom = top + labelRows * rowHeight - 2
    labels.forEach((label, i) => label.attr('y', labelsBottom - labelRow[i] * rowHeight - (box.y + box.height))) // row 0 is nearest the line

    const lineY = labelsBottom + gap + maxStroke / 2

    // baseline (visual guide)
    lines
        .append('line')
        .attr('class', 'em-flow-legend-baseline')
        .attr('x1', innerStart)
        .attr('x2', innerEnd)
        .attr('y1', lineY)
        .attr('y2', lineY)
        .attr('stroke', '#eee')
        .attr('stroke-width', 1)

    for (let i = 0; i < values.length; i++) {
        lines
            .append('line')
            .style('stroke-width', strokeWidths[i])
            .attr('x1', innerStart + i * slabWidth)
            .attr('x2', innerStart + (i + 1) * slabWidth)
            .attr('y1', lineY)
            .attr('y2', lineY)
            .style('stroke', cfg.color ?? '#000')
            .style('stroke-opacity', cfg.strokeOpacity ?? 1)
    }

    // captions for min/max aligned with baseline ends
    if (!cfg.maxMin) return
    const captionY = lineY + maxStroke / 2 + 4
    texts
        .append('text')
        .attr('x', innerStart)
        .attr('y', captionY)
        .attr('class', 'em-legend-label em-flow-legend-min-label')
        .attr('dy', '0.9em')
        .text(format(min))

    texts
        .append('text')
        .attr('x', innerEnd)
        .attr('y', captionY)
        .attr('class', 'em-legend-label em-flow-legend-max-label')
        .attr('dy', '0.9em')
        .text(format(max))
}

export function drawVerticalFlowWidthLegend(out, baseX, baseY) {
    // out.map is the top-level facade; strokeWidthScale is only ever set on the actual
    // flow layer, exposed here as out.layer.
    const map = out.layer || out
    if (!map.strokeWidthScale) return
    out._flowWidthContainer = out.lgg.append('g').attr('class', 'em-flow-width-legend').attr('transform', `translate(${baseX}, ${baseY})`)

    //config
    const cfg = out.flowWidthLegend
    const segments = cfg.segments ?? 5

    // stacked from the top, measured as it goes (see the horizontal legend): the title, then the lines
    let top = 0
    if (cfg.title) {
        const title = out._flowWidthContainer
            .append('text')
            .attr('class', 'em-width-legend-title')
            .text(cfg.title || 'Flow width')
        const box = title.node().getBBox()
        top = box.y + box.height + (cfg.titlePadding ?? 8)
    }

    // Representative values (min, mid, max or user-defined)
    const sampleVals = []
    const max = map.maxFlowCount
    const min = map.minFlowCount
    for (let i = 0; i < segments; i++) {
        const t = segments === 1 ? 0.5 : i / (segments - 1)
        sampleVals.push(min + t * (max - min))
    }
    const values = cfg.values || sampleVals
    const format = formatLegendValues(values, flowValues(map))

    const labelHeight = getFontSizeFromClass('em-legend-label') || 12
    const padding = 7 // spacing between the lines
    const x = 0

    const scale = map.strokeWidthScale
    let currentY = top
    values.forEach((val, i) => {
        const strokeWidth = scale(val)

        // the centre of this line: clear of the previous line and of its label, which is as tall as the font
        const half = strokeWidth / 2
        if (i === 0)
            currentY = top + Math.max(half, labelHeight / 2) // the first label must clear the title too
        else currentY += Math.max(scale(values[i - 1]) / 2 + half + padding, labelHeight + 2)

        let label = cfg.labelFormatter ? cfg.labelFormatter(val) : format(val)
        if (cfg.labels && cfg.labels[i]) label = cfg.labels[i] //manual override

        out._flowWidthContainer
            .append('line')
            .attr('x1', x)
            .attr('x2', x + 40)
            .attr('y1', currentY)
            .attr('y2', currentY)
            .attr('stroke', cfg.color ? cfg.color : '#6b6b6b')
            .attr('stroke-width', strokeWidth)

        out._flowWidthContainer
            .append('text')
            .attr('x', x + 50)
            .attr('y', currentY)
            .attr('dy', '0.35em')
            .attr('class', 'em-legend-label')
            .text(label)
    })
}
