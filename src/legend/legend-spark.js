import { format } from 'd3-format'
import { scaleLinear } from 'd3-scale'
import { axisLeft, axisBottom } from 'd3-axis'
import { line, area } from 'd3-shape'
import * as Legend from './legend'

/**
 * A legend for sparkline maps.
 * Shows the Y-axis scale used across all sparkline charts,
 * with an example cell that matches the grid cartogram cells exactly.
 *
 * @param {*} map
 * @param {*} config
 */
export const legend = function (map, config) {
    // Build generic legend object for the map
    const out = Legend.legend(map)

    // Scale legend configuration
    out.scaleLegend = {
        title: null, // Title for the scale legend section
        titlePadding: 10, // Padding between title and chart
        showExampleChart: false, // Whether to show an example sparkline (averaged data)
        showMaxRegion: true, // Whether to show the region with maximum value
        exampleData: null, // Custom example data, or null to use averaged data
        tickCount: 5, // Number of ticks on Y axis
        tickFormat: null, // Custom tick format function
        showXAxis: true, // Show X axis with date labels
        xAxisRotation: -45, // Rotation angle for X axis labels
        margin: map.sparkTooltipChart_.margin, // Margins around the cell
    }

    // No data legend configuration
    out.noDataLegend = {
        show: true,
        text: 'No data',
    }

    out._scaleLegendHeight = 0
    out._maxRegionId = null

    // Override attribute values with config values
    if (config) {
        for (let key in config) {
            if (key === 'scaleLegend') {
                for (let p in out.scaleLegend) {
                    if (config.scaleLegend[p] !== undefined) {
                        out.scaleLegend[p] = config.scaleLegend[p]
                    }
                }
            } else if (key === 'noDataLegend') {
                if (config.noDataLegend === false) {
                    out.noDataLegend.show = false
                } else if (typeof config.noDataLegend === 'object') {
                    for (let p in out.noDataLegend) {
                        if (config.noDataLegend[p] !== undefined) {
                            out.noDataLegend[p] = config.noDataLegend[p]
                        }
                    }
                }
            } else if (key === 'noData') {
                // Map parent's noData property to noDataLegend.show
                out.noDataLegend.show = config.noData
            } else if (key === 'width') {
                // Map parent's width to the legend width
                out.width = config.width
            } else {
                out[key] = config[key]
            }
        }
    }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const map = out.map
        const lgg = out.lgg

        // Remove previous content
        lgg.selectAll('*').remove()

        // Draw legend background box
        out.makeBackgroundBox()

        // Titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // Initial x and y positions for the internal legend elements
        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        // Draw the scale legend
        if (map.sparkYScale_) {
            out._scaleLegendContainer = lgg.append('g').attr('class', 'em-spark-scale-legend').attr('transform', `translate(${baseX}, ${baseY})`)

            drawScaleLegend(out, out._scaleLegendContainer)
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Draws the sparkline scale legend with a cell that matches the grid cartogram exactly
     */
    function drawScaleLegend(legend, container) {
        const map = legend.map
        const config = legend.scaleLegend
        const margin = config.margin

        let y = 0

        // Draw section title if provided
        if (config.title) {
            container
                .append('text')
                .attr('class', 'em-spark-legend-title')
                .attr('x', 0)
                .attr('y', y)
                .attr('dominant-baseline', 'hanging')
                .text(config.title)
            y += legend.titleFontSize + config.titlePadding
        }

        // Get the actual sparkline dimensions from the map (same as used in cartogram)
        const sparkWidth = map.sparkLineWidth_ || 30
        const sparkHeight = map.sparkLineHeight_ || 20

        // Get original cell size from an existing grid cell if available
        const originalCellSize = getCellSizeFromMap(map) || Math.max(sparkWidth, sparkHeight) + 16

        // Calculate scale factor to make legend more readable
        // Use legend.width to determine target size, maintaining aspect ratio
        const targetWidth = legend.width - margin.left - margin.right - legend.boxPadding * 2
        const scaleFactor = Math.min(targetWidth / originalCellSize, 3) // Cap at 3x to avoid too large

        // Scaled dimensions
        const cellSize = originalCellSize * scaleFactor
        const scaledSparkWidth = sparkWidth * scaleFactor
        const scaledSparkHeight = sparkHeight * scaleFactor

        // Determine if hexagon or square
        const isHexagon = map.gridCartogramShape_ === 'hexagon'

        // Calculate sparkline position within cell (centered)
        const sparkOffsetX = (cellSize - scaledSparkWidth) / 2
        const sparkOffsetY = (cellSize - scaledSparkHeight) / 2

        // Apply same offsets as the map uses (scaled)
        const mapOffsets = map.sparkLineOffsets_ || { x: 0, y: 0 }
        const finalSparkOffsetX = sparkOffsetX + mapOffsets.x * scaleFactor
        const finalSparkOffsetY = sparkOffsetY + mapOffsets.y * scaleFactor

        // Create the cell group (matches em-grid-cell structure)
        const cellGroup = container
            .append('g')
            .attr('class', 'em-spark-legend-cell em-grid-cell')
            .attr('transform', `translate(${margin.left}, ${y + margin.top})`)

        // Draw the cell shape (matching cartogram style exactly)
        if (isHexagon) {
            const hexRadius = cellSize / Math.sqrt(3)
            cellGroup.append('path').attr('d', drawHexagon(hexRadius)).attr('class', 'em-grid-hexagon em-grid-shape')
        } else {
            // Rect should fill the entire cell area
            cellGroup
                .append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('class', 'em-grid-rect em-grid-shape')
        }

        // Get the Y scale from the map
        const yDomain = map.sparkYScale_.domain()
        const yScale = scaleLinear().domain(yDomain).range([scaledSparkHeight, 0])

        // Get X scale info (matching map-spark.js exactly, but scaled)
        const dates = map._statDates || []
        const xScale = scaleLinear()
            .domain([0, dates.length - 1])
            .range([0.5 * scaleFactor, scaledSparkWidth - 0.5 * scaleFactor])

        // Create sparkline group inside cell (matches em-sparkline-chart structure)
        const sparkGroup = cellGroup
            .append('g')
            .attr('class', 'em-sparkline-chart')
            .attr('transform', `translate(${finalSparkOffsetX}, ${finalSparkOffsetY})`)
            .style('pointer-events', 'none')

        // Draw max region sparkline if enabled
        if (config.showMaxRegion) {
            const maxRegionData = getMaxRegionData(map, dates)

            if (maxRegionData && maxRegionData.data && maxRegionData.data.length > 0) {
                drawSparklineSegments(sparkGroup, maxRegionData.data, xScale, yScale, map, scaledSparkWidth, scaledSparkHeight, scaleFactor, false)
                legend._maxRegionId = maxRegionData.id
            }
        }

        // Draw example sparkline if enabled (averaged data, shown in muted style)
        if (config.showExampleChart) {
            const exampleData = config.exampleData || generateExampleData(map, dates)

            if (exampleData && exampleData.length > 0) {
                drawSparklineSegments(sparkGroup, exampleData, xScale, yScale, map, scaledSparkWidth, scaledSparkHeight, scaleFactor, true)
            }
        }

        // Add label above cell (like grid cartogram labels) - position relative to sparkline, not cell
        if (config.showMaxRegion && legend._maxRegionId) {
            const labelX = isHexagon ? 0 : finalSparkOffsetX + scaledSparkWidth / 2
            const labelY = isHexagon ? -cellSize / 2 - 5 : finalSparkOffsetY - 5

            cellGroup
                .append('text')
                .attr('class', 'em-grid-text')
                .attr('text-anchor', 'middle')
                .attr('x', labelX)
                .attr('y', labelY)
                .style('pointer-events', 'none')
                .text(legend._maxRegionId)
        }

        // Draw Y axis to the left of the sparkline area
        const axisGroup = container
            .append('g')
            .attr('class', 'em-spark-legend-y-axis')
            .attr('transform', `translate(${margin.left + finalSparkOffsetX - 2}, ${y + margin.top + finalSparkOffsetY})`)

        const yAxis = axisLeft(yScale).ticks(config.tickCount)

        if (config.tickFormat) {
            yAxis.tickFormat(config.tickFormat)
        } else {
            // Auto-format based on domain magnitude
            const maxAbsVal = Math.max(Math.abs(yDomain[0]), Math.abs(yDomain[1]))
            if (maxAbsVal >= 1000000) {
                yAxis.tickFormat((d) => format('.1f')(d / 1000000) + 'M')
            } else if (maxAbsVal >= 1000) {
                yAxis.tickFormat((d) => format('.1f')(d / 1000) + 'K')
            } else {
                yAxis.tickFormat(format('.0f'))
            }
        }

        axisGroup.call(yAxis)

        // Draw X axis below the sparkline area (not the cell)
        if (config.showXAxis && dates.length > 0) {
            const xAxisGroup = container
                .append('g')
                .attr('class', 'em-spark-legend-x-axis')
                .attr('transform', `translate(${margin.left + finalSparkOffsetX}, ${y + margin.top + finalSparkOffsetY + scaledSparkHeight})`)

            const xAxis = axisBottom(xScale)
                .tickValues(dates.map((_, i) => i))
                .tickFormat((i) => {
                    const date = dates[i]
                    if (map.catLabels_ && map.catLabels_[date]) {
                        return map.catLabels_[date]
                    }
                    return date || ''
                })

            xAxisGroup.call(xAxis)

            // Rotate labels if specified
            if (config.xAxisRotation) {
                xAxisGroup
                    .selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', `rotate(${config.xAxisRotation})`)
            }
        }

        // Store total height for no data legend positioning
        legend._scaleLegendHeight = y + margin.top + cellSize + margin.bottom

        // Add no data legend item
        if (legend.noDataLegend.show) {
            const noDataY = legend._scaleLegendHeight + legend.noDataPadding
            const noDataGroup = container.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(0, ${noDataY})`)

            legend.appendNoDataLegend(noDataGroup, legend.noDataLegend.text, highlightNoDataRegions, unhighlightNoDataRegions)
        }
    }

    /**
     * Get the cell size from an existing grid cell in the map
     */
    function getCellSizeFromMap(map) {
        const svg = map.svg_ || map.svg()
        if (!svg) return null

        const cell = svg.select('#em-grid-container .em-grid-cell')
        if (cell.empty()) return null

        const shape = cell.select('.em-grid-shape')
        if (shape.empty()) return null

        // For rectangles, get width
        const width = shape.attr('width')
        if (width) return parseFloat(width)

        // For hexagons, calculate from path
        const pathData = shape.attr('d')
        if (pathData) {
            // Extract first coordinate to get radius
            const match = pathData.match(/M([-\d.]+),([-\d.]+)/)
            if (match) {
                const x = parseFloat(match[1])
                const y = parseFloat(match[2])
                const radius = Math.sqrt(x * x + y * y)
                return radius * Math.sqrt(3) // Convert radius to approximate cell size
            }
        }

        return null
    }

    /**
     * Draw sparkline segments matching the map's style exactly
     */
    function drawSparklineSegments(container, data, xScale, yScale, map, width, height, scaleFactor, isAverage = false) {
        const sparkType = map.sparkType_ || 'line'

        // Use map's colors (or muted for average)
        let getColor, areaColor, opacity
        if (isAverage) {
            getColor = () => '#999'
            areaColor = '#ccc'
            opacity = 0.4
        } else {
            getColor = (value, index, data) => {
                if (typeof map.sparkLineColor_ === 'function') {
                    return map.sparkLineColor_(value, index, data)
                }
                return map.sparkLineColor_ || 'black'
            }
            areaColor = typeof map.sparkAreaColor_ === 'function' ? map.sparkAreaColor_ : map.sparkAreaColor_ || '#41afaa'
            opacity = map.sparkLineOpacity_ || 0.6
        }

        // Scale the stroke width proportionally
        const strokeWidth = (map.sparkLineStrokeWidth_ || 0.4) * scaleFactor

        const scaledData = data.map((d, i) => ({
            ...d,
            scaledXValue: xScale(i),
            scaledYValue: yScale(d.value),
        }))

        const [globalMinVal, globalMaxVal] = yScale.domain()

        if (sparkType === 'bar') {
            const barWidth = width / data.length
            const zeroY = yScale(0)

            // Determine bar baseline based on global data characteristics
            let barBaseline
            if (globalMinVal >= 0) {
                barBaseline = height
            } else if (globalMaxVal <= 0) {
                barBaseline = 0
            } else {
                barBaseline = zeroY
            }

            container
                .selectAll(`rect.spark-bar${isAverage ? '-avg' : ''}`)
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'spark-bar')
                .attr('x', (d, i) => i * barWidth + barWidth * 0.05)
                .attr('width', barWidth * 0.9)
                .attr('y', (d) => {
                    if (globalMinVal >= 0) return yScale(d.value)
                    if (globalMaxVal <= 0) return 0
                    return d.value >= 0 ? yScale(d.value) : zeroY
                })
                .attr('height', (d) => {
                    if (globalMinVal >= 0) return height - yScale(d.value)
                    if (globalMaxVal <= 0) return yScale(d.value)
                    return Math.abs(yScale(d.value) - zeroY)
                })
                .attr('fill', (d, i) => getColor(d.value, i, data))
                .attr('opacity', opacity)
        } else {
            // Area chart
            if (sparkType === 'area') {
                let areaBaseline
                if (globalMinVal >= 0) {
                    areaBaseline = height
                } else if (globalMaxVal <= 0) {
                    areaBaseline = 0
                } else {
                    areaBaseline = yScale(0)
                }

                container
                    .append('path')
                    .datum(scaledData)
                    .attr('fill', areaColor)
                    .attr('opacity', opacity)
                    .attr('fill-opacity', 0.4)
                    .attr(
                        'd',
                        area()
                            .x((d) => d.scaledXValue)
                            .y0(areaBaseline)
                            .y1((d) => d.scaledYValue)
                    )
            }

            // Line segments (matching map style exactly)
            const segments = scaledData.slice(1).map((d, i) => ({
                from: scaledData[i],
                to: d,
                index: i,
                value: d.value,
            }))

            const segmentLine = line()
                .x((d) => d.scaledXValue)
                .y((d) => d.scaledYValue)

            container
                .selectAll(`path.spark-line-segment${isAverage ? '-avg' : ''}`)
                .data(segments)
                .enter()
                .append('path')
                .attr('class', 'spark-line-segment')
                .attr('fill', 'none')
                .attr('opacity', opacity)
                .attr('stroke-width', strokeWidth + 'px')
                .attr('stroke', (seg) => getColor(seg.value, seg.index, data))
                .attr('d', (seg) => segmentLine([seg.from, seg.to]))
        }
    }

    /**
     * Generates a hexagon path (matching cartograms.js exactly)
     */
    function drawHexagon(r) {
        const angle = Math.PI / 3
        return (
            Array.from({ length: 6 }, (_, i) => {
                const x = r * Math.cos(angle * i)
                const y = r * Math.sin(angle * i)
                return `${i === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ') + ' Z'
        )
    }

    /**
     * Generate example data by averaging values across all regions
     */
    function generateExampleData(map, dates) {
        if (!dates || dates.length === 0) return null

        const regionIds = getRegionIds(map)
        if (!regionIds || regionIds.length === 0) return null

        const exampleData = []

        for (const date of dates) {
            const statData = map.statData(date)
            if (!statData) continue

            let sum = 0
            let count = 0

            regionIds.forEach((id) => {
                const entry = statData.get(id)
                if (entry && entry.value !== undefined && !isNaN(entry.value)) {
                    sum += entry.value
                    count++
                }
            })

            if (count > 0) {
                exampleData.push({
                    date: date,
                    value: sum / count,
                })
            }
        }

        return exampleData.length > 0 ? exampleData : null
    }

    /**
     * Get region IDs from the map
     */
    function getRegionIds(map) {
        const ids = []

        const svg = map.svg_ || map.svg()
        if (!svg) return ids

        if (map.gridCartogram_) {
            svg.selectAll('#em-grid-container .em-grid-cell').each(function (d) {
                if (d && d.properties && d.properties.id) {
                    ids.push(d.properties.id)
                }
            })
        } else {
            const centroidsGroup = map.getCentroidsGroup ? map.getCentroidsGroup(map) : null
            if (centroidsGroup) {
                centroidsGroup.selectAll('g.em-centroid').each(function (d) {
                    if (d && d.properties && d.properties.id) {
                        ids.push(d.properties.id)
                    }
                })
            }
        }

        return ids
    }

    /**
     * Get the data series for the region with the maximum value
     */
    function getMaxRegionData(map, dates) {
        if (!dates || dates.length === 0) return null

        const regionIds = getRegionIds(map)
        if (!regionIds || regionIds.length === 0) return null

        let maxValue = -Infinity
        let maxRegionId = null

        for (const id of regionIds) {
            for (const date of dates) {
                const statData = map.statData(date)
                if (!statData) continue

                const entry = statData.get(id)
                if (entry && entry.value !== undefined && !isNaN(entry.value) && entry.value > maxValue) {
                    maxValue = entry.value
                    maxRegionId = id
                }
            }
        }

        if (!maxRegionId) return null

        const regionData = []
        for (const date of dates) {
            const statData = map.statData(date)
            if (!statData) continue

            const entry = statData.get(maxRegionId)
            if (entry && entry.value !== undefined && !isNaN(entry.value)) {
                regionData.push({
                    date: date,
                    value: entry.value,
                })
            }
        }

        return regionData.length > 0 ? { id: maxRegionId, data: regionData } : null
    }

    /**
     * Highlight regions with no data
     */
    function highlightNoDataRegions(map, code) {
        map.svg_.selectAll('.em-sparkline-chart').style('opacity', 0.2)
    }

    /**
     * Unhighlight regions - restore normal opacity
     */
    function unhighlightNoDataRegions(map) {
        map.svg_.selectAll('.em-sparkline-chart').style('opacity', 1)
    }

    return out
}
