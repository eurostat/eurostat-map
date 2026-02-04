import { select, create } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { easeLinear } from 'd3-ease'
import { line, area } from 'd3-shape'
import { axisBottom, axisLeft } from 'd3-axis'
import * as StatMap from '../core/stat-map'
import * as SparkLegend from '../legend/legend-spark'
import { executeForAllInsets, getRegionsSelector } from '../core/utils'
import * as StatisticalData from '../core/stat-data'

/**
 * Returns a sparkline map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'spark')

    out.sparkLineColor_ = 'black'
    out.sparkAreaColor_ = '#41afaa'
    out.sparkLineWidth_ = 30
    out.sparkLineHeight_ = 20
    out.sparkLineStrokeWidth_ = 0.4
    out.sparkLineOpacity_ = 0.6
    out.sparkType_ = 'line'
    out.sparkLineCircleRadius_ = 0
    out.sparkTooltipChart_ = {
        width: 150,
        height: 80,
        margin: { left: 40, right: 20, top: 20, bottom: 40 },
        circleRadius: 1.5,
    }
    out.sparkLineOffsets_ = { x: 0, y: 0 }

    //show sparklines only when data for all dates is complete.
    //Otherwise, consider the regions as being with no data at all.
    out.showOnlyWhenComplete_ = false
    out.sparkLineChartFunction_ = undefined

    out.sparkYScale_ = undefined //custom Y scale
    out.statSpark_ = null

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    const paramNames = [
        'sparkLineColor_',
        'showOnlyWhenComplete_',
        'sparkType_',
        'sparkLineWidth_',
        'sparkLineHeight_',
        'sparkLineStrokeWidth_',
        'sparkLineOpacity_',
        'sparkLineCircleRadius_',
        'sparkLineAreaColor_',
        'sparkTooltipChart_',
        'sparkLineChartFunction_',
        'sparkLineOffsets_',
    ]
    paramNames.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[k](config[k])
        })
    }

    // Allow users manually add sparkline data
    out.sparklineData_ = undefined
    out.sparklineData = function (dataObject) {
        const dates = Object.keys(dataObject[Object.keys(dataObject)[0]])
        out._statDates = dates

        dates.forEach((date) => {
            const statData = StatisticalData.statData()
            const perDateValues = {}

            for (const regionId in dataObject) {
                const regionValues = dataObject[regionId]
                perDateValues[regionId] = regionValues[date]
            }

            statData.setData(perDateValues)
            out.statData(date, statData)
        })

        return out
    }

    /**
     * A function to define a sparkline map easily, without repetition of information.
     * Only for eurobase data sources.
     *
     * @param {Object} config Configuration object with the following properties:
     * @param {String} config.eurostatDatasetCode - The Eurostat dataset code
     * @param {Object} [config.filters] - Filters for the Eurostat API query
     * @param {String} [config.unitText] - Optional unit text for display
     * @param {Array} config.dates - The dates/times for the sparkline
     * @param {Array} [config.labels] - Optional labels for the dates
     *
     * @example
     * .statSpark({
     *     eurostatDatasetCode: 'demo_pjan',
     *     filters: { sex: 'T', age: 'TOTAL' },
     *     unitText: 'Population',
     *     dates: ['2018', '2019', '2020', '2021', '2022', '2023'],
     *     labels: ['2018', '2019', '2020', '2021', '2022', '2023'],
     * })
     */
    out.statSpark = function (config, dates, labels) {
        // Backwards compatibility: handle old positional arguments API
        // Old API: statSpark(stat, dates, labels)
        if (dates !== undefined && Array.isArray(dates)) {
            config = {
                ...config,
                dates: dates,
                labels: labels,
            }
        }

        // Backwards compatibility: flatten nested stat object if present
        if (config.stat) {
            config = {
                ...config.stat,
                ...config,
            }
            delete config.stat
        }

        const { eurostatDatasetCode, filters, unitText, dates: configDates, labels: configLabels } = config

        // Validate required parameters
        if (!eurostatDatasetCode) {
            console.error('statSpark: eurostatDatasetCode is required')
            return out
        }
        if (!configDates || !configDates.length) {
            console.error('statSpark: dates array is required')
            return out
        }

        // Base filters (clone to avoid mutation)
        const baseFilters = filters ? { ...filters } : {}

        //store
        out._primaryDataset_ = {
            eurostatDatasetCode,
            filters: baseFilters,
            type: 'statSpark',
        }

        // Add one dataset config for each date
        for (let i = 0; i < configDates.length; i++) {
            const date = configDates[i]

            // Build stat config for this date
            const statConfig = {
                eurostatDatasetCode,
                unitText,
                filters: {
                    ...baseFilters,
                    time: date,
                },
            }

            // Register the stat
            out.stat(date, statConfig)

            // Assign label if specified
            if (configLabels && configLabels[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[date] = configLabels[i]
            }
        }

        // Set statDates
        out._statDates = configDates

        return out
    }

    /** The codes of the categories to consider for the composition. */
    out._statDates = undefined

    /**
     * Function to compute composition for region id, for each date.
     * Return an object with, for each date, its statistical value for the region
     * @param {*} id
     * @returns [{date,value}]
     */
    const getComposition = function (id) {
        let comp = [],
            sum = 0

        // Get stat value for each category and compute the sum.
        for (let i = 0; i < out._statDates.length; i++) {
            // Retrieve code and stat value
            const date = out._statDates[i]
            const s = out.statData(date).get(id)

            // Case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }

            comp.push({ date: date, value: s.value })
            sum += s.value
        }

        // Case when no data
        if (sum == 0) return undefined

        // Calculate year-on-year percentage change
        for (let i = 1; i < comp.length; i++) {
            const previousValue = comp[i - 1].value
            const currentValue = comp[i].value

            // Calculate percentage change from previous value
            comp[i].percentageChange = previousValue === 0 ? 0.001 : ((currentValue - previousValue) / previousValue) * 100
        }

        // The first data point doesn't have a previous value to compare with
        //comp[0].percentageChange = 0.001 // or you can leave it undefined or null, depending on how you want to handle it

        return comp
    }

    //@override
    out.updateClassification = function () {
        if (!out._statDates) {
            out._statDates = Object.keys(out.statData_)
            const index = out._statDates.indexOf('default')
            if (index > -1) out._statDates.splice(index, 1)
        }

        // define scales and classifiers
        out.domain = getDatasetExtent()

        out.sparkXScale_ = scaleLinear().domain([0, out._statDates.length - 1])

        const [minVal, maxVal] = out.domain

        // Determine Y scale domain based on data characteristics
        let yMin, yMax

        if (minVal >= 0) {
            // All positive values: start from 0
            yMin = 0
            yMax = maxVal
        } else if (maxVal <= 0) {
            // All negative values: end at 0
            yMin = minVal
            yMax = 0
        } else {
            // Mixed positive and negative: use symmetric range around zero
            // for better visual comparison of positive vs negative values
            const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal))
            yMin = -absMax
            yMax = absMax
        }

        // Add small padding to prevent lines from touching edges
        const padding = (yMax - yMin) * 0.05
        yMin -= padding
        yMax += padding

        out.sparkYScale_ = out.sparkYScale_ || scaleLinear().domain([yMin, yMax])

        return out
    }

    //@override
    out.updateStyle = function () {
        try {
            // apply to main map
            applyStyleToMap(out)

            // apply style to insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            return out
        } catch (e) {
            console.error('Error in sparkline styling: ' + e.message)
            console.error(e)
        }

        return out
    }

    function applyStyleToMap(map) {
        //build and assign pie charts to the regions
        //collect nuts ids from g elements. TODO: find better way of getting IDs
        let nutsIds = []

        let anchors = getSparkAnchors(map)
        anchors.attr('id', (rg) => {
            nutsIds.push(rg.properties.id)
            return 'spark_' + rg.properties.id
        })

        addSparkLinesToMap(nutsIds)
        addMouseEventsToRegions(map)
        return map
    }

    function getSparkAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return map.getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function addMouseEventsToRegions(map) {
        // set region hover function
        let regions

        if (map.gridCartogram_) {
            // For grid cartograms, attach events to the shape elements inside each cell
            regions = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        } else {
            const selector = getRegionsSelector(map)
            regions = out.svg().selectAll(selector)
        }

        regions
            .on('mouseover', function (e, rg) {
                const data = getComposition(rg.properties.id)
                if (data) {
                    const sel = select(this)
                    sel.attr('fill___', sel.style('fill'))
                    sel.style('fill', out.hoverColor_)
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                }
            })
            .on('mousemove', function (e, rg) {
                const data = getComposition(rg.properties.id)
                if (data) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                }
            })
            .on('mouseout', function () {
                const sel = select(this)
                let currentFill = sel.style('fill')
                let newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', sel.attr('fill___'))
                    if (out._tooltip) out._tooltip.mouseout()
                }
            })
    }

    function addSparkLinesToMap(ids) {
        let offsets = out.sparkLineOffsets_ || { x: 0, y: 0 }
        //fine tuning for hexagon grid
        if (out.gridCartogramShape_ === 'hexagon') {
            offsets.x -= out.sparkLineWidth_ - 4
            offsets.y -= out.sparkLineHeight_ + 4
        }
        //fine tuning for square grid
        if (out.gridCartogramShape_ === 'square') {
            offsets.y += 10
        }
        ids.forEach((nutsid) => {
            const node = out.svg().select('#spark_' + nutsid)
            const data = getComposition(nutsid)
            if (!data) return
            node.selectAll('.em-sparkline-chart').remove() //clear previous
            const g = node.append('g').attr('class', 'em-sparkline-chart').style('pointer-events', 'none')

            const offsets = out.sparkLineOffsets_ || { x: 0, y: 0 }

            let anchorX = 0
            let anchorY = 0

            if (out.gridCartogram_) {
                const bbox = node.node().getBBox()
                anchorX = bbox.width / 2
                anchorY = bbox.height / 2

                // For grid cartograms, move the chart group to be after the shape but ensure it's visible
                // The shape element (rect or hexagon path) should capture mouse events
                const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
                if (shapeEl && shapeEl.nextSibling) {
                    // Insert chart right after the shape
                    node.node().insertBefore(g.node(), shapeEl.nextSibling)
                }
                g.attr(
                    'transform',
                    `translate(
                ${anchorX + offsets.x - out.sparkLineWidth_ / 2},
                ${anchorY + offsets.y - out.sparkLineHeight_ / 2}
            )`
                )
            }
            // else: geographic map → centroid group already at (0,0)

            createSparkLineChart(g, data, out.sparkLineWidth_, out.sparkLineHeight_)
        })
    }

    function createSparkLineChart(node, data, width, height, isForTooltip = false) {
        // user override still wins
        if (out.sparkLineChartFunction_ && out.sparkLineChartFunction_ !== createSparkLineChart) {
            return out.sparkLineChartFunction_(node, data, width, height, isForTooltip)
        }

        switch (out.sparkType_) {
            case 'bar':
                return createSparkBarChart(node, data, width, height, isForTooltip)

            case 'area':
            case 'line':
            default:
                return createSparkLineOrAreaChart(node, data, width, height, isForTooltip)
        }
    }

    function createSparkLineOrAreaChart(node, data, width, height, isForTooltip) {
        // Use data length for X scale, not the global _statDates length
        const xScale = scaleLinear()
            .domain([0, data.length - 1])
            .range([0.5, width - 0.5])

        const yScale = out.sparkYScale_.range([height, 0])

        // Get the global Y domain to determine baseline behavior
        const [globalMinVal, globalMaxVal] = out.sparkYScale_.domain()

        const scaledData = data.map((d, i) => ({
            ...d,
            scaledXValue: xScale(i),
            scaledYValue: yScale(d.value),
        }))

        const zeroY = yScale(0)

        // ------------------------------------
        // Axes & zero line (tooltip only)
        // ------------------------------------
        if (isForTooltip) {
            node.append('g')
                .attr('class', 'axis-x')
                .attr('transform', `translate(0, ${height})`)
                .call(
                    axisBottom(xScale)
                        .tickValues(data.map((d, i) => i)) // Use actual data indices as tick values
                        .tickFormat((d) => data[d]?.date || '')
                )
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-65)')

            node.append('g').attr('class', 'axis-y').call(axisLeft(yScale).ticks(5))

            // Only show zero line if data spans both positive and negative values globally
            if (globalMinVal < 0 && globalMaxVal > 0) {
                node.append('line')
                    .attr('x1', 0)
                    .attr('x2', width)
                    .attr('y1', zeroY)
                    .attr('y2', zeroY)
                    .attr('stroke', '#999')
                    .attr('stroke-dasharray', '2,2')
                    .attr('stroke-width', 1)
            }
        }

        // ------------------------------------
        // AREA
        // ------------------------------------
        if (out.sparkType_ === 'area') {
            const getAreaColor = (d, i) => {
                if (typeof out.sparkAreaColor_ === 'function') {
                    return out.sparkAreaColor_(d.value, i, data)
                }
                return out.sparkAreaColor_
            }

            // Determine baseline for area chart based on GLOBAL data characteristics
            // This ensures consistent baseline across all regions
            let areaBaseline
            if (globalMinVal >= 0) {
                areaBaseline = height // bottom of chart
            } else if (globalMaxVal <= 0) {
                areaBaseline = 0 // top of chart
            } else {
                areaBaseline = zeroY // zero line
            }

            node.append('path')
                .datum(scaledData)
                .attr('fill', getAreaColor)
                .attr('opacity', out.sparkLineOpacity_)
                .attr('fill-opacity', 0.4)
                .attr(
                    'd',
                    area()
                        .x((d) => d.scaledXValue)
                        .y0(areaBaseline)
                        .y1((d) => d.scaledYValue)
                )
        }

        // ------------------------------------
        // LINE AS SEGMENTS (NEW)
        // ------------------------------------

        // Build one segment per adjacent pair
        const segments = scaledData.slice(1).map((d, i) => ({
            from: scaledData[i],
            to: d,
            index: i,
            value: d.value,
        }))

        const getSegmentColor = (seg) => {
            if (typeof out.sparkLineColor_ === 'function') {
                return out.sparkLineColor_(seg.value, seg.index, data)
            }
            return out.sparkLineColor_
        }

        const segmentLine = line()
            .x((d) => d.scaledXValue)
            .y((d) => d.scaledYValue)

        const paths = node
            .selectAll('path.spark-line-segment')
            .data(segments)
            .enter()
            .append('path')
            .attr('class', 'spark-line-segment')
            .attr('fill', 'none')
            .attr('opacity', out.sparkLineOpacity_)
            .attr('stroke-width', out.sparkLineStrokeWidth_ + 'px')
            .attr('stroke', (d) => getSegmentColor(d))
            .attr('d', (d) => segmentLine([d.from, d.to]))

        // ------------------------------------
        // Animation
        // ------------------------------------
        if (!isForTooltip) {
            const totalDuration = out.transitionDuration()
            const perSegment = totalDuration / segments.length

            paths.each(function (d, i) {
                const p = select(this)
                const L = this.getTotalLength()

                p.attr('stroke-dasharray', L)
                    .attr('stroke-dashoffset', L)
                    .transition()
                    .delay(i * perSegment)
                    .duration(perSegment)
                    .ease(easeLinear)
                    .attr('stroke-dashoffset', 0)
            })
        }
    }

    function createSparkBarChart(node, data, width, height, isForTooltip) {
        // Use data length for X scale, not the global _statDates length
        const xScale = scaleLinear()
            .domain([0, data.length - 1])
            .range([0.5, width - 0.5])
        const yScale = out.sparkYScale_.range([height, 0])

        // Get the global Y domain to determine baseline behavior
        const [globalMinVal, globalMaxVal] = out.sparkYScale_.domain()

        const barWidth = width / data.length
        const zeroY = yScale(0)

        // Calculate offset to center the bar group
        const totalBarsWidth = data.length * barWidth
        const offsetX = (width - totalBarsWidth) / 2

        // axes (tooltip only)
        if (isForTooltip) {
            node.append('g')
                .attr('class', 'axis-x')
                .attr('transform', `translate(0, ${height})`)
                .call(
                    axisBottom(xScale)
                        .tickValues(data.map((d, i) => i)) // Use actual data indices as tick values
                        .tickFormat((d) => data[d]?.date || '')
                )
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-65)')

            node.append('g').attr('class', 'axis-y').call(axisLeft(yScale).ticks(5))
        }

        // Compute color - signature: (value, index, data)
        // For individual bar coloring, use value and index
        // For uniform coloring based on trend, use data array
        const getBarColor = (d, i) => {
            if (typeof out.sparkLineColor_ === 'function') {
                return out.sparkLineColor_(d.value, i, data)
            }
            return out.sparkLineColor_
        }

        // Determine bar baseline based on GLOBAL data characteristics
        // This ensures consistent baseline across all regions
        let barBaseline
        if (globalMinVal >= 0) {
            // All data across all regions is positive: baseline at bottom
            barBaseline = height
        } else if (globalMaxVal <= 0) {
            // All data across all regions is negative: baseline at top
            barBaseline = 0
        } else {
            // Mixed positive and negative across dataset: baseline at zero
            barBaseline = zeroY
        }

        const bars = node
            .selectAll('rect.spark-bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'spark-bar')
            .attr('x', (d, i) => offsetX + i * barWidth + barWidth * 0.05) // center with small padding
            .attr('width', barWidth * 0.9)
            .attr('fill', (d, i) => getBarColor(d, i))
            .attr('opacity', out.sparkLineOpacity_)

        // Animation: start from baseline, grow to full height
        if (!isForTooltip) {
            bars.attr('y', barBaseline)
                .attr('height', 0)
                .transition()
                .duration(out.transitionDuration())
                .attr('y', (d) => {
                    if (globalMinVal >= 0) {
                        // All positive globally: bars grow upward from bottom
                        return yScale(d.value)
                    } else if (globalMaxVal <= 0) {
                        // All negative globally: bars grow downward from top
                        return 0
                    } else {
                        // Mixed globally: bars grow from zero line
                        return d.value >= 0 ? yScale(d.value) : zeroY
                    }
                })
                .attr('height', (d) => {
                    if (globalMinVal >= 0) {
                        // All positive globally
                        return height - yScale(d.value)
                    } else if (globalMaxVal <= 0) {
                        // All negative globally
                        return yScale(d.value)
                    } else {
                        // Mixed globally
                        return Math.abs(yScale(d.value) - zeroY)
                    }
                })
        } else {
            // No animation for tooltip
            bars.attr('y', (d) => {
                if (globalMinVal >= 0) {
                    return yScale(d.value)
                } else if (globalMaxVal <= 0) {
                    return 0
                } else {
                    return d.value >= 0 ? yScale(d.value) : zeroY
                }
            }).attr('height', (d) => {
                if (globalMinVal >= 0) {
                    return height - yScale(d.value)
                } else if (globalMaxVal <= 0) {
                    return yScale(d.value)
                } else {
                    return Math.abs(yScale(d.value) - zeroY)
                }
            })
        }

        // zero reference line (tooltip only, only if mixed values globally)
        if (isForTooltip && globalMinVal < 0 && globalMaxVal > 0) {
            node.append('line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', zeroY)
                .attr('y2', zeroY)
                .attr('stroke', 'gray')
                .attr('stroke-dasharray', '2,2')
                .attr('stroke-width', 1)
        }
    }

    //specific tooltip text function
    out.tooltip_.textFunction = function (region, map) {
        const buf = []

        const regionName = region.properties.na || region.properties.name || ''
        const regionId = region.properties.id
        buf.push(`
                <div class="em-tooltip-bar">
                    <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
                </div>
            `)

        const chartHeight = out.sparkTooltipChart_.height
        const chartWidth = out.sparkTooltipChart_.width
        const margin = out.sparkTooltipChart_.margin
        const data = getComposition(region.properties.id)

        if (data) {
            // Total SVG size (including margins)
            const totalWidth = chartWidth + margin.left + margin.right
            const totalHeight = chartHeight + margin.top + margin.bottom

            // Create detached div
            const container = create('div').attr('class', 'em-tooltip-chart-container')

            // Create SVG with full size
            const svg = container.append('svg').attr('class', 'em-tooltip-chart-svg').attr('width', totalWidth).attr('height', totalHeight)

            // Inner group where chart is drawn
            const g = svg.append('g').attr('class', 'em-tooltip-chart-group').attr('transform', `translate(${margin.left}, ${margin.top})`)

            // Call sparkline drawing on the inner area only
            createSparkLineChart(g, data, chartWidth, chartHeight, true)

            // Add result to tooltip buffer
            buf.push(container.node().outerHTML)
        }

        return buf.join('')
    }

    function getDatasetExtent() {
        let globalMin = +Infinity
        let globalMax = -Infinity

        const sel = getSparkAnchors(out).data()

        sel.forEach((rg) => {
            const id = rg.properties.id

            for (let i = 0; i < out._statDates.length; i++) {
                const date = out._statDates[i]
                const statData = out.statData(date)
                if (!statData) continue

                const s = statData.get(id)
                if (!s || isNaN(s.value)) continue

                globalMin = Math.min(globalMin, s.value)
                globalMax = Math.max(globalMax, s.value)
            }
        })

        if (!isFinite(globalMin) || !isFinite(globalMax)) {
            return [0, 1]
        }

        return [globalMin, globalMax]
    }

    //@override
    out.getLegendConstructor = function () {
        return SparkLegend.legend
    }

    return out
}

//build a color legend object
export const getColorLegend = function (colorFun) {
    colorFun = colorFun || interpolateYlOrRd
    return function (ecl, numberOfClasses) {
        return colorFun(ecl / (numberOfClasses - 1))
    }
}
