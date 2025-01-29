import { select, selectAll, create } from 'd3-selection'
import { format } from 'd3-format'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisLeft } from 'd3-axis'
import { max } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object (inherit)
    const out = Legend.legend(map)

    //the order of the legend elements. Set to false to invert.
    out.ascending = true
    //the width of the legend box elements
    out.shapeWidth = 25
    //the height of the legend box elements
    out.shapeHeight = 20
    //the separation line length
    out.sepLineLength = out.shapeWidth
    //tick line length in pixels
    out.tickLength = 4
    //the number of decimal for the legend labels
    out.decimals = 0
    //the distance between the legend box elements to the corresponding text label
    out.labelOffset = 3
    //labelFormatter function
    out.labelFormatter = null
    // manually define labels
    out.labels = null

    out.barChart = undefined
    out.barChartCounts = undefined //show class count labels
    out.barChartLabelFormat = undefined // allow users to format the bar chart bin labels

    //show no data
    out.noData = true
    //no data text label
    out.noDataText = 'No data'

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        const m = out.map
        const lgg = out.lgg

        // Update legend parameters if necessary
        if (m.legend_) {
            Object.assign(out, m.legend_)
        }

        // Remove previous content
        lgg.selectAll('*').remove()

        // Draw legend background box and title if provided
        out.makeBackgroundBox()
        if (out.title) {
            let cssFontSize = getFontSizeFromClass('em-legend-title')
            lgg.append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + cssFontSize)
                .text(out.title)
        }

        if (out.barChart) {
            let thresholds =
                m.thresholds_.length > 1
                    ? m.thresholds_
                    : Array.from({ length: m.numberOfClasses_ })
                          .map((_, index) => {
                              return m.classifier().invertExtent(index)[out.ascending ? 0 : 1]
                          })
                          .slice(1) // Remove the first entry and return the rest as an array
            let colors = m.colors_
                ? m.colors_
                : Array.from({ length: m.numberOfClasses_ }).map((_, index) => {
                      return m.classToFillStyle()(index, m.numberOfClasses_)
                  })
            let data = Object.values(m.statData()._data_).map((item) => item.value)
            console.log(thresholds.length, data, colors.length)
            createBarChartLegend(thresholds, data, colors)
        } else {
            createStandardLegend()
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    function createStandardLegend() {
        const m = out.map
        const lgg = out.lgg
        // Label formatter
        const formatLabel = out.labelFormatter || format(`.${out.decimals}f`)
        let baseY = out.boxPadding
        if (out.title) baseY = baseY + getFontSizeFromClass('em-legend-title') + 8 // title size + padding
        for (let i = 0; i < m.numberOfClasses_; i++) {
            const y = baseY + i * out.shapeHeight
            const x = out.boxPadding
            const ecl = out.ascending ? m.numberOfClasses() - i - 1 : i
            const fillColor = m.classToFillStyle()(ecl, m.numberOfClasses_)

            // Append rectangle for each class
            lgg.append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', fillColor)
                .on('mouseover', function () {
                    highlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, ecl)
                    }
                })

            // Append separation line
            if (i > 0) {
                lgg.append('line')
                    .attr('class', 'em-legend-separator')
                    .attr('x1', out.boxPadding)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength)
                    .attr('y2', y)
            }

            // Append tick line
            if (i > 0) {
                lgg.append('line')
                    .attr('class', 'em-legend-tick')
                    .attr('x1', out.boxPadding + out.sepLineLength)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength + out.tickLength)
                    .attr('y2', y)
            }

            // Append label
            if (i < m.numberOfClasses() - 1) {
                lgg.append('text')
                    .attr('class', 'em-legend-label')
                    .attr('x', out.boxPadding + Math.max(out.shapeWidth, out.sepLineLength + out.tickLength) + out.labelOffset)
                    .attr('y', y + out.shapeHeight)
                    .attr('dominant-baseline', 'middle')
                    .text(out.labels ? out.labels[i] : formatLabel(m.classifier().invertExtent(ecl)[out.ascending ? 0 : 1]))
            }
        }

        // 'No data' box and label if applicable
        if (out.noData) {
            const y = baseY + m.numberOfClasses() * out.shapeHeight + out.boxPadding
            lgg.append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', out.map.noDataFillStyle_)
                .on('mouseover', function () {
                    select(this).style('fill', m.hoverColor_)
                    highlightRegions(out.map, 'nd')
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, 'nd')
                    }
                })
                .on('mouseout', function () {
                    select(this).style('fill', out.map.noDataFillStyle_)
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions)
                    }
                })

            lgg.append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dominant-baseline', 'middle')
                .text(out.noDataText)
        }
    }

    function createBarChartLegend(thresholds, data, colors) {
        const lgg = out.lgg
        let baseY = out.boxPadding + 30
        if (out.title) baseY = baseY + getFontSizeFromClass('em-legend-title') + 8 // title size + padding

        // Set up dimensions
        const svgWidth = 300
        const svgHeight = 300
        const margin = { top: 20, right: 60, bottom: 20, left: 150 } // Increased left margin

        // Calculate counts for each threshold range
        let counts = new Array(thresholds.length + 1).fill(0)
        data.forEach((value) => {
            for (let i = 0; i < thresholds.length; i++) {
                if (value < thresholds[i]) {
                    counts[i]++
                    return
                }
            }
            counts[thresholds.length]++
        })

        // Reverse the counts array for highest classes on top
        const reversedCounts = counts.slice().reverse()

        // Ensure that the number of colors matches the number of bars
        const colorCount = reversedCounts.length
        if (colors.length !== colorCount) {
            console.warn(`Mismatch between number of colors (${colors.length}) and number of bars (${colorCount})`)
        }

        // Set up scales with reversedCounts
        const yScale = scaleBand()
            .domain(reversedCounts.map((_, i) => i))
            .range([margin.top, svgHeight - margin.bottom])
            .padding(0.1)

        const xScale = scaleLinear()
            .domain([0, max(reversedCounts)])
            .nice()
            .range([margin.left, svgWidth - margin.right])

        // Create a new <g> element for the bars
        const barGroup = lgg.append('g').attr('class', 'em-legend-barchart').style('transform', 'translate(0px, 10px)') // Add a class to this group for easy reference

        // Draw bars with mouseover highlight and styling
        barGroup
            .selectAll('rect')
            .data(reversedCounts)
            .join('rect')
            .attr('y', (_, i) => yScale(i))
            .attr('x', margin.left)
            .attr('height', yScale.bandwidth())
            .attr('width', (d) => xScale(d) - margin.left)
            .attr('ecl', (_, i) => i)
            .attr('fill', (_, i) => colors[colors.length - i - 1]) // Reverse color order to match counts
            .style('cursor', 'pointer') // Set cursor to pointer
            .on('mouseover', function (_, i) {
                const sel = select(this)
                sel.style('stroke', 'black')
                const ecl = sel.attr('ecl')
                const currentIndex = parseInt(ecl, 10)
                const reversedIndex = colors.length - 1 - currentIndex // reverse
                highlightRegions(out.map, reversedIndex)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl)
                }
            })
            .on('mouseout', function (_, i) {
                const sel = select(this)
                sel.style('stroke', 'none')
                unhighlightRegions(out.map)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions)
                }
            })

        // Add count labels next to bars
        if (out.barChartCounts) {
            barGroup
                .selectAll('text.count-label')
                .data(reversedCounts)
                .join('text')
                .attr('class', 'count-label')
                .attr('x', (d) => xScale(d) + 5)
                .attr('y', (_, i) => yScale(i) + yScale.bandwidth() / 2)
                .attr('text-anchor', 'start')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '14px') // Set label font size to 14px
                .text((d) => d)
        }

        // Add Y axis with custom tick labels in reversed order at 14px
        const yAxis = barGroup
            .append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(
                axisLeft(yScale)
                    .tickSizeOuter(0)
                    .tickSize(0)
                    .tickFormat(
                        out.barChartLabelFormat
                            ? out.barChartLabelFormat
                            : (_, i) => {
                                  if (i === 0) return `> ${thresholds[thresholds.length - 1]}`
                                  if (i === thresholds.length) return `< ${thresholds[0]}`
                                  return `${thresholds[thresholds.length - i]} - < ${thresholds[thresholds.length - i - 1]}`
                              }
                    )
            )
            .selectAll('text')
            .attr('font-size', '14px') // Set Y-axis tick label font size to 14px
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Set all regions to white
        allRegions.style('fill', 'white')

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Restore each region's original color from the fill___ attribute
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    //deprecated
    out.labelDecNb = (v) => (console.warn('labelDecNb is now DEPRECATED. Please use decimals instead.'), out)

    return out
}
