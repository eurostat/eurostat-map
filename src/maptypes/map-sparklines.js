import { select, scaleLinear, scaleLog, scaleSqrt, line, extent, area, min, axisBottom, axisLeft, format } from 'd3'
import * as smap from '../core/stat-map'
import * as lgch from '../legend/legend-choropleth'

/**
 * Returns a sparkline map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = smap.statMap(config, true)

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
        statDates = dates

        return out
    }

    /** The codes of the categories to consider for the composition. */
    let statDates = undefined

    /**
     * Function to compute composition for region id, for each date.
     * Return an object with, for each date, its statistical value for the region
     * @param {*} id
     * @returns [{date,value}]
     */
    const getComposition = function (id) {
        let comp = [],
            sum = 0
        //get stat value for each category. Compute the sum.
        for (let i = 0; i < statDates.length; i++) {
            //retrieve code and stat value
            const date = statDates[i]
            const s = out.statData(date).get(id)

            //case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }
            comp.push({ date: date, value: s.value })
            sum += s.value
        }

        //case when no data
        if (sum == 0) return undefined

        return comp
    }

    //@override
    out.updateClassification = function () {
        //if not provided, get list of stat codes from the map stat data
        if (!statDates) {
            //get list of stat codes.
            statDates = Object.keys(out.statData_)
            //remove "default", if present
            const index = statDates.indexOf('default')
            if (index > -1) statDates.splice(index, 1)
        }

        // //define size scaling function
        let domain = getDatasetMaxMin()
        out.widthClassifier_ = scaleSqrt().domain(domain).range([0, out.sparkLineWidth_])
        out.heightClassifier_ = scaleSqrt().domain(domain).range([0, out.sparkLineHeight_])

        return out
    }

    //@override
    out.updateStyle = function () {
        //build and assign pie charts to the regions
        //collect nuts ids from g elements. TODO: find better way of getting IDs
        let nutsIds = []
        let s = out.svg().selectAll('#g_ps')
        let sym = s.selectAll('g.symbol').attr('id', (rg) => {
            nutsIds.push(rg.properties.id)
            return 'spark_' + rg.properties.id
        })

        // set region hover function
        let selector = out.geo_ == 'WORLD' ? 'path.worldrg' : 'path.nutsrg'
        let regions = out.svg().selectAll(selector)
        regions
            .on('mouseover', function (rg) {
                const data = getComposition(rg.properties.id)
                if (data) {
                    if (out.countriesToShow_) {
                        if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                            const sel = select(this)
                            sel.attr('fill___', sel.attr('fill'))
                            sel.attr('fill', out.nutsrgSelFillSty_)
                            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                        }
                    } else {
                        if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                    }
                }
            })
            .on('mousemove', function (rg) {
                const data = getComposition(rg.properties.id)
                if (data) {
                    if (out.countriesToShow_) {
                        if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                            if (out._tooltip) out._tooltip.mousemove()
                        }
                    } else {
                        if (out._tooltip) out._tooltip.mousemove()
                    }
                }
            })
            .on('mouseout', function () {
                const sel = select(this)
                let currentFill = sel.attr('fill')
                let newFill = sel.attr('fill___')
                if (newFill) {
                    sel.attr('fill', sel.attr('fill___'))
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
                createSparkLineChart(node, data)
            }
        })
    }

    function createSparkLineChart(node, data) {
        //define scales
        let ext = extent(data.map((v) => v.value))
        let xScale
        let yScale
        let height
        let width
        if (out.sparkType_ == 'area') {
            width = out.widthClassifier_(ext[1])
            height = out.heightClassifier_(ext[1])
            yScale = scaleLog()
                .domain(ext)
                .range([height - 0.5, 0])
            xScale = scaleLinear()
                .domain([0, statDates.length - 1])
                .range([0.5, width - 0.5])
        } else {
            width = out.sparkLineWidth_
            height = out.sparkLineHeight_
            yScale = scaleLog()
                .domain(ext)
                .range([out.sparkLineHeight_ - 0.5, 0])
            xScale = scaleLinear()
                .domain([0, statDates.length - 1])
                .range([0.5, out.sparkLineWidth_ - 0.5])
        }

        // Add the area
        if (out.sparkType_ == 'area') {
            node.append('path')
                .datum(data)
                .attr('fill', typeof out.sparkAreaColor_ == Function ? (d, i) => out.sparkAreaColor_(d, i) : out.sparkAreaColor_)
                .attr(
                    'stroke',
                    typeof out.sparkLineColor_ == Function ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_
                )
                .attr('stroke-width', out.sparkLineStrokeWidth_ + 'px')
                .attr('opacity', out.sparkLineOpacity_)
                .attr('fill-opacity', 0.3)
                .attr('stroke', 'none')
                .attr(
                    'd',
                    area()
                        .x(function (d, i) {
                            return xScale(i)
                        })
                        .y0(height)
                        .y1(function (d) {
                            return yScale(d.value)
                        })
                )
                .attr('transform', (d) => `translate(0,-${height / 2})`)
        }

        // Add the line
        node.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', typeof out.sparkLineColor_ == Function ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_)
            .attr('stroke-width', out.sparkLineStrokeWidth_ + 'px')
            .attr(
                'd',
                line()
                    .x(function (d, i) {
                        return xScale(i)
                    })
                    .y(function (d) {
                        return yScale(d.value)
                    })
            )
            .attr('transform', (d) => `translate(0,-${height / 2})`)

        // Add the dots
        node.selectAll('myCircles')
            .data(data)
            .enter()
            .append('circle')
            .attr('fill', 'red')
            .attr('stroke', 'none')
            .attr('cx', function (d, i) {
                return xScale(i)
            })
            .attr('cy', function (d) {
                return yScale(d.value)
            })
            .attr('r', out.sparkLineCircleRadius_)
            .attr('transform', (d) => `translate(0,-${height / 2})`)
    }

    /**
     * @function getDatasetMaxMin
     * @description gets the maximum and minimum values of all dates for each region. Used to define the domain of the sparkline Y axis.
     * @returns [min,max]
     */
    function getDatasetMaxMin() {
        let maxs = []
        let sel = out.svg().selectAll('#g_ps').selectAll('g.symbol').data()

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
        for (let i = 0; i < statDates.length; i++) {
            //retrieve code and stat value
            const sc = statDates[i]
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
        return lgch.legend
    }

    //specific tooltip text function
    out.tooltip_.textFunction = function (rg, map) {
        //get tooltip
        const tp = select('#tooltip_eurostat')

        //clear
        tp.html('')
        tp.selectAll('*').remove()

        //write region name
        if (rg.properties.id) {
            //name and code
            tp.append('div').html('<b>' + rg.properties.na + '</b> (' + rg.properties.id + ') <br>')
        } else {
            //region name
            tp.append('div').html('<b>' + rg.properties.na + '</b><br>')
        }

        //prepare data for sparkline chart
        let height = out.sparkTooltipChart_.height
        let width = out.sparkTooltipChart_.width
        let margin = out.sparkTooltipChart_.margin
        const data = getComposition(rg.properties.id)
        if (data) {
            let svg = tp
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            //.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")

            createTooltipChart(svg, data, width, height)
        }
    }

    function createTooltipChart(node, data, width, height) {
        //define scales
        let ext = extent(data.map((v) => v.value))
        let yScale = scaleLog()
            .domain(ext)
            .range([height - 0.5, 0])
        let xScale = scaleLinear()
            .domain([statDates[0], statDates[statDates.length - 1]])
            .range([0.5, width - 0.5])

        // Add the X Axis
        node.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(axisBottom(xScale).ticks(statDates.length).tickFormat(format('.0f')))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-65)')

        // Add the Y Axis
        let domainY = yScale.domain()
        let tickValues = [domainY[0], Math.round((domainY[0] + domainY[1]) / 2), domainY[1]]
        node.append('g')
            .attr('class', 'axis')
            .call(axisLeft(yScale).tickValues(tickValues).tickFormat(format(',.2r')))

        // Add the area
        if (out.sparkType_ == 'area') {
            node.append('path')
                .datum(data)
                .attr('fill', typeof out.sparkAreaColor_ == Function ? (d, i) => out.sparkAreaColor_(d, i) : out.sparkAreaColor_)
                .attr(
                    'stroke',
                    typeof out.sparkLineColor_ == Function ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_
                )
                .attr('stroke-width', 1)
                .attr('opacity', out.sparkLineOpacity_)
                .attr('fill-opacity', 0.3)
                .attr('stroke', 'none')
                .attr('stroke', 'none')
                .attr(
                    'd',
                    area()
                        .x(function (d, i) {
                            return xScale(d.date)
                        })
                        .y0(height)
                        .y1(function (d) {
                            return yScale(d.value)
                        })
                )
        }

        // Add the line
        node.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', typeof out.sparkLineColor_ == Function ? (d, i) => out.sparkLineColor_(d, i) : out.sparkLineColor_)
            .attr('stroke-width', 1)
            .attr(
                'd',
                line()
                    .x(function (d, i) {
                        return xScale(d.date)
                    })
                    .y(function (d) {
                        return yScale(d.value)
                    })
            )
        //.attr("transform", (d) => `translate(-${(width / 2) + xOffset},${-(height / 2) + yOffset})`)

        // Add the line
        node.selectAll('myCircles')
            .data(data)
            .enter()
            .append('circle')
            .attr('fill', 'red')
            .attr('stroke', 'none')
            .attr('cx', function (d, i) {
                return xScale(d.date)
            })
            .attr('cy', function (d) {
                return yScale(d.value)
            })
            .attr('r', out.sparkTooltipChart_.circleRadius)
        //.attr("transform", (d) => `translate(-${(width / 2) + xOffset},${-(height / 2) + yOffset})`)
    }

    return out
}

//build a color legend object
export const getColorLegend = function (colorFun) {
    colorFun = colorFun || interpolateYlOrRd
    return function (ecl, clnb) {
        return colorFun(ecl / (clnb - 1))
    }
}
