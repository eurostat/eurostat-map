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
            .attr('class', 'em-spike-legend-title em-size-legend-title')
            .attr('id', 'em-size-legend-title')
            .attr('x', 0)
            .attr('y', titleFontSize)
            .text(out.sizeLegend.title)

        currentY += titleFontSize + 8
    }

    // subtitle
    if (out.sizeLegend.subtitle) {
        const subtitleFontSize = getFontSizeFromClass('em-legend-subtitle')
        container
            .append('text')
            .attr('class', 'em-legend-subtitle')
            .attr('x', 0)
            .attr('y', titleFontSize + subtitleFontSize + (out.sizeLegend.title ? 2 : 0))
            .html(out.sizeLegend.subtitle)
        currentY += subtitleFontSize + 2
    }

    // Items container (centered under title). Positioned with a placeholder spacing first - the
    // real spacing is only known once each label's actual rendered width has been measured below.
    const items = container
        .append('g')
        .attr('id', 'em-spike-legend-items')
        .attr('transform', `translate(${out.boxPadding + labelFontSize},${currentY + maxSize})`)
        .attr('text-anchor', 'middle')
        .style('font-size', `${labelFontSize}px`)
        .selectAll('g')
        .data(legendValues)
        .join('g')

    // Spikes
    items
        .append('path')
        .attr('d', (d) => spike(map.classifierSize_(d)))
        .attr('fill', map.psFill_)
        .attr('fill-opacity', map.psFillOpacity_)
        .attr('stroke', map.psStroke_)
        .attr('stroke-width', map.psStrokeWidth_)

    // Labels
    const labels = items
        .append('text')
        .attr('class', 'em-legend-label em-spike-legend-label')
        .attr('dy', labelOffset)
        .text((d) => labelFormatter(d))

    // Horizontal spacing based on each label's actual rendered width (text-anchor is 'middle', so
    // a label extends roughly half its width either side of its item's x position) - a character-
    // count estimate here previously underestimated real glyph widths for some fonts/labels,
    // letting adjacent labels overlap. Measured after the labels are in the DOM so getBBox() is
    // accurate.
    let maxLabelWidth = 0
    labels.each(function () {
        const w = this.getBBox().width
        if (w > maxLabelWidth) maxLabelWidth = w
    })
    const spikeSpacing = maxLabelWidth + 16

    items.attr('transform', (d, i) => `translate(${i * spikeSpacing},0)`)
}
