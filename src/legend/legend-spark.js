import { select, selectAll } from 'd3-selection'
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
        xAxisTickStep: 1, // show every tick by default
        margin: map.sparkTooltipChart_.margin, // Margins around the cell
        lineOpacity: 0.5,
        lineStrokeWidth: 1,
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
            out._scaleLegendContainer = lgg
                .append('g')
                .attr('class', 'em-spark-scale-legend em-grid-cell')
                .attr('transform', `translate(${baseX}, ${baseY})`)

            drawScaleLegend(out, out._scaleLegendContainer)
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    function drawScaleLegend(legend, container) {
        const map = legend.map
        const config = legend.scaleLegend
        const margin = config.margin

        const dates = map._statDates || []
        if (!dates.length) return

        // -----------------------------------
        // Aspect ratio (MATCH MAP SPARKS)
        // -----------------------------------
        const sparkWidth = map.sparkLineWidth_ || 30
        const sparkHeight = map.sparkLineHeight_ || 20
        const aspectRatio = sparkHeight / sparkWidth

        // -----------------------------------
        // Legend chart size
        // -----------------------------------
        const width = legend.width - margin.left - margin.right
        const height = width * aspectRatio

        // -----------------------------------
        // Scales
        // -----------------------------------
        const xScale = scaleLinear()
            .domain([0, dates.length - 1])
            .range([0, width])

        const yScale = scaleLinear().domain(map.sparkYScale_.domain()).range([height, 0])

        // -----------------------------------
        // Root group
        // -----------------------------------
        const g = container.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

        // -----------------------------------
        // Axes
        // -----------------------------------
        // Y AXIS
        g.append('g').attr('class', 'em-spark-legend-y-axis').call(axisLeft(yScale).ticks(config.tickCount))

        // X AXIS
        const step = Math.max(1, config.xAxisTickStep || 1)
        const xTickValues = dates.map((_, i) => i).filter((i) => i % step === 0)
        g.append('g')
            .attr('class', 'em-spark-legend-x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(
                axisBottom(xScale)
                    .tickValues(xTickValues)
                    .tickFormat((i) => {
                        const d = dates[i]
                        return map.catLabels_?.[d] || d
                    })
            )
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', `rotate(${config.xAxisRotation || -45})`)

        // -----------------------------------
        // Collect ALL region series (WITH ID)
        // -----------------------------------
        const regionIds = getRegionIds(map)

        const allSeries = regionIds
            .map((id) => {
                const series = []

                for (let i = 0; i < dates.length; i++) {
                    const statData = map.statData(dates[i])
                    if (!statData) continue

                    const s = statData.get(id)
                    if (s && s.value != null && !isNaN(s.value)) {
                        series.push({
                            x: i,
                            y: s.value,
                        })
                    }
                }

                return series.length ? { id, series } : null
            })
            .filter(Boolean)

        // -----------------------------------
        // Line generator
        // -----------------------------------
        const lineGen = line()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y))

        // -----------------------------------
        // Draw ALL lines
        // -----------------------------------
        const seriesGroup = g.append('g').attr('class', 'em-spark-legend-series')

        const paths = seriesGroup
            .selectAll('path')
            .data(allSeries)
            .enter()
            .append('path')
            .attr('d', (d) => lineGen(d.series))
            .attr('fill', 'none')
            .attr('stroke', map.sparkLineColor_ || '#000')
            .attr('stroke-width', config.lineStrokeWidth || 1)
            .attr('opacity', config.lineOpacity)
            .style('cursor', 'pointer')

        // -----------------------------------
        // TOOLTIP + HOVER LOGIC
        // -----------------------------------
        paths
            .on('mouseover', function (e, d) {
                // fade others
                paths.attr('opacity', 0.1).attr('stroke-width', 0.6)

                // highlight hovered
                select(this).attr('opacity', 1).attr('stroke-width', 1.4).raise()

                // tooltip
                if (map._tooltip) {
                    map._tooltip.mouseover(`<b>${d.id}</b>`)
                    map._tooltip.mousemove(e)
                }
            })
            .on('mousemove', function (e) {
                if (map._tooltip) {
                    map._tooltip.mousemove(e)
                }
            })
            .on('mouseout', function () {
                // reset styles
                paths.attr('opacity', config.lineOpacity).attr('stroke-width', config.lineStrokeWidth)

                if (map._tooltip) {
                    map._tooltip.mouseout()
                }
            })

        // -----------------------------------
        // Height bookkeeping
        // -----------------------------------
        legend._scaleLegendHeight = margin.top + height + margin.bottom
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

    return out
}
