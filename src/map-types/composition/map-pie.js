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
    out.animateDorling_ = true

    out.pieMinRadius_ = 5
    out.pieMaxRadius_ = 15
    out.pieChartInnerRadius_ = 0
    out.pieStrokeFill_ = 'white'
    out.pieStrokeWidth_ = 0.3

    out.tooltipPieRadius_ = 40
    out.tooltipPieInnerRadius_ = 0

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.pieOtherColor_ = '#FFCC80'
    out.pieOtherText_ = 'Other'
    out.showOnlyWhenComplete_ = false
    out.classifierSize_ = null
    out.pieTotalCode_ = undefined
    out.statCodes_ = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────
    buildGetterSetters(out, [
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'pieMaxRadius_',
        'pieMinRadius_',
        'pieChartInnerRadius_',
        'pieOtherColor_',
        'pieOtherText_',
        'pieStrokeFill_',
        'pieStrokeWidth_',
        'dorling_',
        'animateDorling_',
        'pieTotalCode_',
        'statCodes_',
    ])

    applyConfigValues(out, config, [
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'pieMaxRadius',
        'pieMinRadius',
        'pieChartInnerRadius',
        'pieOtherColor',
        'pieOtherText',
        'pieStrokeFill',
        'pieStrokeWidth',
        'statCodes',
    ])

    // ── Convenience wrappers (bind totalCodeKey) ─────────────────────────────
    const _getComposition = (id) => getComposition(id, out, 'pieTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'pieTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statPie config method ────────────────────────────────────────────────
    out.statPie = buildStatCompositionMethod(out, 'pieTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────
    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                applyClassificationToMap(map, out, _getAnchors, 'pieTotalCode_', out.pieMinRadius_, out.pieMaxRadius_)
            )
        }
        applyClassificationToMap(out, out, _getAnchors, 'pieTotalCode_', out.pieMinRadius_, out.pieMaxRadius_)
        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────
    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'pieTotalCode_', out.pieOtherColor_, out.pieOtherText_)

            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }
            applyStyleToMap(out)

            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(
                    out,
                    (d) => {
                        return _getRegionTotal(d.properties.id) || 0 ? out.classifierSize_(_getRegionTotal(d.properties.id)) || 0 : 0
                    },
                    out.dorlingPadding_ || 0
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

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            addPieChartsToMap(map, regionFeatures)
            addMouseEventsToRegions(regions, map)
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'pie_' + rg.properties.id
        })
        addPieChartsToGridCartogram(regionIds, map)
        addMouseEventsToGridCartogram(
            map,
            '.piechart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.pieStrokeWidth_ + 1).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.pieStrokeWidth_).style('stroke', out.pieStrokeFill_)
        )
    }

    // ── Pie chart rendering ──────────────────────────────────────────────────

    function makePieArc(r) {
        const pie_ = pie()
            .sort(null)
            .value((d) => d.value)
        const arcFn = arc().innerRadius(out.pieChartInnerRadius_).outerRadius(r)
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

    function addPieChartsToMap(map, regionFeatures) {
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = _getComposition(regionId)
            if (!comp) return

            const data = Object.entries(comp).map(([code, value]) => ({ code, value }))
            if (!data.length) return

            const r = out.classifierSize_(_getRegionTotal(regionId))
            const { pie_, arcFn } = makePieArc(r)

            const nodes = map.svg().selectAll('#pie_' + regionId)
            const chartNode = nodes
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.pieStrokeFill_)
                .attr('stroke-width', out.pieStrokeWidth_ + 'px')
                .style('pointer-events', 'none')

            drawPieSegments(chartNode, data, arcFn, pie_, true).on('end', function () {
                select(chartNode.node()).style('pointer-events', null)
            })

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.pieStrokeWidth_ + 1)
                        .style('stroke', 'black')
                    if (map._tooltip) map._tooltip.mouseover(out.tooltip_.textFunction(rg, map))
                })
                .on('mousemove', function (e) {
                    if (map._tooltip) map._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.pieStrokeWidth_).style('stroke', out.pieStrokeFill_)
                    if (map._tooltip) map._tooltip.mouseout()
                })
        })
    }

    function addPieChartsToGridCartogram(regionIds, map) {
        regionIds.forEach((regionId) => {
            const node = map.svg().select('#pie_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            const data = Object.entries(comp).map(([code, value]) => ({ code, value }))
            if (!data.length) return

            node.selectAll('.em-pie').remove()

            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.height / 2

            const r = out.classifierSize_(_getRegionTotal(regionId))
            const { pie_, arcFn } = makePieArc(r)

            const g = node
                .append('g')
                .attr('id', 'piechart_' + regionId)
                .attr('class', 'em-pie')
                .attr('transform', `translate(${anchorX}, ${anchorY})`)

            const chartNode = g
                .append('g')
                .attr('class', 'piechart')
                .attr('stroke', out.pieStrokeFill_)
                .attr('stroke-width', out.pieStrokeWidth_ + 'px')

            drawPieSegments(chartNode, data, arcFn, pie_, true)

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
            html += `<div>${out.noDataText()}</div>`
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
