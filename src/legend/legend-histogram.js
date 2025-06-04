import { scaleBand, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { axisLeft, axisBottom } from 'd3-axis'
import { max } from 'd3-array'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'

export const createHistogramLegend = (legend, thresholds, colors, data, labelFormatter, highlightRegions, unhighlightRegions) => {
    const orientation = legend.histogram.orientation || 'horizontal'
    const showCounts = legend.histogram.showCounts
    const showPercentages = legend.histogram.showPercentages
    const labelRotation = legend.histogram.labelRotation || 0
    const margin = legend.histogram.margin || { top: 0, right: 0, bottom: 0, left: 0 }
    const height = legend.histogram.height || 200
    const width = legend.histogram.width || 270

    let counts = new Array(legend.map.numberOfClasses_).fill(0)
    data.forEach((value) => {
        const classIndex = legend.map.classifier()(value)
        if (typeof classIndex === 'number' && classIndex >= 0 && classIndex < counts.length) {
            counts[classIndex]++
        }
    })

    const reversedCounts = counts.slice().reverse()
    const total = counts.reduce((sum, d) => sum + d, 0)
    const reversedPercentages = reversedCounts.map((d) => (total > 0 ? (d / total) * 100 : 0))
    const baseY = legend.boxPadding + (legend.title ? getFontSizeFromClass('em-legend-title') + 10 : 30)
    const barGroup = legend.lgg.append('g').attr('class', 'em-legend-histogram').attr('transform', `translate(0, ${baseY})`)

    if (orientation === 'vertical') {
        drawVerticalHistogram(barGroup)
    } else {
        drawHorizontalHistogram(barGroup)
    }

    function drawVerticalHistogram(barGroup) {
        const yScale = scaleBand()
            .domain(reversedCounts.map((_, i) => i))
            .range([margin.top, height - margin.bottom])
            .padding(0.1)
        const xScale = scaleLinear()
            .domain([0, max(reversedCounts)])
            .nice()
            .range([margin.left, width - margin.right])

        // Bars
        barGroup
            .selectAll('rect')
            .data(reversedCounts)
            .join('rect')
            .attr('class', 'em-legend-histogram-bar')
            .attr('y', (_, i) => yScale(i))
            .attr('x', margin.left)
            .attr('height', yScale.bandwidth())
            .attr('width', (d) => xScale(d) - margin.left)
            .attr('fill', (_, i) => colors[colors.length - i - 1])
            .attr('ecl', (_, i) => i)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)

        // Bar labels
        if (showCounts || showPercentages) {
            barGroup
                .selectAll('text.em-histogram-label')
                .data(reversedCounts)
                .join('text')
                .attr('class', 'em-legend-label em-histogram-label')
                .attr('x', (d) => xScale(d) + 5)
                .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2)
                .attr('alignment-baseline', 'middle')
                .text((_, i) => {
                    return showPercentages ? `${reversedPercentages[i].toFixed(1)}%` : reversedCounts[i]
                })
        }

        // Axis
        const axisGroup = barGroup.append('g').attr('id', 'em-legend-histogram-y-axis').attr('transform', `translate(${margin.left}, 0)`)

        axisGroup.call(
            axisLeft(yScale)
                .tickSizeOuter(0)
                .tickSize(0)
                .tickFormat((_, i) => (labelFormatter ? labelFormatter(thresholds[i], i) : thresholds[i]))
        )

        axisGroup.selectAll('text').attr('class', 'em-legend-label em-tick-label').attr('text-anchor', 'end')
        //.attr('transform', `rotate(-${labelRotation})`)
    }

    function drawHorizontalHistogram(barGroup) {
        const xScale = scaleBand()
            .domain(reversedCounts.map((_, i) => i))
            .range([margin.left, width - margin.right])
            .padding(0.1)

        const yScale = scaleLinear()
            .domain([0, max(reversedCounts)])
            .nice()
            .range([height - margin.bottom, margin.top])

        // Bars
        barGroup
            .selectAll('rect')
            .data(reversedCounts)
            .join('rect')
            .attr('class', 'em-legend-histogram-bar')
            .attr('x', (_, i) => xScale(i))
            .attr('y', (d) => yScale(d))
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => height - margin.bottom - yScale(d))
            .attr('fill', (_, i) => colors[colors.length - i - 1])
            .attr('ecl', (_, i) => i)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)

        // Bar labels (centered)
        if (showCounts || showPercentages) {
            barGroup
                .selectAll('text.em-histogram-label')
                .data(reversedCounts)
                .join('text')
                .attr('class', 'em-legend-label em-histogram-label')
                .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
                .attr('y', (d) => yScale(d) - 5)
                .attr('text-anchor', 'middle')
                .text((_, i) => {
                    return showPercentages ? `${reversedPercentages[i].toFixed(1)}%` : reversedCounts[i]
                })
        }

        // Axis (only for labelType === 'thresholds')
        const axisGroup = barGroup
            .append('g')
            .attr('id', 'em-legend-histogram-x-axis')
            .attr('transform', `translate(0, ${height - margin.bottom})`)

        if (legend.labelType === 'thresholds') {
            const positions = []

            for (let i = 0; i < thresholds.length; i++) {
                const bandIndex = thresholds.length - i - 1
                const x = xScale(bandIndex)
                if (x !== undefined) positions.push(x + xScale.bandwidth())
            }

            const boundaryScale = scaleLinear().domain([0, width]).range([0, width])
            axisGroup.call(
                axisBottom(boundaryScale)
                    .tickValues(positions)
                    .tickFormat((_, i) => (labelFormatter ? labelFormatter(thresholds[i], i) : thresholds[i]))
                    .tickSize(0)
                    .tickSizeOuter(0)
            )
        } else if (legend.labelType === 'ranges') {
            axisGroup.call(
                axisBottom(xScale)
                    .tickSizeOuter(0)
                    .tickSize(0)
                    .tickFormat((_, i) => (labelFormatter ? labelFormatter(thresholds[i], i) : thresholds[i]))
            )
        }

        axisGroup
            .selectAll('text')
            .attr('class', 'em-legend-label em-tick-label')
            .attr('text-anchor', 'end')
            .attr('transform', `rotate(-${labelRotation})`)
    }

    function handleMouseOver(_, i) {
        const sel = select(this).style('stroke', 'black')
        const ecl = sel.attr('ecl')
        const reversedIndex = colors.length - 1 - parseInt(ecl, 10)
        highlightRegions(map, reversedIndex)
        if (map.insetTemplates_) {
            executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, ecl)
        }
    }

    function handleMouseOut(_, i) {
        const sel = select(this).style('stroke', 'none')
        unhighlightRegions(map)
        if (map.insetTemplates_) {
            executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions)
        }
    }
}
