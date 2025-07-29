import { scaleBand, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { axisLeft, axisBottom } from 'd3-axis'
import { max } from 'd3-array'
import { executeForAllInsets, getFontSizeFromClass } from '../../core/utils'
import { getChoroplethLabelFormatter, getThresholds, unhighlightRegions, highlightRegions } from './legend-choropleth'

export const createHistogramLegend = (out, baseX, baseY) => {
    const orientation = out.histogram.orientation || 'horizontal'
    const showCounts = out.histogram.showCounts
    const showPercentages = out.histogram.showPercentages
    const labelRotation = out.histogram.labelRotation || 0
    const margin = out.histogram.margin || { top: 0, right: 0, bottom: 0, left: 0 }
    const height = out.histogram.height || 200
    const width = out.histogram.width || 270
    const numberOfClasses = out.getNumberOfClasses(out)
    const labelFormatter = out.getLabelFormatter(out)
    const colorClassifier = out.getColorClassifier(out)

    const counts = new Array(numberOfClasses).fill(0)
    const data = getData(out)
    const colors = getColors(out)
    const thresholds = getThresholds(out)

    // Count class memberships
    data.forEach((value) => {
        const classIndex = colorClassifier(value)
        if (typeof classIndex === 'number' && classIndex >= 0 && classIndex < counts.length) {
            counts[classIndex]++
        }
    })

    const total = counts.reduce((sum, d) => sum + d, 0)

    const barGroup = out.lgg.append('g').attr('class', 'em-legend-histogram').attr('transform', `translate(${baseX}, ${baseY})`)

    if (orientation === 'vertical') {
        drawVerticalHistogram(barGroup)
    } else {
        drawHorizontalHistogram(barGroup)
    }

    function drawVerticalHistogram(barGroup) {
        const reversedCounts = counts.slice().reverse()
        const reversedPercentages = reversedCounts.map((d) => (total > 0 ? (d / total) * 100 : 0))
        const reversedThresholds = thresholds.slice().reverse()
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
        // Axis (threshold boundaries, not band centers)
        const axisGroup = barGroup.append('g').attr('id', 'em-legend-histogram-y-axis').attr('transform', `translate(${margin.left},0)`)

        if (out.labelType === 'thresholds') {
            const positions = []
            for (let i = 0; i < reversedThresholds.length; i++) {
                const y = yScale(i)
                if (y !== undefined) {
                    // Move to the *bottom* edge of each band, like a class boundary
                    positions.push(y + yScale.bandwidth())
                }
            }

            const boundaryScale = scaleLinear().domain([0, height]).range([0, height])
            axisGroup.call(
                axisLeft(boundaryScale)
                    .tickValues(positions)
                    .tickFormat((_, i) => (labelFormatter ? labelFormatter(reversedThresholds[i], i) : reversedThresholds[i]))
                    .tickSize(4)
                    .tickSizeOuter(0)
            )
        } else if (out.labelType === 'ranges') {
            axisGroup.call(
                axisLeft(yScale)
                    .tickSizeOuter(0)
                    .tickSize(0)
                    .tickFormat((_, i) => (labelFormatter ? labelFormatter(reversedThresholds[i], i) : reversedThresholds[i]))
            )
        }

        axisGroup.selectAll('text').attr('class', 'em-legend-label em-tick-label').attr('text-anchor', 'end')
    }

    function drawHorizontalHistogram(barGroup) {
        // Reverse everything so lowest class is first (left)
        const reversedCounts = counts.slice().reverse()
        const reversedPercentages = reversedCounts.map((d) => (total > 0 ? (d / total) * 100 : 0))
        const reversedColors = colors.slice().reverse()

        const xScale = scaleBand()
            .domain(reversedCounts.map((_, i) => i)) // keep band indices aligned
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
            .attr('fill', (_, i) => reversedColors[i]) // no manual flipping
            .attr('ecl', (_, i) => i)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)

        // Bar labels (centered above bars)
        if (showCounts || showPercentages) {
            barGroup
                .selectAll('text.em-histogram-label')
                .data(reversedCounts)
                .join('text')
                .attr('class', 'em-legend-label em-histogram-label')
                .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
                .attr('y', (d) => yScale(d) - 5)
                .attr('text-anchor', 'middle')
                .text((d, i) => (showPercentages ? `${reversedPercentages[i].toFixed(1)}%` : d))
        }

        // Axis (only for labelType === 'thresholds')
        const axisGroup = barGroup
            .append('g')
            .attr('id', 'em-legend-histogram-x-axis')
            .attr('transform', `translate(0, ${height - margin.bottom})`)

        if (out.labelType === 'thresholds') {
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
                    .tickSize(4)
                    .tickSizeOuter(0)
            )
            axisGroup
                .selectAll('text')
                .attr('class', 'em-legend-label em-tick-label')
                .attr('text-anchor', 'end')
                .attr('dy', '0em')
                .attr('dx', '-0.45em')
                .attr('transform', `rotate(-${labelRotation})`)
        } else if (out.labelType === 'ranges') {
            axisGroup.call(
                axisBottom(xScale)
                    .tickSizeOuter(0)
                    .tickSize(0)
                    .tickFormat((_, i) => (labelFormatter ? labelFormatter(thresholds[i], i) : thresholds[i]))
            )
            axisGroup
                .selectAll('text')
                .attr('class', 'em-legend-label em-tick-label')
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .attr('dx', '-0.35em')
                .attr('transform', `rotate(-${labelRotation})`)
        }
    }

    function handleMouseOver(_, i) {
        const sel = select(this).style('stroke', 'black')
        const ecl = sel.attr('ecl')
        const reversedIndex = colors.length - 1 - parseInt(ecl, 10)
        highlightRegions(map, reversedIndex)
        if (out.map.insetTemplates_) {
            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl)
        }
    }

    function handleMouseOut(_, i) {
        const sel = select(this).style('stroke', 'none')
        unhighlightRegions(map)
        if (out.map.insetTemplates_) {
            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions)
        }
    }
}
function getColors(out) {
    const map = out.map
    return map.colors_
        ? map.colors_
        : Array.from({ length: map.numberOfClasses_ }).map((_, index) => {
              return map.classToFillStyle()(index, map.numberOfClasses_)
          })
}

function getData(out) {
    const map = out.map
    return Object.values(map.statData()._data_).map((item) => item.value)
}
