import { select } from 'd3-selection'
import { createStatMap } from '../../core/stat-map'
import * as WaffleChartLegend from '../../legend/legend-waffle-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import { getGridCartogramChartAnchor } from '../../core/cartograms'
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
/** @typedef {import('../../types/map-types/composition/waffle/WaffleMapConfig').WaffleMapConfig} WaffleMapConfig */
/** @typedef {import('../../types/map-types/composition/waffle/WaffleMap').WaffleMap} WaffleMap */

/**
 * Returns a proportional waffle chart map.
 * Waffle charts display composition as a grid of small squares,
 * where each square represents a portion of the whole.
 *
 * @param {WaffleMapConfig} [config]
 * @returns {WaffleMap}
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'waffle')

    // ── Config defaults ──────────────────────────────────────────────────────
    out.dorling_ = config?.dorling || false

    out.waffleSettings_ = {
        minSize: 10,
        maxSize: 30,
        gridSize: 10,
        cellPadding: 0,
        strokeFill: 'white',
        strokeWidth: 0,
        roundedCorners: 0,
        tooltipSize: 80,
        otherColor: '#FFCC80',
        otherText: 'Other',
    }

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false
    out.classifierSize_ = null
    out.waffleTotalCode_ = undefined
    out.statCodes_ = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────
    buildGetterSetters(out, [
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'waffleSettings_',
        'dorling_',
        'waffleTotalCode_',
        'statCodes_',
    ])

    out.waffleSettings = function (v) {
        if (!arguments.length) return { ...out.waffleSettings_ }
        out.waffleSettings_ = {
            ...out.waffleSettings_,
            ...v,
        }
        return out
    }

    applyConfigValues(out, config, [
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'waffleSettings',
        // legacy keys (deprecated) — still accepted for backwards compatibility
        'waffleMaxSize',
        'waffleMinSize',
        'waffleGridSize',
        'waffleCellPadding',
        'waffleOtherColor',
        'waffleOtherText',
        'waffleStrokeFill',
        'waffleStrokeWidth',
        'waffleRoundedCorners',
        'waffleTooltipSize',
        'statCodes',
    ])

    // ── Convenience wrappers ─────────────────────────────────────────────────
    const _getComposition = (id) => getComposition(id, out, 'waffleTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'waffleTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statWaffle config method ─────────────────────────────────────────────
    out.statWaffle = buildStatCompositionMethod(out, 'waffleTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────
    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                applyClassificationToMap(map, out, _getAnchors, 'waffleTotalCode_', out.waffleSettings_.minSize, out.waffleSettings_.maxSize)
            )
        }
        applyClassificationToMap(out, out, _getAnchors, 'waffleTotalCode_', out.waffleSettings_.minSize, out.waffleSettings_.maxSize)
        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────
    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'waffleTotalCode_', out.waffleSettings_.otherColor, out.waffleSettings_.otherText)

            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }
            applyStyleToMap(out)

            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(
                    out,
                    (d) => {
                        return _getDorlingRadius(d.properties.id)
                    },
                    out.dorlingSettings_.padding || 0
                )
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in waffle chart styling: ' + e.message, e)
        }
    }

    /**
     * Collision radius for Dorling force layout.
     * Waffle symbols are square, so use half the diagonal to avoid corner overlap.
     */
    function _getDorlingRadius(regionId) {
        const total = _getRegionTotal(regionId) || 0
        if (!total) return 0
        const size = out.classifierSize_(total)
        return size ? (Math.SQRT2 * size) / 2 : 0
    }

    function applyStyleToMap(map) {
        if (!out.svg_) return

        if (map.gridCartogram_) {
            applyStyleToGridCartogram(map)
        } else {
            let regionFeatures = []
            const s = getCentroidsGroup(map)
            if (!s) return

            s.selectAll('g.em-centroid')
                .append('g')
                .attr('class', 'em-waffle')
                .attr('id', (rg) => {
                    regionFeatures.push(rg)
                    return 'waffle_' + rg.properties.id
                })

            const selector = getRegionsSelector(map)
            const regions = map.svg().selectAll(selector)

            applyCompositionRegionDataFill(
                regions,
                _getComposition,
                (regionId) => hasExplicitNoDataForComposition(map, out, regionId, 'waffleTotalCode_'),
                out.noDataFillStyle()
            )

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            addWaffleChartsToMap(map, regionFeatures)
            addMouseEventsToRegions(regions, map)
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'waffle_' + rg.properties.id
        })
        addWaffleChartsToGridCartogram(regionIds, map)
        addMouseEventsToGridCartogram(
            map,
            '.wafflechart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.waffleSettings_.strokeWidth + 0.5).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.waffleSettings_.strokeWidth).style('stroke', out.waffleSettings_.strokeFill)
        )
    }

    // ── Waffle cell generation ───────────────────────────────────────────────

    /**
     * Generate waffle chart cell data from composition proportions.
     * Returns array of {row, col, code, color} for each cell.
     * Fills bottom-to-top, left-to-right.
     */
    function generateWaffleCells(comp, gridSize) {
        const totalCells = gridSize * gridSize
        const cells = []
        let assignedCells = 0
        const codes = Object.keys(comp)

        const cellCounts = codes.map((code, i) => {
            let count = Math.round(comp[code] * totalCells)
            if (i === codes.length - 1) count = totalCells - assignedCells
            count = Math.max(0, Math.min(count, totalCells - assignedCells))
            assignedCells += count
            return { code, count }
        })

        let cellIndex = 0
        for (const { code, count } of cellCounts) {
            for (let i = 0; i < count && cellIndex < totalCells; i++) {
                const row = Math.floor(cellIndex / gridSize)
                const col = cellIndex % gridSize
                cells.push({ row: gridSize - 1 - row, col, code, color: out.catColors_[code] || 'lightgray' })
                cellIndex++
            }
        }
        return cells
    }

    function renderWaffleRects(container, cells, cellSize, animated) {
        const rects = container
            .selectAll('rect')
            .data(cells)
            .join('rect')
            .attr('x', (d) => d.col * (cellSize + out.waffleSettings_.cellPadding))
            .attr('y', (d) => d.row * (cellSize + out.waffleSettings_.cellPadding))
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('rx', out.waffleSettings_.roundedCorners)
            .attr('ry', out.waffleSettings_.roundedCorners)
            .attr('fill', (d) => d.color)
            .attr('code', (d) => d.code)

        if (animated) {
            rects
                .attr('opacity', 0)
                .transition()
                .delay((d, i) => i * 5)
                .duration(out.transitionDuration_ / 2)
                .attr('opacity', 1)
        }
        return rects
    }

    function addWaffleChartsToMap(map, regionFeatures) {
        const gridSize = out.waffleSettings_.gridSize

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = _getComposition(regionId)
            if (!comp) return

            const total = _getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - out.waffleSettings_.cellPadding * (gridSize - 1)) / gridSize
            const cells = generateWaffleCells(comp, gridSize)

            const nodes = map.svg().selectAll('#waffle_' + regionId)
            const chartNode = nodes
                .append('g')
                .attr('class', 'wafflechart')
                .attr('transform', `translate(${-waffleSize / 2}, ${-waffleSize / 2})`)
                .attr('stroke', out.waffleSettings_.strokeFill)
                .attr('stroke-width', out.waffleSettings_.strokeWidth + 'px')

            renderWaffleRects(chartNode, cells, cellSize, true)

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.waffleSettings_.strokeWidth + 0.5)
                        .style('stroke', 'black')
                    if (map._tooltip) map._tooltip.mouseover(out.tooltip_.textFunction(rg, map))
                })
                .on('mousemove', function (e) {
                    if (map._tooltip) map._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.waffleSettings_.strokeWidth).style('stroke', out.waffleSettings_.strokeFill)
                    if (map._tooltip) map._tooltip.mouseout()
                })
        })
    }

    function addWaffleChartsToGridCartogram(regionIds, map) {
        const gridSize = out.waffleSettings_.gridSize

        regionIds.forEach((regionId) => {
            const node = map.svg().select('#waffle_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            node.selectAll('.em-waffle').remove()

            const bbox = node.node().getBBox()
            const anchor = getGridCartogramChartAnchor(out, bbox)

            const total = _getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - out.waffleSettings_.cellPadding * (gridSize - 1)) / gridSize
            const cells = generateWaffleCells(comp, gridSize)

            const g = node
                .append('g')
                .attr('id', 'wafflechart_' + regionId)
                .attr('class', 'em-waffle')
                .attr('transform', `translate(${anchor.x - waffleSize / 2}, ${anchor.y - waffleSize / 2})`)

            const chartNode = g
                .append('g')
                .attr('class', 'wafflechart')
                .attr('stroke', out.waffleSettings_.strokeFill)
                .attr('stroke-width', out.waffleSettings_.strokeWidth + 'px')

            renderWaffleRects(chartNode, cells, cellSize, true)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    const waffleChartTooltipFunction = function (rg, map) {
        const tooltipGridSize = 10
        const chartSize = out.waffleSettings_.tooltipSize || 100
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = _getComposition(regionId)

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!comp) {
            html += `<div class="em-tooltip-text">${out.noDataText()}</div>`
            return html
        }

        const cells = generateWaffleCells(comp, tooltipGridSize)
        const tooltipPadding = 1
        const cellSize = (chartSize - tooltipPadding * (tooltipGridSize - 1)) / tooltipGridSize
        const containerPadding = 10

        let rects = ''
        for (const cell of cells) {
            const x = containerPadding + cell.col * (cellSize + tooltipPadding)
            const y = containerPadding + cell.row * (cellSize + tooltipPadding)
            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${cell.color}" stroke="white" stroke-width="0.5" rx="1" ry="1"/>`
        }

        const svgSize = chartSize + containerPadding * 2
        html += `
        <div class='em-tooltip-wafflechart-container'>
            <svg viewBox="0 0 ${svgSize} ${svgSize}" width="${chartSize}" style="display:block;">
                ${rects}
            </svg>
        </div>`

        html += buildTooltipBreakdownHTML(regionId, out, _getRegionTotal, spaceAsThousandSeparator)
        return html
    }

    out.tooltip_.textFunction = waffleChartTooltipFunction

    // ── Legend ───────────────────────────────────────────────────────────────
    out.getLegendConstructor = function () {
        return WaffleChartLegend.legend
    }

    return out
}
