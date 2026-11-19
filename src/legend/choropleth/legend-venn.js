import { pointer } from 'd3-selection'
import { executeForAllInsets, getFontSizeFromClass, getRegionsSelector } from '../../core/utils'
import { vennCircleHits } from '../../layers/choropleth/venn-utils'

export function drawVennLegend(out) {
    const layer = out.layer
    const palette = layer._vennPalette_
    if (!palette) return

    const diagram = out.lgg.append('g').attr('class', 'em-venn-legend').attr('transform', `translate(${out.getBaseX()},${out.getBaseY()})`)
    const radius = out.vennRadius
    const separation = radius * 1.3
    const labelSize = getFontSizeFromClass('em-legend-label')
    const yThird = radius + (separation * Math.sqrt(3)) / 2
    const series = layer
        .getTernaryStatCodes()
        .slice(0, 3)
        .map((key, index) => {
            const stat = layer.statData(key)
            const unit = stat.unitText()
            const label = layer.legend_?.labels?.[index] ?? stat.label_ ?? key
            const threshold = Number(layer._vennThresholds_[index].toPrecision(8)).toLocaleString(undefined, { maximumFractionDigits: 8 })
            return { index, label: `${label} ≥ ${threshold}${unit ? ' ' + unit : ''}` }
        })
    const labels = diagram
        .selectAll('text')
        .data(series)
        .join('text')
        .attr('class', 'em-legend-label')
        .text(({ label }) => label)
    if (!labels.size()) return
    const left = radius + labels.node().getBBox().width + 8
    const centres = [
        [left, radius],
        [left + separation, radius],
        [left + separation / 2, yThird],
    ]

    diagram
        .insert('g', 'text')
        .style('isolation', 'isolate')
        .selectAll('circle')
        .data(series)
        .join('circle')
        .attr('class', 'em-venn-legend-circle')
        .attr('cx', ({ index }) => centres[index][0])
        .attr('cy', ({ index }) => centres[index][1])
        .attr('r', radius)
        .attr('fill', ({ index }) => palette[1 << index])
        .style('mix-blend-mode', 'multiply')
    labels
        .attr('text-anchor', ({ index }) => ['end', 'start', 'middle'][index])
        .attr('x', ({ index }) => centres[index][0] + [-radius - 8, radius + 8, 0][index])
        .attr('y', ({ index }) => (index === 2 ? yThird + radius + labelSize + 4 : radius + labelSize / 3))

    const y = diagram.node().getBBox().height + 10
    const below = diagram.append('g').attr('class', 'em-venn-below').attr('transform', `translate(0,${y})`)
    below.append('rect').attr('width', 14).attr('height', 14).attr('fill', palette[0]).attr('stroke', '#777')
    below.append('text').attr('class', 'em-legend-label').attr('x', 20).attr('y', 11).text('Below all thresholds')

    function highlight(matches) {
        const apply = (map) =>
            map
                .svg()
                ?.selectAll(getRegionsSelector(map))
                .filter('[ecl]')
                .style('opacity', function () {
                    return matches && !matches(+this.getAttribute('ecl')) ? 0.2 : null
                })
        apply(out.map)
        if (out.map.insetTemplates_) executeForAllInsets(out.map.insetTemplates_, out.map.svgId_, apply)
    }

    diagram
        .on('mousemove', (event) => {
            if (event.target.closest('.em-venn-below') || event.target.classList.contains('em-legend-label')) return
            const [x, y] = pointer(event, diagram.node())
            const hits = vennCircleHits(centres.slice(0, series.length), radius, x, y)
            const mask = hits.reduce((value, index) => value | (1 << index), 0)
            highlight(mask ? (value) => value === mask : null)
        })
        .on('mouseleave', () => highlight(null))
    labels
        .attr('tabindex', 0)
        .style('cursor', 'pointer')
        .on('mouseenter focus', (event, { index }) => highlight((mask) => mask & (1 << index)))
        .on('blur', () => highlight(null))
    below
        .attr('tabindex', 0)
        .style('cursor', 'pointer')
        .on('mouseenter focus', () => highlight((mask) => mask === 0))
        .on('blur', () => highlight(null))
}
