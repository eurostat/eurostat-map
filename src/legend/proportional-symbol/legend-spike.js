import { getFontSizeFromClass } from '../../core/utils'

export function buildSpikeLegend(out) {
    const map = out.map
    const spike = (length, width = map.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`
    const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator

    const maxStat = map.classifierSize_.domain()[1]
    const minStat = map.classifierSize_.domain()[0]
    const maxSize = map.classifierSize_(maxStat)

    // Determine values for the legend
    const legendValues = out.sizeLegend.values || [maxStat, minStat] // Use user-defined values or default ticks

    const fontSize = getFontSizeFromClass('em-legend-label') // Adjust font size
    const labelSpacing = fontSize - 2 // Ensure labels are just below the spikes

    const container = out._sizeLegendContainer.append('g')
        .attr('id', 'em-spike-legend')
        
    //draw size legend title
    if (out.sizeLegend.title) {
        const sizeLegendTitleFontSize = getFontSizeFromClass('em-size-legend-title')
        out.sizeLegend.titlePadding += sizeLegendTitleFontSize // add title font size to padding
        // append title to the legend
        container
            .append('text')
            .attr('class','em-legend-title em-spike-legend-title')
            .attr('id', 'em-size-legend-title')
            .attr('x', 0)
            .attr('y', sizeLegendTitleFontSize)
            .text(out.sizeLegend.title)
    }

    const itemContainer = container.append('g')
        .attr('id', 'em-spike-items')
        .attr('transform', `translate(${out.boxPadding},${out.sizeLegend.titlePadding})`)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .style('font-size', `${fontSize}px`)
        .selectAll()
        .data(legendValues) // Now uses user-defined values if provided
        .join('g')
        .attr('transform', (d, i) => `translate(${40 * i + out.boxPadding},${maxSize + 5})`) // Increase spacing

    // Append spikes
    itemContainer
        .append('path')
        .attr('fill', map.psFill_)
        .attr('fill-opacity', map.psFillOpacity_)
        .attr('stroke', map.psStroke_)
        .attr('stroke-width', map.psStrokeWidth_)
        .attr('d', (d) => spike(map.classifierSize_(d))) // Correctly maps values to spike size

    // Append labels directly below each spike
    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', labelSpacing) // Ensure text is right below spikes
        .text((d) => labelFormatter(d))
}
