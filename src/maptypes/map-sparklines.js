import { select, create } from 'd3-selection'
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale'
import { line, area } from 'd3-shape'
import { extent, min, max } from 'd3-array'
import { axisBottom, axisLeft, axisRight } from 'd3-axis'
import { format } from 'd3-format'
import * as StatMap from '../core/stat-map'
import * as lgch from '../legend/legend-choropleth'

/**
 * Returns a sparkline map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true)

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
    out.sparkPercentageChange_ = false // show percentage change instead of raw counts

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
        'sparkPercentageChange_',
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
            'sparkPercentageChange_',
        ].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

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
        out.domain = out.sparkPercentageChange_ ? [1e-3, 10] : getDatasetMaxMin() // Avoid 0 for log scale

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
        let s = out.svg().selectAll('#g_ps')
        let sym = s.selectAll('g.em-centroid').attr('id', (rg) => {
            nutsIds.push(rg.properties.id)
            return 'spark_' + rg.properties.id
        })

        // set region hover function
        let selector = out.geo_ === 'WORLD' ? '#em-worldrg path' : '#em-nutsrg path'
        if (out.Geometries.userGeometries) selector = '#em-user-regions path' // for user-defined geometries
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

    function createSparkLineChart(node, data, w, h, isForTooltip = false) {
        // Get the extent of the whole dataset
        let ext = out.domain
        let height = out.sparkType_ === 'area' ? out.widthClassifier_(ext[1]) : h
        let width = out.sparkType_ === 'area' ? out.heightClassifier_(ext[1]) : w

        let scaledData

        // Define X scale
        let xScale = scaleLinear()
            .domain([out._statDates[0], out._statDates[out._statDates.length - 1]])
            .range([0.5, width - 0.5])

        // Precompute the scaled values for the data points
        if (out.sparkPercentageChange_) {
            const sanitizeLogValue = (value) => {
                if (value === 0) return 0.001 // Avoid zero
                return value
            }

            const centerPosition = height / 2

            // Separate positive and negative values for scaling
            const positiveData = data.filter((d) => d.percentageChange > 0).map((d) => sanitizeLogValue(d.percentageChange))
            const negativeData = data.filter((d) => d.percentageChange < 0).map((d) => sanitizeLogValue(d.percentageChange))

            // Handling positive values using a positive log scale
            const maxPositive = max(positiveData) || 1
            const minPositive = 0.0001
            const minNegative = min(negativeData) || -1

            const scaleLogPositive = scaleLog()
                .domain([minPositive, maxPositive]) // For positive values
                .range([height / 2, 0]) // Positive values above center

            const scaleLogNegative = scaleLog()
                .domain([-0.01, minNegative]) // For negative values
                .range([height / 2, height]) // Negative values below center

            //console.log(minNegative, maxPositive, positiveData)
            if (!positiveData.length || !negativeData.length) {
                console.log('no data')
            }

            // Precompute scaled Y data
            scaledData = data.map((d) => {
                d.scaledYValue =
                    d.percentageChange < 0
                        ? scaleLogNegative(sanitizeLogValue(d.percentageChange))
                        : scaleLogPositive(sanitizeLogValue(d.percentageChange))

                d.scaledXValue = xScale(d.date)

                if (isNaN(d.scaledYValue)) {
                    console.error('NaN detected in scaledValue:', d)
                    d.scaledYValue = 0.01
                }
                return d
            })

            // Draw the axis
            if (isForTooltip) {
                // Add the X Axis
                node.append('g')
                    .attr('class', 'axis')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(axisBottom(xScale).ticks(out._statDates.length).tickFormat(format('.0f')))
                    .selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', 'rotate(-65)')

                // Add the Y Axis for positive values
                const positiveTickValuesY = [1]
                const negativeTickValuesY = [-0.5]
                node.append('g')
                    .attr('class', 'y-axis-negative')
                    .attr('transform', `translate(-10, ${0})`) // Position for negative axis
                    .call(axisLeft(scaleLogNegative).tickValues(negativeTickValuesY).tickFormat(format(',.2r')))

                node.append('g')
                    .attr('class', 'y-axis-positive')
                    .attr('transform', `translate(${-10}, 0)`)
                    .call(axisLeft(scaleLogPositive).tickValues(positiveTickValuesY).tickFormat(format(',.2r')))
                    // Manually add a custom label for 0
                    .append('g')
                    .attr('class', 'tick')
                    .attr('transform', `translate(0, ${height / 2})`)
                    .append('text')
                    .attr('fill', 'currentColor')
                    .attr('x', -12)
                    .style('text-anchor', 'middle')
                    .text('0') // Custom label for small value (0.10)

                console.log(positiveTickValuesY, negativeTickValuesY)
            }
        } else {
            // Raw counts (linear scale for both positive and negative)

            const yScale = scaleLinear()
                .domain(ext)
                .range([height - 0.5, 0])

            scaledData = data.map((d) => {
                d.scaledXValue = xScale(d.date)
                d.scaledYValue = yScale(d.value)
                return d
            })

            //Draw axis
            if (isForTooltip) {
                // Add the X Axis
                node.append('g')
                    .attr('class', 'axis')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(axisBottom(xScale).ticks(out._statDates.length).tickFormat(format('.0f')))
                    .selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '.15em')
                    .attr('transform', 'rotate(-65)')

                // Add the Y Axis
                let domainY = yScale.domain()
                let tickValues = [domainY[0], ((domainY[0] + domainY[1]) / 2).toFixed(1), domainY[1]]
                node.append('g')
                    .attr('class', 'axis')
                    .call(axisLeft(yScale).tickValues(tickValues).tickFormat(format(',.2r')))
            }
        }

        const lineGenerator = line()
            .x((d, i) => d.scaledXValue)
            .y((d) => d.scaledYValue)

        // Draw the area (for area chart)
        if (out.sparkType_ === 'area') {
            node.append('path')
                .datum(data)
                .attr('fill', typeof out.sparkAreaColor_ === 'function' ? (d, i) => out.sparkAreaColor_(d, i) : out.sparkAreaColor_)
                .attr('stroke', typeof out.sparkLineColor_ === 'function' ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_)
                .attr(
                    'stroke-width',
                    typeof out.sparkLineStrokeWidth_ === 'function' ? (d, i) => out.sparkLineStrokeWidth_(d, i) : out.sparkLineStrokeWidth_ + 'px'
                )
                .attr('opacity', out.sparkLineOpacity_)
                .attr('fill-opacity', 0.3)
                .attr('stroke', 'none')
                .attr(
                    'd',
                    area()
                        .x((d, i) => d.scaledXValue)
                        .y0(height) // Baseline
                        .y1((d) => d.scaledYValue)
                )
                .attr('transform', (d) => `translate(0,-${height / 2})`)
        }

        // Draw the line
        node.append('path')
            .datum(scaledData)
            .style('fill', 'none')
            .attr('opacity', out.sparkLineOpacity_)
            .attr('stroke', typeof out.sparkLineColor_ === 'function' ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_)
            .attr(
                'stroke-width',
                typeof out.sparkLineStrokeWidth_ === 'function' ? (d, i) => out.sparkLineStrokeWidth_(d, i) : out.sparkLineStrokeWidth_ + 'px'
            )
            .attr('d', lineGenerator)
            .attr('transform', (d) => (isForTooltip ? null : `translate(0,${out.sparkPercentageChange_ ? -d[0].scaledYValue : -d[0].scaledYValue})`)) //origin of line is first data point location

        // Add the dots
        node.selectAll('myCircles')
            .data(data)
            .enter()
            .append('circle')
            .style('fill', 'red')
            .attr('stroke', 'none')
            .attr('cx', (d, i) => d.scaledXValue)
            .attr('cy', (d) => d.scaledYValue)
            .attr('r', out.sparkLineCircleRadius_)
            .attr('transform', (d) => (isForTooltip ? null : `translate(0,-${height / 2})`))
    }

    /**
     * @function getDatasetMaxMin
     * @description gets the maximum and minimum values of all dates for each region. Used to define the domain of the sparkline Y axis.
     * @returns [min,max]
     */
    function getDatasetMaxMin() {
        let maxs = []
        let sel = out.svg().selectAll('#g_ps').selectAll('g.em-centroid').data()

        sel.forEach((rg) => {
            let id = rg.properties.id
            let max = getRegionMax(id)
            if (max) {
                maxs.push(max)
            }
        })

        let minmax = extent(maxs)
        return minmax
    }

    /**
     * Get absolute total value of combined statistical values for a specific region. E.g total livestock
     * @param {*} id nuts region id
     */
    const getRegionMax = function (id) {
        let max = 0
        let s

        //get stat value for each date and find the max
        for (let i = 0; i < out._statDates.length; i++) {
            //retrieve code and stat value
            const sc = out._statDates[i]
            s = out.statData(sc).get(id)
            //case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }
            if (s.value > max) max = s.value
        }

        //case when no data
        if (max == 0) return undefined
        return max
    }

    //@override
    out.getLegendConstructor = function () {
        //TODO define legend
        return lgch.legend
    }

    //specific tooltip text function
    out.tooltip_.textFunction = function (region, map) {
        const buf = []

        // Header with region name and ID
        const regionName = region.properties.na
        const regionId = region.properties.id
        buf.push(`
            <div class="estat-vis-tooltip-bar">
                <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
            </div>
        `)

        // Prepare data for sparkline chart
        const height = out.sparkTooltipChart_.height
        const width = out.sparkTooltipChart_.width
        const margin = out.sparkTooltipChart_.margin
        const data = getComposition(region.properties.id)

        if (data) {
            // Create an SVG element detached from the document
            const container = create('div').attr('class', 'em-tooltip-chart-container')
            const svg = container
                .append('svg')
                .attr('class', 'em-tooltip-chart-svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)

            const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

            // Generate the chart within the SVG
            createSparkLineChart(g, data, width, height, true)

            // Convert the SVG node to an HTML string and add it to the buffer
            buf.push(container.node().outerHTML)
        }

        // Return the buffer as a single string
        return buf.join('')
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
