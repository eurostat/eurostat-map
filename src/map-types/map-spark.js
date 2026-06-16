import { select, create } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { easeLinear } from 'd3-ease'
import { line, area } from 'd3-shape'
import { axisBottom, axisLeft } from 'd3-axis'
import { createStatMap } from '../core/stat-map'
import * as SparkLegend from '../legend/legend-spark.js'
import { executeForAllInsets, getRegionsSelector } from '../core/utils'
import { getGridCartogramChartOffset } from '../core/cartograms'
import * as StatisticalData from '../core/stat-data'
import { buildGetterSetters, applyConfigValues } from './composition/composition-map'
import { getCentroidsGroup } from '../core/geo/centroids'
//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../types/map-types/spark/SparkMapConfig').SparkMapConfig} SparkMapConfig */
/** @typedef {import('../types/map-types/spark/SparkMap').SparkMap} SparkMap */

/**
 * Returns a sparkline map.
 *
 * Each region displays a small line, area, or bar chart of a statistical
 * value over time. Unlike the composition maps (pie/waffle/bar/stripe),
 * the data model here is temporal — a sequence of dated values per region —
 * rather than a set of simultaneously measured categories.
 *
 * @param {SparkMapConfig} [config]
 * @returns {SparkMap}
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'spark')

    // ── Config defaults ──────────────────────────────────────────────────────

    out.sparkLineColor_ = 'black'
    out.sparkAreaColor_ = '#41afaa'
    out.sparkLineWidth_ = 30
    out.sparkLineHeight_ = 20
    out.sparkLineStrokeWidth_ = 0.4
    out.sparkLineOpacity_ = 0.6
    out.sparkType_ = 'line' // 'line' | 'area' | 'bar'
    out.sparkLineCircleRadius_ = 0
    out.sparkTooltipChart_ = {
        width: 150,
        height: 80,
        margin: { left: 40, right: 20, top: 10, bottom: 40 },
        circleRadius: 1.5,
    }
    out.sparkLineOffsets_ = { x: 0, y: 0 }
    out.showOnlyWhenComplete_ = false
    out.sparkLineChartFunction_ = undefined
    out.sparkYScale_ = undefined // override the auto-computed Y scale
    out.statSpark_ = null

    // Internal — dates replace "categories" for this map type
    out._statDates = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────

    buildGetterSetters(out, [
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
    ])

    applyConfigValues(out, config, [
        'sparkLineColor',
        'showOnlyWhenComplete',
        'sparkType',
        'sparkLineWidth',
        'sparkLineHeight',
        'sparkLineStrokeWidth',
        'sparkLineOpacity',
        'sparkLineCircleRadius',
        'sparkLineAreaColor',
        'sparkTooltipChart',
        'sparkLineChartFunction',
        'sparkLineOffsets',
    ])

    // ── Manual data loader ───────────────────────────────────────────────────

    /**
     * Load sparkline data from a pre-built object instead of Eurostat API.
     *
     * @param {Object} dataObject - { regionId: { date: value, ... }, ... }
     */
    out.sparklineData = function (dataObject) {
        const dates = Object.keys(dataObject[Object.keys(dataObject)[0]])
        out._statDates = dates

        dates.forEach((date) => {
            const statData = StatisticalData.statData()
            const perDateValues = {}
            for (const regionId in dataObject) {
                perDateValues[regionId] = dataObject[regionId][date]
            }
            statData.setData(perDateValues)
            out.statData(date, statData)
        })

        return out
    }

    // ── statSpark config method ──────────────────────────────────────────────

    /**
     * Configure the sparkline map from a single config object.
     * Registers one stat dataset per date against the Eurostat API.
     *
     * @param {Object} config
     * @param {String} config.eurostatDatasetCode
     * @param {Object} [config.filters]
     * @param {String} [config.unitText]
     * @param {Function} [config.transform] - Optional transform(value) applied after data loads
     * @param {Array}  config.dates - Time values to query (e.g. ['2018','2019',...])
     * @param {Array}  [config.labels] - Optional display labels for each date
     *
     * @example
     * .statSpark({
     *   eurostatDatasetCode: 'demo_pjan',
     *   filters: { sex: 'T', age: 'TOTAL' },
     *   unitText: 'Population',
     *   dates: ['2018', '2019', '2020', '2021', '2022', '2023'],
     * })
     */
    out.statSpark = function (config) {
        const { eurostatDatasetCode, customData, filters, unitText, transform, dates, labels } = config

        // ── Custom Data Path ─────────────────────────────────────────────────
        if (customData && !eurostatDatasetCode) {
            const resolvedDates = dates?.length ? dates : Object.keys(customData[Object.keys(customData)[0]] || {})

            if (!resolvedDates.length) {
                console.error('statSpark: dates array or customData with date keys is required')
                return out
            }

            resolvedDates.forEach((date, i) => {
                if (labels?.[i]) {
                    out.catLabels_ = out.catLabels_ || {}
                    out.catLabels_[date] = labels[i]
                }
            })

            return out.sparklineData(customData)
        }

        // ── Eurostat Data Path ────────────────────────────────────────────────
        if (!eurostatDatasetCode) {
            console.error('statSpark: eurostatDatasetCode is required')
            return out
        }
        if (!dates?.length) {
            console.error('statSpark: dates array is required')
            return out
        }

        const baseFilters = filters ? { ...filters } : {}

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i]
            out.stat(date, { eurostatDatasetCode, unitText, transform, filters: { ...baseFilters, time: date } })

            if (labels?.[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[date] = labels[i]
            }
        }

        out._statDates = dates
        return out
    }

    // ── Data helpers ─────────────────────────────────────────────────────────

    /**
     * Get the time-series values for a region.
     * Returns [{date, value, percentageChange?}] or undefined when no data.
     *
     * Unlike the composition maps, this returns an array (one entry per date)
     * rather than a proportion object, because the temporal sequence matters
     * for rendering the sparkline correctly.
     *
     * @param {string} id - Region ID
     * @returns {Array|undefined}
     */
    const getSparkData = function (id) {
        const comp = []
        let sum = 0

        for (let i = 0; i < out._statDates.length; i++) {
            const date = out._statDates[i]
            const s = out.statData(date).get(id)

            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }

            comp.push({ date, value: s.value })
            sum += s.value
        }

        if (sum == 0) return undefined

        // Annotate with year-on-year percentage change
        for (let i = 1; i < comp.length; i++) {
            const prev = comp[i - 1].value
            comp[i].percentageChange = prev === 0 ? 0.001 : ((comp[i].value - prev) / prev) * 100
        }

        return comp
    }

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        if (!out._statDates) {
            out._statDates = Object.keys(out.statData_)
            const index = out._statDates.indexOf('default')
            if (index > -1) out._statDates.splice(index, 1)
        }

        out.domain = getDatasetExtent()
        out.sparkXScale_ = scaleLinear().domain([0, out._statDates.length - 1])

        const [minVal, maxVal] = out.domain
        let yMin, yMax

        if (minVal >= 0) {
            yMin = 0
            yMax = maxVal
        } else if (maxVal <= 0) {
            yMin = minVal
            yMax = 0
        } else {
            const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal))
            yMin = -absMax
            yMax = absMax
        }

        // Small edge padding
        const padding = (yMax - yMin) * 0.05
        yMin -= padding
        yMax += padding

        out.sparkYScale_ = out.sparkYScale_ || scaleLinear().domain([yMin, yMax])

        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        try {
            applyStyleToMap(out)

            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }

            return out
        } catch (e) {
            console.error('Error in sparkline styling: ' + e.message, e)
        }
        return out
    }

    function getSparkAnchors(map) {
        if (map.gridCartogram_) {
            return map.svg().selectAll('#em-grid-container .em-grid-cell')
        }
        return getCentroidsGroup(map).selectAll('g.em-centroid')
    }

    function applyStyleToMap(map) {
        const nutsIds = []
        getSparkAnchors(map).attr('id', (rg) => {
            nutsIds.push(rg.properties.id)
            return 'spark_' + rg.properties.id
        })
        addSparkLinesToMap(nutsIds)
        addMouseEventsToRegions(map)
        return map
    }

    // ── Mouse events ─────────────────────────────────────────────────────────
    //
    // Sparkline mouse events intentionally differ from the shared addMouseEventsToRegions:
    // hover and tooltip are suppressed for regions that have no data at all, rather than
    // showing a "no data" message. This matches the original behaviour and avoids misleading
    // interactions on regions with no sparkline drawn.

    function addMouseEventsToRegions(map) {
        let regions
        if (map.gridCartogram_) {
            regions = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
        } else {
            regions = out.svg().selectAll(getRegionsSelector(map))
        }

        // In mixed-NUTS views, upper layers with no stat values can sit above data-bearing
        // layers and swallow hover events. Disable pointer events on no-data regions so
        // the cursor can reach the underlying region that has sparkline data.
        regions.style('pointer-events', function (d) {
            const id = d?.properties?.id
            return id && getSparkData(id) ? null : 'none'
        })

        regions
            .on('mouseover', function (e, rg) {
                if (!getSparkData(rg.properties.id)) return
                const sel = select(this)
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            .on('mousemove', function (e, rg) {
                if (!getSparkData(rg.properties.id)) return
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function () {
                const sel = select(this)
                const prevFill = sel.attr('fill___')
                if (prevFill) {
                    sel.style('fill', prevFill)
                    if (out._tooltip) out._tooltip.mouseout()
                }
            })
    }

    // ── Sparkline rendering ──────────────────────────────────────────────────

    function addSparkLinesToMap(ids) {
        const offsets = { ...(out.sparkLineOffsets_ || { x: 0, y: 0 }) }
        const sharedOffset = getGridCartogramChartOffset(out)
        offsets.x += sharedOffset.x
        offsets.y += sharedOffset.y

        if (out.gridCartogramSettings_.shape === 'hexagon') {
            offsets.x -= out.sparkLineWidth_ - 4
            offsets.y -= out.sparkLineHeight_ + 4
        }
        if (out.gridCartogramSettings_.shape === 'square') {
            offsets.y += 10
        }

        ids.forEach((nutsid) => {
            const node = out.svg().select('#spark_' + nutsid)
            const data = getSparkData(nutsid)
            if (!data) return

            node.selectAll('.em-sparkline-chart').remove()

            const g = node.append('g').attr('class', 'em-sparkline-chart').style('pointer-events', 'none')

            if (out.gridCartogram_) {
                const bbox = node.node().getBBox()
                const anchorX = bbox.width / 2
                const anchorY = bbox.height / 2

                const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
                if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)

                g.attr(
                    'transform',
                    `translate(
                    ${anchorX + offsets.x - out.sparkLineWidth_ / 2},
                    ${anchorY + offsets.y - out.sparkLineHeight_ / 2}
                )`
                )
            } else {
                // Non-grid anchors are centroid groups already translated to region centers.
                // Place charts relative to centroid and allow x/y nudging via sparkLineOffsets.
                g.attr('transform', `translate(${offsets.x - out.sparkLineWidth_ / 2}, ${offsets.y - out.sparkLineHeight_ / 2})`)
            }

            createSparkLineChart(g, data, out.sparkLineWidth_, out.sparkLineHeight_)
        })
    }

    function createSparkLineChart(node, data, width, height, isForTooltip = false) {
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
        const xScale = scaleLinear()
            .domain([0, data.length - 1])
            .range([0.5, width - 0.5])
        const yScale = out.sparkYScale_.range([height, 0])
        const [globalMinVal, globalMaxVal] = out.sparkYScale_.domain()
        const zeroY = yScale(0)

        const scaledData = data.map((d, i) => ({
            ...d,
            scaledXValue: xScale(i),
            scaledYValue: yScale(d.value),
        }))

        // Axes + zero line (tooltip only)
        if (isForTooltip) {
            node.append('g')
                .attr('class', 'axis-x')
                .attr('transform', `translate(0, ${height})`)
                .call(
                    axisBottom(xScale)
                        .tickValues(data.map((d, i) => i))
                        .tickFormat((d) => data[d]?.date || '')
                )
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-65)')

            node.append('g').attr('class', 'axis-y').call(axisLeft(yScale).ticks(5))

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

        // Area fill
        if (out.sparkType_ === 'area') {
            const getAreaColor = (d, i) => (typeof out.sparkAreaColor_ === 'function' ? out.sparkAreaColor_(d.value, i, data) : out.sparkAreaColor_)

            let areaBaseline = globalMinVal >= 0 ? height : globalMaxVal <= 0 ? 0 : zeroY

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

        // Line segments (one per adjacent pair for per-segment colouring)
        const segments = scaledData.slice(1).map((d, i) => ({ from: scaledData[i], to: d, index: i, value: d.value }))

        const getSegmentColor = (seg) =>
            typeof out.sparkLineColor_ === 'function' && seg ? out.sparkLineColor_(seg.value, seg.index, data) : out.sparkLineColor_

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
            .attr('data-spark-color', (d) => getSegmentColor(d))
            .attr('d', (d) => segmentLine([d.from, d.to]))

        // Animate on map (not in tooltip)
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
        const xScale = scaleLinear()
            .domain([0, data.length - 1])
            .range([0.5, width - 0.5])
        const yScale = out.sparkYScale_.range([height, 0])
        const [globalMinVal, globalMaxVal] = out.sparkYScale_.domain()
        const barWidth = width / data.length
        const zeroY = yScale(0)
        const offsetX = (width - data.length * barWidth) / 2

        if (isForTooltip) {
            node.append('g')
                .attr('class', 'axis-x')
                .attr('transform', `translate(0, ${height})`)
                .call(
                    axisBottom(xScale)
                        .tickValues(data.map((d, i) => i))
                        .tickFormat((d) => data[d]?.date || '')
                )
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-65)')

            node.append('g').attr('class', 'axis-y').call(axisLeft(yScale).ticks(5))
        }

        const getBarColor = (d, i) => (typeof out.sparkLineColor_ === 'function' ? out.sparkLineColor_(d.value, i, data) : out.sparkLineColor_)

        // Baseline: bottom for all-positive, top for all-negative, zero-line for mixed
        const barBaseline = globalMinVal >= 0 ? height : globalMaxVal <= 0 ? 0 : zeroY

        const barY = (d) => {
            if (globalMinVal >= 0) return yScale(d.value)
            if (globalMaxVal <= 0) return 0
            return d.value >= 0 ? yScale(d.value) : zeroY
        }
        const barH = (d) => {
            if (globalMinVal >= 0) return height - yScale(d.value)
            if (globalMaxVal <= 0) return yScale(d.value)
            return Math.abs(yScale(d.value) - zeroY)
        }

        const bars = node
            .selectAll('rect.spark-bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'spark-bar')
            .attr('x', (d, i) => offsetX + i * barWidth + barWidth * 0.05)
            .attr('width', barWidth * 0.9)
            .attr('fill', (d, i) => getBarColor(d, i))
            .attr('data-spark-color', (d, i) => getBarColor(d, i))
            .attr('opacity', out.sparkLineOpacity_)

        if (!isForTooltip) {
            bars.attr('y', barBaseline).attr('height', 0).transition().duration(out.transitionDuration()).attr('y', barY).attr('height', barH)
        } else {
            bars.attr('y', barY).attr('height', barH)
        }

        // Zero reference line (tooltip only, mixed data)
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

    // ── Tooltip ──────────────────────────────────────────────────────────────

    out.tooltip_.textFunction = function (region, map) {
        const regionName = region.properties.na || region.properties.name || ''
        const regionId = region.properties.id
        const data = getSparkData(regionId)

        let html = `<div class="em-tooltip-bar"><b>${regionName}</b>${regionId ? ` (${regionId})` : ''}</div>`

        if (!data) return html

        const { width: cw, height: ch, margin: cm } = out.sparkTooltipChart_
        const totalWidth = cw + cm.left + cm.right
        const totalHeight = ch + cm.top + cm.bottom

        const container = create('div').attr('class', 'em-tooltip-chart-container')
        const svg = container.append('svg').attr('class', 'em-tooltip-chart-svg').attr('width', totalWidth).attr('height', totalHeight)
        const g = svg.append('g').attr('class', 'em-tooltip-chart-group').attr('transform', `translate(${cm.left}, ${cm.top})`)

        createSparkLineChart(g, data, cw, ch, true)

        html += container.node().outerHTML
        return html
    }

    // ── Dataset extent ───────────────────────────────────────────────────────

    function getDatasetExtent() {
        let globalMin = +Infinity
        let globalMax = -Infinity

        getSparkAnchors(out)
            .data()
            .forEach((rg) => {
                for (const date of out._statDates) {
                    const s = out.statData(date)?.get(rg.properties.id)
                    if (!s || isNaN(s.value)) continue
                    globalMin = Math.min(globalMin, s.value)
                    globalMax = Math.max(globalMax, s.value)
                }
            })

        return isFinite(globalMin) && isFinite(globalMax) ? [globalMin, globalMax] : [0, 1]
    }

    // ── Legend ───────────────────────────────────────────────────────────────
    out.getLegendConstructor = function () {
        return SparkLegend.legend
    }

    return out
}

export const getColorLegend = function (colorFun) {
    colorFun = colorFun || interpolateYlOrRd
    return function (ecl, numberOfClasses) {
        return colorFun(ecl / (numberOfClasses - 1))
    }
}
