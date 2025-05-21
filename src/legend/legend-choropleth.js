import { select, selectAll, create } from 'd3-selection'
import { format } from 'd3-format'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisLeft, axisBottom } from 'd3-axis'
import { max, range } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'
import { appendPatternFillLegend } from './legend-pattern-fill'

export const legend = function (map, config) {
    const out = Legend.legend(map)

    out.labelType = 'thresholds'
    out.ascending = true
    out.shapeWidth = 25
    out.shapeHeight = 20
    out.sepLineLength = out.shapeWidth
    out.tickLength = 4
    out.decimals = 0
    out.labelOffset = 3
    out.labelFormatter = null
    out.labels = null

    // Histogram config as nested object
    out.histogram = null

    out.pointOfDivergenceLabel = undefined
    out.pointOfDivergence = undefined
    out.pointOfDivergencePadding = 7
    out.divergingLineLength = undefined
    out.divergingArrowLength = undefined

    out.noData = true
    out.noDataText = 'No data'

    if (config) {
        for (let key in config) {
            if (key === 'histogram' && typeof config[key] === 'object') {
                out.histogram = {
                    orientation: 'horizontal',
                    showCounts: false,
                    showPercentages: false,
                    labelRotation: 0,
                    labelFormat: undefined,
                    ...config.histogram,
                }
            } else {
                out[key] = config[key]
            }
        }
    }

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node()) {
            const map = out.map
            const container = out.lgg

            out.makeBackgroundBox()
            if (out.title) {
                let cssFontSize = getFontSizeFromClass('em-legend-title')
                container
                    .append('text')
                    .attr('class', 'em-legend-title')
                    .attr('x', out.boxPadding)
                    .attr('y', out.boxPadding + cssFontSize)
                    .text(out.title)
            }

            if (!map.classToFillStyle()) return

            if (out.pointOfDivergenceLabel && !out.pointOfDivergence) out.pointOfDivergence = map.numberOfClasses_ / 2

            if (out.histogram) {
                createHistogramLegend()
            } else {
                if (out.labelType === 'ranges') createRangesLegend()
                else createThresholdsLegend()
            }

            const legendHeight = out.lgg.node().getBBox().height

            appendPatternFillLegend(map, out.lgg, {
                shapeWidth: out.shapeWidth,
                shapeHeight: out.shapeHeight,
                labelOffset: out.labelOffset,
                boxPadding: out.boxPadding,
                offsetY: legendHeight + out.boxPadding + 5,
            })

            out.setBoxDimension()
        }
    }

    function getThresholds() {
        const thresholds =
            map.thresholds_.length > 1
                ? map.thresholds_
                : Array.from({ length: map.numberOfClasses_ })
                      .map((_, index) => {
                          let threshold = map.classifier().invertExtent(index)[out.ascending ? 0 : 1]
                          return Math.floor(threshold * Math.pow(10, out.decimals)) / Math.pow(10, out.decimals)
                      })
                      .slice(1)
        return thresholds
    }

    function getColors() {
        return map.colors_ ? map.colors_ : Array.from({ length: map.numberOfClasses_ }).map((_, i) => map.classToFillStyle()(i, map.numberOfClasses_))
    }

    function getData() {
        return Object.values(map.statData()._data_).map((d) => d.value)
    }

    function createHistogramLegend() {
        const thresholds = getThresholds()
        const colors = getColors()
        const data = getData()
        const orientation = out.histogram.orientation || 'horizontal'
        const showCounts = out.histogram.showCounts
        const showPercentages = out.histogram.showPercentages
        const labelRotation = out.histogram.labelRotation || 0
        const labelFormat = out.histogram.labelFormat
        const labelFormatter = out.histogram.labelFormatter

        let counts = new Array(map.numberOfClasses_).fill(0)
        data.forEach((value) => {
            const classIndex = map.classifier()(value)
            if (typeof classIndex === 'number' && classIndex >= 0 && classIndex < counts.length) {
                counts[classIndex]++
            }
        })

        const reversedCounts = counts.slice().reverse()
        const total = counts.reduce((sum, d) => sum + d, 0)
        const reversedPercentages = reversedCounts.map((d) => (total > 0 ? (d / total) * 100 : 0))

        const lgg = out.lgg
        const baseY = out.boxPadding + (out.title ? getFontSizeFromClass('em-legend-title') + 38 : 30)
        const svgWidth = 300
        const svgHeight = 300
        const barGroup = lgg.append('g').attr('class', 'em-legend-histogram').attr('transform', `translate(0, ${baseY})`)

        if (orientation === 'vertical') {
            drawVerticalHistogram(barGroup)
        } else {
            drawHorizontalHistogram(barGroup)
        }

        function drawVerticalHistogram(barGroup) {
            const margin = { top: 20, right: 60, bottom: 40, left: 150 }
            const yScale = scaleBand()
                .domain(reversedCounts.map((_, i) => i))
                .range([margin.top, svgHeight - margin.bottom])
                .padding(0.1)
            const xScale = scaleLinear()
                .domain([0, max(reversedCounts)])
                .nice()
                .range([margin.left, svgWidth - margin.right])

            // Bars
            barGroup
                .selectAll('rect')
                .data(reversedCounts)
                .join('rect')
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
                        if (typeof labelFormatter === 'function') {
                            return labelFormatter(reversedPercentages[i], reversedCounts[i], i)
                        }
                        return showPercentages ? `${reversedPercentages[i].toFixed(1)}%` : reversedCounts[i]
                    })
            }

            // Axis
            barGroup
                .append('g')
                .attr('id', 'em-legend-histogram-y-axis')
                .attr('transform', `translate(${margin.left}, 0)`)
                .call(
                    axisLeft(yScale)
                        .tickSizeOuter(0)
                        .tickSize(0)
                        .tickFormat((_, i) => formatTickLabel(i))
                )
        }

        function drawHorizontalHistogram(barGroup) {
            const margin = { top: 20, right: 60, bottom: 40, left: 10 }
            const xScale = scaleBand()
                .domain(reversedCounts.map((_, i) => i))
                .range([margin.left, svgWidth - margin.right])
                .padding(0.1)

            const yScale = scaleLinear()
                .domain([0, max(reversedCounts)])
                .nice()
                .range([svgHeight - margin.bottom, margin.top])

            // Bars
            barGroup
                .selectAll('rect')
                .data(reversedCounts)
                .join('rect')
                .attr('class', 'em-legend-histogram-bar')
                .attr('x', (_, i) => xScale(i))
                .attr('y', (d) => yScale(d))
                .attr('width', xScale.bandwidth())
                .attr('height', (d) => svgHeight - margin.bottom - yScale(d))
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
                        if (typeof labelFormatter === 'function') {
                            return labelFormatter(reversedPercentages[i], reversedCounts[i], i)
                        }
                        return showPercentages ? `${reversedPercentages[i].toFixed(1)}%` : reversedCounts[i]
                    })
            }

            // Axis (only for labelType === 'thresholds')
            const axisGroup = barGroup
                .append('g')
                .attr('id', 'em-legend-histogram-x-axis')
                .attr('transform', `translate(0, ${svgHeight - margin.bottom})`)

            if (out.labelType === 'thresholds') {
                const positions = []

                for (let i = 0; i < thresholds.length; i++) {
                    const bandIndex = thresholds.length - i - 1
                    const x = xScale(bandIndex)
                    if (x !== undefined) positions.push(x + xScale.bandwidth())
                }

                const boundaryScale = scaleLinear().domain([0, svgWidth]).range([0, svgWidth])

                axisGroup.call(
                    axisBottom(boundaryScale)
                        .tickValues(positions)
                        .tickFormat((_, i) => (labelFormat ? labelFormat(thresholds[i], i) : thresholds[i]))
                        .tickSize(0)
                        .tickSizeOuter(0)
                )
            } else {
                axisGroup.call(axisBottom(xScale).tickSizeOuter(0).tickSize(0))
            }

            axisGroup
                .selectAll('text')
                .attr('class', 'em-legend-label em-tick-label')
                .attr('text-anchor', 'end')
                .attr('transform', `rotate(-${labelRotation})`)
        }

        function formatTickLabel(i) {
            if (out.labelType === 'thresholds') {
                const breakIndex = thresholds.length - i - 1
                return thresholds[breakIndex] ?? ''
            } else {
                if (i === 0) return `> ${thresholds[thresholds.length - 1]}`
                if (i === thresholds.length) return `< ${thresholds[0]}`
                return `${thresholds[thresholds.length - i - 1]} - < ${thresholds[thresholds.length - i]}`
            }
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

    function highlightRegions(map, ecl) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')
        allRegions.style('fill', 'white')
        const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    function unhighlightRegions(map) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
