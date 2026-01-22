import { getFontSizeFromClass, spaceAsThousandSeparator } from '../../core/utils'

export function buildSpikeLegend(out) {
    const map = out.map

    // SVG path for a spike
    const spike = (length, width = map.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`

    const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator

    const sizeDomain = map.classifierSize_.domain()
    const maxStat = sizeDomain[1]
    const minStat = sizeDomain[0]
    const maxSize = map.classifierSize_(maxStat)

    // Legend values (max → min by default)
    const legendValues = out.sizeLegend.values || [maxStat, minStat]

    // Typography
    const labelFontSize = getFontSizeFromClass('em-legend-label')
    const titleFontSize = out.sizeLegend.title ? getFontSizeFromClass('em-size-legend-title') : 0

    const labelOffset = labelFontSize + 2

    // Root container
    const container = out._sizeLegendContainer.append('g').attr('id', 'em-spike-legend')

    // Title
    let currentY = 0

    if (out.sizeLegend.title) {
        container
            .append('text')
            .attr('class', 'em-legend-title em-spike-legend-title')
            .attr('id', 'em-size-legend-title')
            .attr('x', 0)
            .attr('y', titleFontSize)
            .text(out.sizeLegend.title)

        currentY += titleFontSize + 8
    }

    // Items container (centered under title)
    // Horizontal spacing based on spike width and maximum label length
    // const spikeSpacing = Math.max(map.psSpikeWidth_ * 1.2, labelFontSize * 2.5)
    const formattedLabels = legendValues.map((d) => String(labelFormatter(d)))
    const maxLabelLength = Math.max(...formattedLabels.map((s) => s.length))
    const labelPixelWidth = maxLabelLength * labelFontSize * 0.45
    const spikeSpacing = labelPixelWidth + 5


    const items = container
        .append('g')
        .attr('id', 'em-spike-legend-items')
        .attr('transform', `translate(${out.boxPadding + labelFontSize},${currentY + maxSize})`)
        .attr('text-anchor', 'middle')
        .style('font-size', `${labelFontSize}px`)
        .selectAll('g')
        .data(legendValues)
        .join('g')
        .attr('transform', (d, i) => `translate(${i * spikeSpacing},0)`)

    // Spikes
    items
        .append('path')
        .attr('d', (d) => spike(map.classifierSize_(d)))
        .attr('fill', map.psFill_)
        .attr('fill-opacity', map.psFillOpacity_)
        .attr('stroke', map.psStroke_)
        .attr('stroke-width', map.psStrokeWidth_)

    // Labels
    items
        .append('text')
        .attr('class', 'em-legend-label em-spike-legend-label')
        .attr('dy', labelOffset)
        .text((d) => labelFormatter(d))
}
