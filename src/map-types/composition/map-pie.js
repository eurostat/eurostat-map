import { select } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { interpolate } from 'd3-interpolate'
import { createStatMap } from '../../core/stat-map'
import * as PiechartLegend from '../../legend/legend-pie-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import { adjustGridCartogramTextLabels } from '../../core/cartograms'
import {
    buildGetterSetters,
    applyConfigValues,
    getComposition,
    getRegionTotal,
    applyClassificationToMap,
    ensureCategoryColors,
    addMouseEventsToRegions,
    addMouseEventsToGridCartogram,
    styleMixedNUTSRegions,
    hasExplicitNoDataForComposition,
    applyCompositionRegionDataFill,
    buildStatCompositionMethod,
    buildTooltipBreakdownHTML,
} from './composition-map'
import { getCentroidsGroup } from '../../core/geo/centroids'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/pie/PieMapConfig').PieMapConfig} PieMapConfig */
/** @typedef {import('../../types/map-types/composition/pie/PieMap').PieMap} PieMap */

/**
 * Returns a proportional pie chart map.
 *
 * @param {PieMapConfig} [config]
 * @returns {PieMap}
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'pie')

    // ── Config defaults ──────────────────────────────────────────────────────
    out.dorling_ = config?.dorling || false

    out.pieSettings_ = {
        innerRadius: 0,
    }
    out.compositionSettings_ = {
        type: 'pie',
        minSize: 5,
        maxSize: 15,
        strokeFill: 'white',
        strokeWidth: 0.3,
        reverseOrder: false,
        stripesOrientation: 0,
        offsetAngle: 0,
        agePyramidHeightFactor: 1,
        otherColor: '#FFCC80',
        otherText: 'Other',
    }

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false
    out.classifierSize_ = null
    out.compositionTotalCode_ = undefined
    out.statCodes_ = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────
    buildGetterSetters(out, [
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'dorling_',
        'compositionTotalCode_',
        'statCodes_',
    ])

    out.pieSettings = function (v) {
        if (!arguments.length) return { ...out.pieSettings_ }
        out.pieSettings_ = {
            ...out.pieSettings_,
            ...v,
        }
        return out
    }

    out.compositionSettings = function (v) {
        if (!arguments.length) return { ...out.compositionSettings_ }
        out.compositionSettings_ = {
            ...out.compositionSettings_,
            ...v,
        }
        return out
    }

    applyConfigValues(out, config, [
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'pieSettings',
        'compositionSettings',
        'compositionTotalCode',
        'statCodes',
    ])

    // ── Convenience wrappers (bind totalCodeKey) ─────────────────────────────
    const _getComposition = (id) => getComposition(id, out, 'compositionTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'compositionTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statPie config method ────────────────────────────────────────────────
    out.statPie = buildStatCompositionMethod(out, 'compositionTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────
    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                applyClassificationToMap(
                    map,
                    out,
                    _getAnchors,
                    'compositionTotalCode_',
                    out.compositionSettings_.minSize,
                    out.compositionSettings_.maxSize
                )
            )
        }
        applyClassificationToMap(
            out,
            out,
            _getAnchors,
            'compositionTotalCode_',
            out.compositionSettings_.minSize,
            out.compositionSettings_.maxSize
        )
        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────
    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'compositionTotalCode_', out.compositionSettings_.otherColor, out.compositionSettings_.otherText)

            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }
            applyStyleToMap(out)

            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(
                    out,
                    (d) => {
                        const total = _getRegionTotal(d.properties.id)
                        if (!total) return 0

                        const baseSize = out.classifierSize_(total) || 0
                        const type = out.compositionSettings_?.type || 'pie'

                        // Dorling collide expects a circle radius. For non-circular symbols,
                        // inflate radius to circumscribed-circle size to reduce overlap.
                        if (type === 'flag') return Math.SQRT2 * baseSize
                        if (type === 'segment') return Math.sqrt(1 + 0.35 * 0.35) * baseSize
                        if (type === 'agepyramid') {
                            const h = out.compositionSettings_?.agePyramidHeightFactor || 1
                            return Math.sqrt(1 + h * h) * baseSize
                        }
                        if (type === 'halftone') return 1.2 * baseSize

                        return baseSize
                    },
                    out.dorlingSettings_.padding || 0
                )
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in pie symbols styling: ' + e.message, e)
        }
    }

    function applyStyleToMap(map) {
        if (!map.svg_) return

        // Insets are built from map templates and may not initialize their own tooltip instance.
        // Reuse the main map tooltip so hover on external inset SVGs still shows tooltip content.
        if (!map._tooltip && out._tooltip) {
            map._tooltip = out._tooltip
        }

        if (map.gridCartogram_) {
            applyStyleToGridCartogram(map)
        } else {
            let regionFeatures = []
            const s = getCentroidsGroup(map)
            if (!s) return

            s.selectAll('g.em-centroid')
                .append('g')
                .attr('class', 'em-pie')
                .attr('id', (rg) => {
                    regionFeatures.push(rg)
                    return 'pie_' + rg.properties.id
                })

            const selector = getRegionsSelector(map)
            const regions = map.svg().selectAll(selector)

            applyCompositionRegionDataFill(
                regions,
                _getComposition,
                (regionId) => hasExplicitNoDataForComposition(map, out, regionId, 'compositionTotalCode_'),
                out.noDataFillStyle()
            )

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            addChartsToMap(map, regionFeatures)
            addMouseEventsToRegions(regions, map)
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'pie_' + rg.properties.id
        })
        addChartsToGridCartogram(regionIds, map)
        addMouseEventsToGridCartogram(
            map,
            '.piechart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.compositionSettings_.strokeWidth + 1).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.compositionSettings_.strokeWidth).style('stroke', out.compositionSettings_.strokeFill)
        )
    }

    // ── Pie chart rendering ──────────────────────────────────────────────────

    function makePieArc(r) {
        const pie_ = pie()
            .sort(null)
            .value((d) => d.value)
        const arcFn = arc().innerRadius(out.pieSettings_.innerRadius).outerRadius(r)
        return { pie_, arcFn }
    }

    function drawPieSegments(container, data, arcFn, pie_, animated) {
        const pieData = pie_(data)

        const paths = container
            .selectAll('path')
            .data(pieData)
            .join('path')
            .attr('fill', (d) => out.catColors_[d.data.code] || 'lightgray')
            .attr('code', (d) => d.data.code)

        if (animated) {
            paths
                .each(function (d) {
                    this._current = { startAngle: d.startAngle, endAngle: d.startAngle }
                })
                .transition()
                .delay((d, i) => i * 150)
                .duration(out.transitionDuration_)
                .attrTween('d', function (d) {
                    const interp = interpolate(this._current, d)
                    this._current = interp(1)
                    return (t) => arcFn(interp(t))
                })
        } else {
            paths.attr('d', arcFn)
        }

        return paths
    }

    function drawCompositionSymbol(container, data, r, animated) {
        const settings = out.compositionSettings_ || {}
        const type = settings.type || 'pie'
        const orderedData = settings.reverseOrder ? [...data].reverse() : data
        const s = 2 * r
        const half = s / 2

        if (type === 'pie') {
            const { pie_, arcFn } = makePieArc(r)
            return drawPieSegments(container, orderedData, arcFn, pie_, animated)
        }

        container.selectAll('*').remove()

        const offAng = ((settings.offsetAngle || 0) * Math.PI) / 180
        const orientation = settings.stripesOrientation || 0
        const maxVal = orderedData.reduce((m, d) => Math.max(m, +d.value || 0), 0) || 1
        const nbCat = orderedData.length || 1

        if (type === 'flag' || type === 'segment') {
            let cumul = 0
            const segmentThickness = s * 0.35
            orderedData.forEach((d) => {
                const share = +d.value || 0
                if (!share) return

                if (type === 'flag') {
                    if (orientation === 0) {
                        container
                            .append('rect')
                            .attr('x', -half)
                            .attr('y', -half + cumul * s)
                            .attr('width', s)
                            .attr('height', share * s)
                            .attr('fill', out.catColors_[d.code] || 'lightgray')
                    } else {
                        container
                            .append('rect')
                            .attr('x', -half + cumul * s)
                            .attr('y', -half)
                            .attr('width', share * s)
                            .attr('height', s)
                            .attr('fill', out.catColors_[d.code] || 'lightgray')
                    }
                } else {
                    if (orientation === 0) {
                        container
                            .append('rect')
                            .attr('x', -half)
                            .attr('y', -segmentThickness / 2 + cumul * segmentThickness)
                            .attr('width', s)
                            .attr('height', share * segmentThickness)
                            .attr('fill', out.catColors_[d.code] || 'lightgray')
                    } else {
                        container
                            .append('rect')
                            .attr('x', -segmentThickness / 2 + cumul * segmentThickness)
                            .attr('y', -half)
                            .attr('width', share * segmentThickness)
                            .attr('height', s)
                            .attr('fill', out.catColors_[d.code] || 'lightgray')
                    }
                }

                cumul += share
            })
        } else if (type === 'ring') {
            let cumul = 0
            orderedData.forEach((d) => {
                const share = +d.value || 0
                if (!share) return

                const outerR = Math.sqrt(Math.max(0, 1 - cumul)) * r
                const innerR = Math.sqrt(Math.max(0, 1 - (cumul + share))) * r

                container
                    .append('path')
                    .attr('d', arc()({ startAngle: 0, endAngle: 2 * Math.PI, innerRadius: innerR, outerRadius: outerR }))
                    .attr('fill', out.catColors_[d.code] || 'lightgray')

                cumul += share
            })
        } else if (type === 'radar') {
            let cumul = Math.PI / 2 + offAng
            const incr = (2 * Math.PI) / nbCat

            orderedData.forEach((d) => {
                const val = +d.value || 0
                const rr = r * Math.sqrt(val / maxVal)

                container
                    .append('path')
                    .attr(
                        'd',
                        arc()({
                            startAngle: cumul - incr,
                            endAngle: cumul,
                            innerRadius: 0,
                            outerRadius: rr,
                        })
                    )
                    .attr('fill', out.catColors_[d.code] || 'lightgray')

                cumul += incr
            })
        } else if (type === 'halftone') {
            let cumul = Math.PI / 2 + offAng
            const incr = (2 * Math.PI) / nbCat

            orderedData.forEach((d) => {
                const val = +d.value || 0
                const rr = s * 0.333 * Math.sqrt(val / maxVal)
                const orbit = s * 0.25

                container
                    .append('circle')
                    .attr('cx', orbit * Math.cos(cumul))
                    .attr('cy', orbit * Math.sin(cumul))
                    .attr('r', rr)
                    .attr('fill', out.catColors_[d.code] || 'lightgray')

                cumul += incr
            })
        } else if (type === 'agepyramid') {
            const heightFactor = settings.agePyramidHeightFactor || 1
            let cumul = -(s * heightFactor) / 2
            const pyramidHeight = s * heightFactor
            const dy = pyramidHeight / nbCat

            orderedData.forEach((d) => {
                const val = +d.value || 0
                const w = (s * val) / maxVal

                container
                    .append('rect')
                    .attr('x', -w / 2)
                    .attr('y', cumul)
                    .attr('width', w)
                    .attr('height', dy)
                    .attr('fill', out.catColors_[d.code] || 'lightgray')

                cumul += dy
            })
        }

        if (animated) {
            const nodes = container.selectAll('path, rect, circle').style('opacity', 0)
            nodes
                .transition()
                .delay((d, i) => i * 100)
                .duration(out.transitionDuration_)
                .style('opacity', 1)
            return nodes
        }

        return container.selectAll('path, rect, circle')
    }

    function addChartsToMap(map, regionFeatures) {
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = _getComposition(regionId)
            if (!comp) return

            const data = Object.entries(comp).map(([code, value]) => ({ code, value }))
            if (!data.length) return

            const r = out.classifierSize_(_getRegionTotal(regionId))

            const nodes = map.svg().selectAll('#pie_' + regionId)
            const chartNode = nodes
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.compositionSettings_.strokeFill)
                .attr('stroke-width', out.compositionSettings_.strokeWidth + 'px')
                .style('pointer-events', 'none')

            drawCompositionSymbol(chartNode, data, r, true).on('end', function () {
                select(chartNode.node()).style('pointer-events', null)
            })

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.compositionSettings_.strokeWidth + 1)
                        .style('stroke', 'black')
                    if (map._tooltip) map._tooltip.mouseover(out.tooltip_.textFunction(rg, map))
                })
                .on('mousemove', function (e) {
                    if (map._tooltip) map._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.compositionSettings_.strokeWidth).style('stroke', out.compositionSettings_.strokeFill)
                    if (map._tooltip) map._tooltip.mouseout()
                })
        })
    }

    function addChartsToGridCartogram(regionIds, map) {
        regionIds.forEach((regionId) => {
            const node = map.svg().select('#pie_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            const data = Object.entries(comp).map(([code, value]) => ({ code, value }))
            if (!data.length) return

            node.selectAll('.em-pie').remove()

            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramSettings_.shape == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramSettings_.shape == 'hexagon' ? 0 : bbox.height / 2

            const r = out.classifierSize_(_getRegionTotal(regionId))

            const g = node
                .append('g')
                .attr('id', 'piechart_' + regionId)
                .attr('class', 'em-pie')
                .attr('transform', `translate(${anchorX}, ${anchorY})`)

            const chartNode = g
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.compositionSettings_.strokeFill)
                .attr('stroke-width', out.compositionSettings_.strokeWidth + 'px')

            drawCompositionSymbol(chartNode, data, r, true)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })

        adjustGridCartogramTextLabels({
            map,
            getAnchors: _getAnchors,
            getRadius: (regionId) => {
                const total = _getRegionTotal(regionId)
                return total ? out.classifierSize_(total) : 0
            },
        })
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    // Pre-build arcs for tooltip pie rendering (static, not map-sized)
    const _tooltipWidth = 150,
        _tooltipHeight = 120,
        _tooltipMargin = 10
    const _tooltipRadius = Math.min(_tooltipWidth, _tooltipHeight) / 2 - _tooltipMargin
    const _tooltipPie = pie()
        .sort(null)
        .value((d) => d.value)
    const _innerArc = arc()
        .innerRadius(0)
        .outerRadius(_tooltipRadius * 0.8)
    const _outerArc = arc()
        .innerRadius(_tooltipRadius * 0.9)
        .outerRadius(_tooltipRadius * 0.9)

    const pieChartTooltipFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = _getComposition(regionId)
        const data = comp ? Object.entries(comp).map(([code, value]) => ({ code, value })) : []

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!data.length) {
            html += `<div class="em-tooltip-text">${out.noDataText()}</div>`
            return html
        }

        const pieData = _tooltipPie(data)
        let paths = '',
            polylines = '',
            labels = ''

        for (const d of pieData) {
            const fill = out.catColors()[d.data.code] || 'lightgray'
            paths += `<path d="${_innerArc(d)}" fill="${fill}" stroke="white" stroke-width="1" opacity="1"></path>`

            if (d.data.value > 0.1) {
                const posA = _innerArc.centroid(d)
                const posB = _outerArc.centroid(d)
                const posC = [..._outerArc.centroid(d)]
                const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2
                posC[0] = _tooltipRadius * 0.95 * (midAngle < Math.PI ? 1 : -1)
                polylines += `<polyline points="${posA.join(',')} ${posB.join(',')} ${posC.join(',')}" stroke="black" fill="none" stroke-width="1"/>`

                const labelPos = _outerArc.centroid(d)
                labelPos[0] = _tooltipRadius * 0.99 * (midAngle < Math.PI ? 1 : -1)
                const percent = (d.data.value * 100).toFixed()
                if (!isNaN(percent)) {
                    labels += `<text x="${labelPos[0]}" y="${labelPos[1]}" text-anchor="${midAngle < Math.PI ? 'start' : 'end'}" font-size="12px">${percent}%</text>`
                }
            }
        }

        html += `
        <div class='em-tooltip-piechart-container'>
            <svg viewBox="${-_tooltipWidth / 2} ${-_tooltipHeight / 2} ${_tooltipWidth} ${_tooltipHeight}"
                 width="${_tooltipWidth}" height="${_tooltipHeight - _tooltipMargin / 2}">
                <g>${paths}${polylines}${labels}</g>
            </svg>
        </div>`

        html += buildTooltipBreakdownHTML(regionId, out, _getRegionTotal, spaceAsThousandSeparator)
        return html
    }

    out.tooltip_.textFunction = pieChartTooltipFunction

    // ── Legend ───────────────────────────────────────────────────────────────
    out.getLegendConstructor = function () {
        return PiechartLegend.legend
    }

    return out
}
