import { pointer } from 'd3-selection'
import { ticks } from 'd3-array'
import { getFontSizeFromClass } from '../../core/utils'
import { vennCircleHits } from '../../layers/proportional-symbol/venn-utils'
import * as Legend from '../legend'
import { formatSizeLabel } from '../legend-utils'

export function legend(layer, config) {
    const out = Legend.legend(layer)
    Object.assign(out, { radius: 26, labels: undefined, sizeValues: undefined, interactive: true }, config)

    out.update = function () {
        out.updateConfig()
        out.updateContainer()
        if (!out.lgg.node()) return out

        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        const source = out.layer
        const series = source.vennSeries_
        if (series.length) {
            const content = out.lgg.append('g').attr('transform', `translate(${out.getBaseX()},${out.getBaseY()})`)
            drawDiagram(content, out, series)

            const scale = source.vennScale_
            if (scale) {
                const automatic = ticks(0, scale.domain()[1], 3)
                    .filter((value) => value > 0)
                    .reverse()
                const values = out.sizeValues || automatic
                if (values.length) {
                    const bounds = content.node().getBBox()
                    const size = content.append('g').attr('transform', `translate(0,${bounds.y + bounds.height + 12})`)
                    drawSizeSamples(size, scale, values, series[0].unit)
                }
            }
        }
        out.setBoxDimension()
        return out
    }

    return out
}

function drawSizeSamples(container, scale, values, unit) {
    const titleSize = getFontSizeFromClass('em-size-legend-title')
    const labelSize = getFontSizeFromClass('em-legend-label')
    const samples = values.map((value) => ({ value, radius: scale(value) })).filter(({ radius }) => radius > 0)
    if (!samples.length) return

    container
        .append('text')
        .attr('class', 'em-size-legend-title')
        .attr('y', titleSize)
        .text(unit ? `Circle area (${unit})` : 'Circle area')

    const maxRadius = Math.max(...samples.map(({ radius }) => radius))
    const baseline = titleSize + 10 + maxRadius * 2
    let x = 0
    for (const { value, radius } of samples) {
        const label = container
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('text-anchor', 'middle')
            .attr('y', baseline + labelSize + 4)
            .text(formatSizeLabel(value))
        const halfWidth = Math.max(radius, label.node().getBBox().width / 2)
        const centre = x + halfWidth
        label.attr('x', centre)
        container
            .append('circle')
            .attr('class', 'em-venn-size-circle')
            .attr('cx', centre)
            .attr('cy', baseline - radius)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('stroke', 'currentColor')
        x += 2 * halfWidth + 14
    }
}

function drawDiagram(content, out, series) {
    const radius = out.radius
    const separation = radius * 1.3
    const labelSize = getFontSizeFromClass('em-legend-label')
    const yThird = radius + (separation * Math.sqrt(3)) / 2
    const diagram = content.append('g').attr('class', 'em-venn-legend')
    const labels = diagram
        .selectAll('text')
        .data(series)
        .join('text')
        .attr('class', 'em-legend-label')
        .text(({ label, index }) => out.labels?.[index] ?? label)
    const left = radius + labels.nodes()[0].getBBox().width + 8
    const centres = [
        [left, radius],
        [left + separation, radius],
        [left + separation / 2, yThird],
    ]

    const circles = diagram
        .insert('g', 'text')
        .style('isolation', 'isolate')
        .selectAll('circle')
        .data(series)
        .join('circle')
        .attr('class', 'em-venn-legend-circle')
        .attr('cx', ({ index }) => centres[index][0])
        .attr('cy', ({ index }) => centres[index][1])
        .attr('r', radius)
        .attr('fill', ({ color }) => color)
        .attr('fill-opacity', out.layer.vennSettings_.opacity)
        .style('mix-blend-mode', 'multiply')
    labels
        .attr('text-anchor', ({ index }) => ['end', 'start', 'middle'][index])
        .attr('x', ({ index }) => centres[index][0] + [-radius - 8, radius + 8, 0][index])
        .attr('y', ({ index }) => (index === 2 ? yThird + radius + labelSize + 4 : radius + labelSize / 3))

    if (!out.interactive) return

    function highlight(indices) {
        circles.style('opacity', ({ index }) => (indices.length && !indices.includes(index) ? 0.25 : null))
        for (const symbols of out.layer.vennTargets_) {
            symbols.style('opacity', ({ index }) => (indices.length && !indices.includes(index) ? 0 : null))
        }
    }

    diagram
        .style('cursor', 'pointer')
        .on('mousemove', (event) => {
            if (event.target.classList.contains('em-legend-label')) return
            const [x, y] = pointer(event, diagram.node())
            highlight(vennCircleHits(centres.slice(0, series.length), radius, x, y))
        })
        .on('mouseleave', () => highlight([]))
    labels
        .attr('tabindex', 0)
        .on('mouseenter focus', (event, { index }) => highlight([index]))
        .on('blur', () => highlight([]))
}
