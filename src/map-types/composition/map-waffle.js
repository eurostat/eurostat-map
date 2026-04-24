import { select } from 'd3-selection'
import { createStatMap } from '../../core/stat-map'
import * as WaffleChartLegend from '../../legend/legend-waffle-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import {
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/composition-map').CompositionMapConfig} CompositionMapConfig */


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

/**
 * Returns a proportional waffle chart map.
 * Waffle charts display composition as a grid of small squares,
 * where each square represents a portion of the whole.
 *
 * @param {*} config
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'waffle')

    // ── Config defaults ──────────────────────────────────────────────────────
    out.dorling_ = config?.dorling || false
    out.animateDorling_ = true

    out.waffleMinSize_ = 10
    out.waffleMaxSize_ = 30
    out.waffleGridSize_ = 10
    out.waffleCellPadding_ = 0.5
    out.waffleStrokeFill_ = 'white'
    out.waffleStrokeWidth_ = 0.2
    out.waffleRoundedCorners_ = 1
    out.waffleTooltipSize_ = 80

    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.waffleOtherColor_ = '#FFCC80'
    out.waffleOtherText_ = 'Other'
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
        'waffleMaxSize_',
        'waffleMinSize_',
        'waffleGridSize_',
        'waffleCellPadding_',
        'waffleOtherColor_',
        'waffleOtherText_',
        'waffleStrokeFill_',
        'waffleStrokeWidth_',
        'waffleRoundedCorners_',
        'waffleTooltipSize_',
        'dorling_',
        'animateDorling_',
        'waffleTotalCode_',
        'statCodes_',
    ])

    applyConfigValues(out, config, [
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'waffleMaxSize',
        'waffleMinSize',
        'waffleGridSize',
        'waffleCellPadding',
        'waffleOtherColor',
        'waffleOtherText',
        'waffleStrokeFill',
        'waffleStrokeWidth',
        'waffleRoundedCorners',
        'statCodes',
    ])

    // ── Convenience wrappers ─────────────────────────────────────────────────
    const _getComposition = (id) => getComposition(id, out, 'waffleTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'waffleTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : map.getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statWaffle config method ─────────────────────────────────────────────
    out.statWaffle = buildStatCompositionMethod(out, 'waffleTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────
    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                applyClassificationToMap(map, out, _getAnchors, 'waffleTotalCode_', out.waffleMinSize_, out.waffleMaxSize_)
            )
        }
        applyClassificationToMap(out, out, _getAnchors, 'waffleTotalCode_', out.waffleMinSize_, out.waffleMaxSize_)
        return out
    }

    // ── Styling ──────────────────────────────────────────────────────────────
    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'waffleTotalCode_', out.waffleOtherColor_, out.waffleOtherText_)

            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
            }
            applyStyleToMap(out)

            if (out.dorling_ && !out.gridCartogram_) {
                runDorlingSimulation(
                    out,
                    (d) => {
                        const total = _getRegionTotal(d.properties.id) || 0
                        return total ? out.classifierSize_(total) / 2 : 0
                    },
                    out.dorlingPadding_ || 0
                )
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in waffle chart styling: ' + e.message, e)
        }
    }

    function applyStyleToMap(map) {
        if (!out.svg_) return

        if (map.gridCartogram_) {
            applyStyleToGridCartogram(map)
        } else {
            let regionFeatures = []
            const s = map.getCentroidsGroup(map)
            if (!s) return

            s.selectAll('g.em-centroid')
                .append('g')
                .attr('class', 'em-waffle')
                .attr('id', (rg) => {
                    regionFeatures.push(rg)
                    return 'waffle_' + rg.properties.id
                })

            const selector = getRegionsSelector(out)
            const regions = out.svg().selectAll(selector)

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            addWaffleChartsToMap(regionFeatures)
            addMouseEventsToRegions(regions, out)
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
            out,
            '.wafflechart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.waffleStrokeWidth_ + 0.5).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.waffleStrokeWidth_).style('stroke', out.waffleStrokeFill_)
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
            .attr('x', (d) => d.col * (cellSize + out.waffleCellPadding_))
            .attr('y', (d) => d.row * (cellSize + out.waffleCellPadding_))
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('rx', out.waffleRoundedCorners_)
            .attr('ry', out.waffleRoundedCorners_)
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

    function addWaffleChartsToMap(regionFeatures) {
        const gridSize = out.waffleGridSize_

        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = _getComposition(regionId)
            if (!comp) return

            const total = _getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - out.waffleCellPadding_ * (gridSize - 1)) / gridSize
            const cells = generateWaffleCells(comp, gridSize)

            const nodes = out.svg().selectAll('#waffle_' + regionId)
            const chartNode = nodes
                .append('g')
                .attr('class', 'wafflechart')
                .attr('transform', `translate(${-waffleSize / 2}, ${-waffleSize / 2})`)
                .attr('stroke', out.waffleStrokeFill_)
                .attr('stroke-width', out.waffleStrokeWidth_ + 'px')
                .style('pointer-events', 'none')

            renderWaffleRects(chartNode, cells, cellSize, true).on('end', function () {
                select(chartNode.node()).style('pointer-events', null)
            })

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.waffleStrokeWidth_ + 0.5)
                        .style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.waffleStrokeWidth_).style('stroke', out.waffleStrokeFill_)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function addWaffleChartsToGridCartogram(regionIds, map) {
        const gridSize = out.waffleGridSize_

        regionIds.forEach((regionId) => {
            const node = out.svg().select('#waffle_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            node.selectAll('.em-waffle').remove()

            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.height / 2

            const total = _getRegionTotal(regionId)
            const waffleSize = out.classifierSize_(total)
            const cellSize = (waffleSize - out.waffleCellPadding_ * (gridSize - 1)) / gridSize
            const cells = generateWaffleCells(comp, gridSize)

            const g = node
                .append('g')
                .attr('id', 'wafflechart_' + regionId)
                .attr('class', 'em-waffle')
                .attr('transform', `translate(${anchorX - waffleSize / 2}, ${anchorY - waffleSize / 2})`)

            const chartNode = g
                .append('g')
                .attr('class', 'wafflechart')
                .attr('stroke', out.waffleStrokeFill_)
                .attr('stroke-width', out.waffleStrokeWidth_ + 'px')

            renderWaffleRects(chartNode, cells, cellSize, true)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    const waffleChartTooltipFunction = function (rg, map) {
        const tooltipGridSize = 10
        const chartSize = out.waffleTooltipSize_ || 100
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = _getComposition(regionId)

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!comp) {
            html += `<div>${out.noDataText()}</div>`
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
