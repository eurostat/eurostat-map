import { select, create } from 'd3-selection'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { line, area } from 'd3-shape'
import { extent, min, max } from 'd3-array'
import { axisBottom, axisLeft, axisRight } from 'd3-axis'
import * as StatMap from '../core/stat-map'
import * as lgch from '../legend/choropleth/legend-choropleth'
import { getRegionsSelector } from '../core/utils'
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
        width: 100,
        height: 50,
        margin: { left: 60, right: 40, top: 40, bottom: 40 },
        circleRadius: 1.5,
    }

    //show sparklines only when data for all dates is complete.
    //Otherwise, consider the regions as being with no data at all.
    out.showOnlyWhenComplete_ = false
    out.sparkLineChartFunction_ = undefined

    out.statSpark_ = null
    out.sparkHeightClassifier_ = null

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
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
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        [
            'sparkLineColor',
            'showOnlyWhenComplete',
            'sparkType',
            'sparkLineWidth',
            'sparkLineHeight',
            'sparkLineStrokeWidth',
            'sparkLineOpacity',
            'sparkLineCircleRadius_',
            'sparkLineAreaColor',
            'sparkTooltipChart_',
            'sparkLineChartFunction_',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

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
     * @param {*} stat A pattern for the stat data source
     * @param {Array} dates The dates of the composition (time parameter)
     * @param {Array} labels Optional: The labels for the dates
     */
    out.statSpark = function (stat, dates, labels) {
        //add one dataset config for each category
        stat.filters = stat.filters || {}
        for (let i = 0; i < dates.length; i++) {
            //category code
            const date = dates[i]
            stat.filters.time = date
            const sc_ = {}
            for (let key in stat) sc_[key] = stat[key]
            sc_.filters = {}
            for (let key in stat.filters) sc_.filters[key] = stat.filters[key]
            out.stat(date, sc_)

            //if specified, retrieve and assign label
            if (labels) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[date] = labels[i]
            }
        }

        //set statCodes
        out._statDates = dates

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
        //if not provided, get list of stat codes from the map stat data
        if (!out._statDates) {
            //get list of stat codes.
            out._statDates = Object.keys(out.statData_)
            //remove "default", if present
            const index = out._statDates.indexOf('default')
            if (index > -1) out._statDates.splice(index, 1)
        }

        // define size scaling function
        // Define the domain correctly for the log scale
        out.domain = getDatasetMaxMin() // Avoid 0 for log scale

        // for area charts
        out.widthClassifier_ = scaleSqrt().domain(out.domain).range([0, out.sparkLineWidth_])
        out.heightClassifier_ = scaleSqrt().domain(out.domain).range([0, out.sparkLineHeight_])

        return out
    }

    //@override
    out.updateStyle = function () {
        //build and assign pie charts to the regions
        //collect nuts ids from g elements. TODO: find better way of getting IDs
        let nutsIds = []
        let s = out.svg().selectAll('#em-prop-symbols')
        let sym = s.selectAll('g.em-centroid').attr('id', (rg) => {
            nutsIds.push(rg.properties.id)
            return 'spark_' + rg.properties.id
        })

        // set region hover function
        const selector = getRegionsSelector(out)
        let regions = out.svg().selectAll(selector)
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

        addSparkLinesToMap(nutsIds)
        return out
    }

    function addSparkLinesToMap(ids) {
        ids.forEach((nutsid) => {
            //create svg for sparkline
            // can be more than one center point for each nuts ID (e.g. Malta when included in insets)
            let node = out.svg().select('#spark_' + nutsid)
            let data = getComposition(nutsid)

            if (data) {
                createSparkLineChart(node, data, out.sparkLineWidth_, out.sparkLineHeight_)
            }
        })
    }

    function createSparkLineChart(node, data, width, height, isForTooltip = false) {
        // call custom user function to draw the sparkline
        if (out.sparkLineChartFunction_ && out.sparkLineChartFunction_ !== createSparkLineChart) {
            return out.sparkLineChartFunction_(node, data, width, height, isForTooltip)
        }

        const xScale = scaleLinear()
            .domain([0, out._statDates.length - 1])
            .range([0.5, width - 0.5])

        const minValue = min(data.map((d) => d.value)) || 0
        const maxValue = max(data.map((d) => d.value)) || 1

        const yScale = scaleLinear().domain([minValue, maxValue]).range([height, 0])

        const scaledData = data.map((d, i) => ({
            ...d,
            scaledXValue: xScale(i),
            scaledYValue: yScale(d.value),
        }))

        const zeroY = yScale(0)

        if (isForTooltip) {
            // X-axis at bottom
            node.append('g')
                .attr('class', 'axis-x')
                .attr('transform', `translate(0, ${height})`)
                .call(
                    axisBottom(xScale)
                        .ticks(out._statDates.length)
                        .tickFormat((d, i) => out._statDates[i])
                )
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-65)')

            // Y-axis with raw value labels
            node.append('g').attr('class', 'axis-y').call(axisLeft(yScale).ticks(5))

            // Horizontal zero reference line → only if min < 0 and max > 0
            if (minValue < 0 && maxValue > 0) {
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

        const lineGenerator = line()
            .x((d) => d.scaledXValue)
            .y((d) => d.scaledYValue)

        if (out.sparkType_ === 'area') {
            node.append('path')
                .datum(scaledData)
                .attr('fill', typeof out.sparkAreaColor_ === 'function' ? (d, i) => out.sparkAreaColor_(d, i) : out.sparkAreaColor_)
                .attr('stroke', 'none')
                .attr('opacity', out.sparkLineOpacity_)
                .attr('fill-opacity', 0.3)
                .attr(
                    'd',
                    area()
                        .x((d) => d.scaledXValue)
                        .y0(zeroY)
                        .y1((d) => d.scaledYValue)
                )
        }

        node.append('path')
            .datum(scaledData)
            .attr('fill', 'none')
            .attr('opacity', out.sparkLineOpacity_)
            .attr('stroke', typeof out.sparkLineColor_ === 'function' ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_)
            .attr(
                'stroke-width',
                typeof out.sparkLineStrokeWidth_ === 'function' ? (d, i) => out.sparkLineStrokeWidth_(d, i) : out.sparkLineStrokeWidth_ + 'px'
            )
            .attr('d', lineGenerator)

        node.selectAll('circle')
            .data(scaledData)
            .enter()
            .append('circle')
            .attr('cx', (d) => d.scaledXValue)
            .attr('cy', (d) => d.scaledYValue)
            .attr('r', out.sparkLineCircleRadius_)
            .attr('fill', 'red')
            .attr('stroke', 'none')
    }

    //specific tooltip text function
    out.tooltip_.textFunction = function (region, map) {
        const buf = []

        const regionName = region.properties.na
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
            const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

            // Call sparkline drawing on the inner area only
            createSparkLineChart(g, data, chartWidth, chartHeight, true)

            // Add result to tooltip buffer
            buf.push(container.node().outerHTML)
        }

        return buf.join('')
    }

    /**
     * @function getDatasetMaxMin
     * @description gets the maximum and minimum values of all dates for each region. Used to define the domain of the sparkline Y axis.
     * @returns [min,max]
     */
    function getDatasetMaxMin() {
        const maxs = []
        const sel = out.svg().selectAll('#em-prop-symbols').selectAll('g.em-centroid').data()

        sel.forEach((rg) => {
            const id = rg.properties.id
            const regionMax = getRegionMax(id)
            if (regionMax !== undefined) {
                maxs.push(regionMax)
            }
        })

        if (maxs.length === 0) {
            return [0, 1] // fallback if no data found
        }

        return extent(maxs)
    }

    /**
     * Get absolute total value of combined statistical values for a specific region. E.g total livestock
     * @param {*} id nuts region id
     */
    const getRegionMax = function (id) {
        let max = 0

        // get stat value for each date and find the max
        for (let i = 0; i < out._statDates.length; i++) {
            const date = out._statDates[i]
            const statData = out.statData(date)

            if (!statData || typeof statData.get !== 'function') continue

            const s = statData.get(id)
            if (!s || (s.value !== 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                continue
            }

            if (s.value > max) max = s.value
        }

        if (max === 0) return undefined
        return max
    }

    //@override
    out.getLegendConstructor = function () {
        //TODO define legend
        return lgch.legend
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
