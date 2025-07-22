// legend-alpha.js
import { min, max } from 'd3-array'
import { spaceAsThousandSeparator } from '../../core/utils'
import { select } from 'd3-selection'
import { getChoroplethLabelFormatter } from './legend-choropleth'

/**
 * Create a legend for the opacity (alpha) channel.
 * Called only if map.opacityScale_ is defined.
 */
export function createAlphaLegend(out, baseX, baseY) {
    const map = out.map
    const alphaData = map.statData('alpha')
    if (!alphaData || !alphaData.isReady()) return
    const scale = map.opacityScale_
    // const minVal = alphaData.getMin()
    // const maxVal = alphaData.getMax()
    const minVal = scale.domain()[0]
    const maxVal = scale.domain()[1]
    const labelFormatter = getChoroplethLabelFormatter(out)

    // Container for the alpha legend
    out._alphaLegendContainer = out.lgg.append('g').attr('class', 'alpha-legend-container').attr('transform', `translate(${baseX},${baseY})`)

    const width = 120
    const height = 10
    const steps = 40
    const stepWidth = width / steps

    // Draw a simple gradient of black rectangles with opacity scaled to the data
    for (let i = 0; i < steps; i++) {
        const v = minVal + ((maxVal - minVal) * i) / steps
        out._alphaLegendContainer
            .append('rect')
            .attr('x', i * stepWidth)
            .attr('y', 0)
            .attr('width', stepWidth)
            .attr('height', height)
            .style('fill', '#000')
            .style('opacity', scale(v))
    }

    // Labels: min and max
    out._alphaLegendContainer
        .append('text')
        .attr('x', 0)
        .attr('y', height + 12)
        .attr('class', 'em-legend-label')
        .text(labelFormatter(minVal))

    out._alphaLegendContainer
        .append('text')
        .attr('x', width)
        .attr('y', height + 12)
        .attr('text-anchor', 'end')
        .attr('class', 'em-legend-label')
        .text(labelFormatter(maxVal))

    // Title centered above bar
    out._alphaLegendContainer
        .append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('class', 'em-legend-label')
        .text(alphaData.unitText?.() || 'Transparency')
}
