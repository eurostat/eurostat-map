import { scaleSqrt, scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { createStatMap } from '../../core/stat-map'
import { applyPatternFill } from '../../core/decoration/pattern-fill'
import * as BarChartLegend from '../../legend/composition/legend-bar-chart'
import { executeForAllInsets, getRegionsSelector, spaceAsThousandSeparator, formatRawValue } from '../../core/utils'
import { runDorlingSimulation, stopDorlingSimulation } from '../../core/dorling/dorling'
import { adjustGridCartogramTextLabels, getGridCartogramChartAnchor } from '../../core/cartograms'
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
import { getMobileSymbolScale, getResponsiveSymbolSize } from '../../core/responsive'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/bar/BarMapConfig').BarMapConfig} BarMapConfig */
/** @typedef {import('../../types/map-types/composition/bar/BarMap').BarMap} BarMap */

/**
 * Returns a proportional bar chart map.
 *
 * Supports two layout modes, controlled by `barType`:
 *
 * **'stacked'** (default) — horizontal proportional stacked bars.
 * Bar width scales with the region total; segments represent category shares
 * left-to-right. Good for comparing totals AND composition simultaneously.
 *
 * **'grouped'** — vertical grouped bars, one bar per category.
 * Bar height scales with the individual category value; bars sit side by side
 * centered on the region centroid. Good for comparing absolute category values
 * across regions without collapsing them into proportions.
 *
 * @param {BarMapConfig} [config]
 * @returns {BarMap}
 *
 * @example — stacked
 * eurostatmap.map('bar')
 *   .statBar({
 *     eurostatDatasetCode: 'tour_occ_nin2',
 *     filters: { unit: 'NR', time: '2022', nace_r2: 'I551-I553' },
 *     unitText: 'Nights',
 *     categoryParameter: 'c_resid',
 *     categoryCodes: ['FOR', 'DOM'],
 *     categoryLabels: ['Foreign', 'Domestic'],
 *     categoryColors: ['#7fc97f', '#beaed4'],
 *     totalCode: 'TOTAL',
 *   })
 *   .build()
 *
 * @example — grouped vertical
 * eurostatmap.map('bar')
 *   .barType('grouped')
 *   .statBar({ ... })
 *   .build()
 */
export const map = function (config) {
    const out = createStatMap(config, true, 'bar')

    // ── Config defaults ──────────────────────────────────────────────────────

    out.dorling_ = config?.dorling || false

    // Bar settings with defaults
    const defaultBarSettings = {
        type: 'grouped', // 'stacked' | 'grouped'
        minWidth: 10,
        maxWidth: 40,
        height: 8,
        groupWidth: undefined, // defaults to cell width ÷ number of categories at render time
        groupGap: 0,
        groupMinHeight: 2,
        groupMaxHeight: 40,
        groupMaxValue: undefined, // optional override for grouped mode max value - for sharing scales across maps
        strokeFill: 'white',
        strokeWidth: 0.3,
        cornerRadius: 1,
        otherColor: '#FFCC80',
        otherText: 'Other',
        tooltipWidth: 150,
        tooltipHeight: 10,
    }

    out.barSettings_ = { ...defaultBarSettings, ...(config?.barSettings || {}) }

    // ── Category data ─────────────────────────────────────────────────────────
    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.showOnlyWhenComplete_ = false

    // ── Internal ──────────────────────────────────────────────────────────────
    out.classifierSize_ = null
    out._groupedMaxCatValue = 1
    out.barTotalCode_ = undefined
    out.statCodes_ = undefined

    // ── Getters/setters ──────────────────────────────────────────────────────

    // Primary barSettings getter/setter
    out.barSettings = function (v) {
        if (!arguments.length) return out.barSettings_
        out.barSettings_ = { ...out.barSettings_, ...v }
        return out
    }

    buildGetterSetters(out, ['catColors_', 'catLabels_', 'showOnlyWhenComplete_', 'noDataFillStyle_', 'dorling_', 'barTotalCode_', 'statCodes_'])

    applyConfigValues(out, config, ['catColors', 'catLabels', 'showOnlyWhenComplete', 'noDataFillStyle', 'statCodes'])

    // ── Convenience wrappers ─────────────────────────────────────────────────

    const _getComposition = (id) => getComposition(id, out, 'barTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'barTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statBar config method ────────────────────────────────────────────────

    out.statBar = buildStatCompositionMethod(out, 'barTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        const settings = getResponsiveBarSettings()
        if (out.barSettings_.type === 'grouped') {
            // Grouped mode: classifier maps individual category value → bar height.
            // The shared applyClassificationToMap works on region totals, which is
            // wrong here — we need the max per-category value across all regions.
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, computeGroupedClassifier)
            }
            computeGroupedClassifier()
        } else {
            // Stacked mode: classifier maps region total → total bar width (unchanged).
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                    applyClassificationToMap(map, out, _getAnchors, 'barTotalCode_', settings.minWidth, settings.maxWidth)
                )
            }
            applyClassificationToMap(out, out, _getAnchors, 'barTotalCode_', settings.minWidth, settings.maxWidth)
        }
        return out
    }
    /**
     * Resolve the pixel width of each bar in grouped mode.
     * If groupWidth_ is explicitly set, use that.
     * Otherwise divide the container width (bbox) by the number of categories.
     * @param {number} n - number of categories
     * @param {DOMRect|null} bbox - bounding box of the container cell, or null
     */
    function _resolvedGroupWidth(n, bbox) {
        const settings = getResponsiveBarSettings()
        if (settings.groupWidth != null) return settings.groupWidth
        if (!bbox || !n) return 9 // safe fallback
        const gap = settings.groupGap
        // total available width = bbox.width; solve for bw: n*bw + (n-1)*gap = bbox.width
        return Math.max(1, (bbox.width - Math.max(0, n - 1) * gap) / n)
    }

    function _effectiveGroupMaxHeight(bbox) {
        const configuredMaxHeight = getResponsiveBarSettings().groupMaxHeight
        if (!out.gridCartogram_ || !bbox) return configuredMaxHeight
        return Math.max(0, Math.min(configuredMaxHeight, bbox.height))
    }

    function _resolvedGroupHeight(rawValue, bbox) {
        if (rawValue <= 0) return 0

        const maxHeight = _effectiveGroupMaxHeight(bbox)
        if (maxHeight <= 0) return 0

        const minHeight = Math.min(getResponsiveBarSettings().groupMinHeight, maxHeight)
        if (!out.gridCartogram_ || !bbox) {
            return Math.min(maxHeight, Math.max(minHeight, out.classifierSize_(rawValue)))
        }

        const height = scaleLinear()
            .domain([0, out._groupedMaxCatValue || 1])
            .range([0, maxHeight])
            .clamp(true)(rawValue)
        return Math.min(maxHeight, Math.max(minHeight, height))
    }

    function _getGridCellShapeBBox(cellSelection) {
        const shapeEl = cellSelection.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
        return shapeEl?.getBBox() || cellSelection.node().getBBox()
    }

    /**
     * For grouped mode: find the maximum individual category value across all
     * regions and all categories, then build a scaleSqrt mapping that value to
     * barGroupMaxHeight. This ensures bars are comparable across regions.
     */
    function computeGroupedClassifier() {
        if (!out.statCodes_) return

        let maxCatValue = out.barSettings_.groupMaxValue || 0

        _getAnchors(out).each(function (rg) {
            const id = rg.properties.id
            for (const code of out.statCodes_) {
                const s = out.statData(code)?.get(id)
                if (s && s.value != null && !isNaN(s.value)) {
                    maxCatValue = Math.max(maxCatValue, s.value)
                }
            }
        })

        // Check if there are custom size legend values that exceed the observed max
        const legendConfig = out.legend()
        if (legendConfig && legendConfig.sizeLegend && Array.isArray(legendConfig.sizeLegend.values)) {
            const maxLegendValue = Math.max(...legendConfig.sizeLegend.values)
            if (maxLegendValue > maxCatValue) {
                maxCatValue = maxLegendValue
            }
        }

        if (maxCatValue === 0) maxCatValue = 1 // guard against empty data

        out._groupedMaxCatValue = maxCatValue
        out.classifierSize_ = scaleLinear().domain([0, maxCatValue]).range([0, getResponsiveBarSettings().groupMaxHeight]).clamp(true)
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'barTotalCode_', out.barSettings_.otherColor, out.barSettings_.otherText)

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
            console.error('Error in bar chart styling: ' + e.message, e)
        }
    }

    /**
     * The "radius" used by the Dorling simulation to prevent chart overlap.
     * Stacked: half the total bar width.
     * Grouped: half the total group footprint width.
     */
    function _getDorlingRadius(regionId) {
        if (out.barSettings_.type === 'grouped') {
            const n = out.statCodes_?.length || 1
            return _groupFootprintWidth(n, null) / 2
        }
        const total = _getRegionTotal(regionId) || 0
        return total ? out.classifierSize_(total) / 2 : 0
    }

    /** Total pixel width of a grouped bar cluster for n categories. */
    function _groupFootprintWidth(n, bbox = null) {
        const settings = getResponsiveBarSettings()
        const bw = _resolvedGroupWidth(n, bbox)
        return n * bw + Math.max(0, n - 1) * settings.groupGap
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
                .attr('class', 'em-bar')
                .attr('id', (rg) => {
                    regionFeatures.push(rg)
                    return 'bar_' + rg.properties.id
                })

            const selector = getRegionsSelector(out)
            const regions = out.svg().selectAll(selector)

            applyCompositionRegionDataFill(
                regions,
                _getComposition,
                (regionId) => hasExplicitNoDataForComposition(map, out, regionId, 'barTotalCode_'),
                out.noDataFillStyle()
            )

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            if (out.barSettings_.type === 'grouped') {
                addGroupedBarChartsToMap(regionFeatures)
            } else {
                addBarChartsToMap(regionFeatures)
            }

            addMouseEventsToRegions(regions, out)
        }

        if (out.patternFill_) {
            applyPatternFill(map, out.patternFill_)
        }
    }

    function applyStyleToGridCartogram(map) {
        const settings = getResponsiveBarSettings()
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'bar_' + rg.properties.id
        })

        if (out.barSettings_.type === 'grouped') {
            addGroupedBarChartsToGridCartogram(regionIds, map)
        } else {
            addBarChartsToGridCartogram(regionIds, map)
        }

        addMouseEventsToGridCartogram(
            out,
            '.barchart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', settings.strokeWidth + 1).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', settings.strokeWidth).style('stroke', settings.strokeFill)
        )
    }

    // ── Stacked bar rendering ────────────────────────────────────────────────

    /**
     * Convert composition proportions into positioned horizontal bar segments.
     * Returns [{x, width, code, color}] for SVG rect elements.
     *
     * The last segment fills any remaining width to avoid floating-point pixel gaps.
     */
    function buildBarSegments(comp, totalWidth) {
        const segments = []
        let x = 0
        const codes = Object.keys(comp)

        for (let i = 0; i < codes.length; i++) {
            const code = codes[i]
            const segWidth = i === codes.length - 1 ? totalWidth - x : Math.max(0, comp[code] * totalWidth)

            if (segWidth > 0) {
                segments.push({ x, width: segWidth, code, color: out.catColors_[code] || 'lightgray' })
                x += segWidth
            }
        }
        return segments
    }

    /**
     * Render a horizontal stacked bar into a container group.
     * Centered at (0, 0): x offset by -totalWidth/2, y offset by -barHeight/2.
     */
    function renderBar(container, comp, totalWidth, animated) {
        const settings = getResponsiveBarSettings()
        const segments = buildBarSegments(comp, totalWidth)
        const h = settings.height
        const r = settings.cornerRadius
        const halfW = totalWidth / 2
        const halfH = h / 2

        const rects = container
            .selectAll('rect')
            .data(segments)
            .join('rect')
            .attr('x', (d) => d.x - halfW)
            .attr('y', -halfH)
            .attr('width', (d) => d.width)
            .attr('height', h)
            .attr('rx', r)
            .attr('ry', r)
            .attr('fill', (d) => d.color)
            .attr('code', (d) => d.code)

        if (animated) {
            rects
                .attr('transform', 'scaleX(0)')
                .transition()
                .delay((d, i) => i * 80)
                .duration(out.transitionDuration_)
                .attr('transform', 'scaleX(1)')
        }

        return rects
    }

    function addBarChartsToMap(regionFeatures) {
        const settings = getResponsiveBarSettings()
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const comp = _getComposition(regionId)
            if (!comp) return

            const total = _getRegionTotal(regionId)
            const totalWidth = out.classifierSize_(total)

            const chartNode = out
                .svg()
                .select('#bar_' + regionId)
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', settings.strokeFill)
                .attr('stroke-width', settings.strokeWidth + 'px')

            renderBar(chartNode, comp, totalWidth, true)

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', settings.strokeWidth + 1)
                        .style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', settings.strokeWidth).style('stroke', settings.strokeFill)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function addBarChartsToGridCartogram(regionIds, map) {
        const settings = getResponsiveBarSettings()
        regionIds.forEach((regionId) => {
            const node = out.svg().select('#bar_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            node.selectAll('.em-bar-chart').remove()

            const bbox = node.node().getBBox()
            const anchor = getGridCartogramChartAnchor(out, bbox)

            const total = _getRegionTotal(regionId)
            const totalWidth = out.classifierSize_(total)

            const g = node
                .append('g')
                .attr('id', 'barchart_' + regionId)
                .attr('class', 'em-bar-chart')
                .attr('transform', `translate(${anchor.x}, ${anchor.y})`)

            const chartNode = g
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', settings.strokeFill)
                .attr('stroke-width', settings.strokeWidth + 'px')

            renderBar(chartNode, comp, totalWidth, true)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })

        adjustGridCartogramTextLabels({
            map,
            getAnchors: _getAnchors,
            getRadius: (regionId) => {
                const total = _getRegionTotal(regionId)
                return total ? out.classifierSize_(total) / 2 : 0
            },
        })
    }

    // ── Grouped vertical bar rendering ────────────────────────────────────────

    /**
     * Build grouped vertical bar segment data from raw category values.
     *
     * Unlike stacked mode (which uses proportions from getComposition),
     * grouped mode uses absolute values — height encodes magnitude, not share.
     *
     * Returns [{x, height, code, color, rawValue}] where x is the left edge of
     * each bar relative to the group center.
     *
     * @param {string} regionId
     * @returns {Array|null}
     */
    function buildGroupedSegments(regionId, bbox) {
        const settings = getResponsiveBarSettings()
        const codes = out.statCodes_
        if (!codes?.length) return null

        const segments = []
        const n = codes.length
        const bw = _resolvedGroupWidth(n, bbox) // ← was: out.barSettings_.groupWidth
        const gap = settings.groupGap
        const totalGroupWidth = n * bw + Math.max(0, n - 1) * gap
        const startX = -totalGroupWidth / 2

        for (let i = 0; i < n; i++) {
            const code = codes[i]
            const s = out.statData(code)?.get(regionId)
            const rawValue = s?.value != null && !isNaN(s.value) ? s.value : 0
            const barHeight = _resolvedGroupHeight(rawValue, bbox)

            segments.push({
                x: startX + i * (bw + gap),
                width: bw,
                height: barHeight,
                code,
                color: out.catColors_[code] || 'lightgray',
                rawValue,
            })
        }

        return segments.some((s) => s.rawValue > 0) ? segments : null
    }

    /**
     * Render a grouped vertical bar chart into a container group.
     * Bars are centered horizontally on (0,0) and grow upward from y=0 (baseline).
     *
     * @param {Object} container - d3 selection of container <g>
     * @param {Array}  segments  - output of buildGroupedSegments
     * @param {boolean} animated
     */
    function renderGroupedBars(container, segments, animated) {
        const r = getResponsiveBarSettings().cornerRadius

        const rects = container
            .selectAll('rect')
            .data(segments)
            .join('rect')
            .attr('x', (d) => d.x)
            .attr('width', (d) => d.width)
            .attr('rx', r)
            .attr('ry', r)
            .attr('fill', (d) => d.color)
            .attr('code', (d) => d.code)

        if (animated) {
            // Start at zero height at the baseline, grow upward
            rects
                .attr('y', 0)
                .attr('height', 0)
                .transition()
                .delay((d, i) => i * 80)
                .duration(out.transitionDuration_)
                .attr('y', (d) => -d.height)
                .attr('height', (d) => d.height)
        } else {
            rects.attr('y', (d) => -d.height).attr('height', (d) => d.height)
        }

        return rects
    }

    function addGroupedBarChartsToMap(regionFeatures) {
        const settings = getResponsiveBarSettings()
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const segments = buildGroupedSegments(regionId, null) // ← null: no bbox in centroid mode
            if (!segments) return

            const chartNode = out
                .svg()
                .select('#bar_' + regionId)
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', settings.strokeFill)
                .attr('stroke-width', settings.strokeWidth + 'px')

            renderGroupedBars(chartNode, segments, true)

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', settings.strokeWidth + 1)
                        .style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', settings.strokeWidth).style('stroke', settings.strokeFill)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function addGroupedBarChartsToGridCartogram(regionIds, map) {
        const settings = getResponsiveBarSettings()
        regionIds.forEach((regionId) => {
            const node = out.svg().select('#bar_' + regionId)
            if (node.empty()) return

            const bbox = _getGridCellShapeBBox(node)
            const segments = buildGroupedSegments(regionId, bbox) // ← pass it in
            if (!segments) return

            node.selectAll('.em-bar-chart').remove()

            const anchor = getGridCartogramChartAnchor(out, bbox)

            const g = node
                .append('g')
                .attr('id', 'barchart_' + regionId)
                .attr('class', 'em-bar-chart')
                .attr('transform', `translate(${anchor.x}, ${anchor.y})`)

            const chartNode = g
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', settings.strokeFill)
                .attr('stroke-width', settings.strokeWidth + 'px')

            renderGroupedBars(chartNode, segments, true)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })

        adjustGridCartogramTextLabels({
            map,
            getAnchors: _getAnchors,
            getRadius: (regionId) => {
                const codes = out.statCodes_
                if (!codes?.length) return 0
                let maxH = 0
                const node = out.svg().select('#bar_' + regionId)
                const bbox = node.empty() ? null : _getGridCellShapeBBox(node)
                for (const code of codes) {
                    const s = out.statData(code)?.get(regionId)
                    const rawValue = s?.value != null && !isNaN(s.value) ? s.value : 0
                    const barHeight = _resolvedGroupHeight(rawValue, bbox)
                    maxH = Math.max(maxH, barHeight)
                }
                return maxH
            },
        })
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    function getResponsiveBarSettings() {
        const scale = getMobileSymbolScale()
        if (scale === 1) return out.barSettings_

        return {
            ...out.barSettings_,
            minWidth: getResponsiveSymbolSize(out.barSettings_.minWidth, 4),
            maxWidth: getResponsiveSymbolSize(out.barSettings_.maxWidth, 6),
            height: getResponsiveSymbolSize(out.barSettings_.height, 2),
            groupWidth: out.barSettings_.groupWidth == null ? out.barSettings_.groupWidth : getResponsiveSymbolSize(out.barSettings_.groupWidth, 1),
            groupGap: getResponsiveSymbolSize(out.barSettings_.groupGap, 0),
            groupMinHeight: getResponsiveSymbolSize(out.barSettings_.groupMinHeight, 1),
            groupMaxHeight: getResponsiveSymbolSize(out.barSettings_.groupMaxHeight, 6),
            strokeWidth: getResponsiveSymbolSize(out.barSettings_.strokeWidth, 0),
            cornerRadius: getResponsiveSymbolSize(out.barSettings_.cornerRadius, 0),
            tooltipWidth: getResponsiveSymbolSize(out.barSettings_.tooltipWidth, 60),
            tooltipHeight: getResponsiveSymbolSize(out.barSettings_.tooltipHeight, 4),
        }
    }

    out.tooltip_.textFunction = function (rg, map) {
        const settings = getResponsiveBarSettings()
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (out.barSettings_.type === 'grouped') {
            return html + buildGroupedTooltipHTML(regionId)
        }

        const comp = _getComposition(regionId)
        if (!comp) {
            html += `<div class="em-tooltip-text">${out.noDataText()}</div>`
            return html
        }

        // Stacked: show proportional bar SVG + breakdown table
        const tw = settings.tooltipWidth
        const th = settings.tooltipHeight
        const segments = buildBarSegments(comp, tw)
        const r = settings.cornerRadius

        let rects = ''
        for (const seg of segments) {
            rects += `<rect x="${seg.x}" y="0" width="${seg.width}" height="${th}"
                      rx="${r}" ry="${r}" fill="${seg.color}"
                      stroke="white" stroke-width="0.5"/>`
        }

        html += `
        <div class="em-tooltip-barchart-container">
            <svg width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}" style="display:block;">
                ${rects}
            </svg>
        </div>`

        html += buildTooltipBreakdownHTML(regionId, out, _getRegionTotal, spaceAsThousandSeparator)
        return html
    }

    /**
     * Build a mini grouped bar chart for the tooltip.
     * Shows the same vertical layout as the map, with value labels below each bar.
     */
    function buildGroupedTooltipHTML(regionId) {
        const settings = getResponsiveBarSettings()
        const codes = out.statCodes_
        if (!codes?.length) return `<div class="em-tooltip-text">${out.noDataText()}</div>`

        // Find if we have any valid data for this region
        let hasData = false
        codes.forEach((code) => {
            const s = out.statData(code)?.get(regionId)
            if (s?.value != null && !isNaN(s.value) && s.value !== ':') hasData = true
        })
        if (!hasData) return `<div class="em-tooltip-text">${out.noDataText()}</div>`

        const gap = settings.groupGap
        const maxH = settings.groupMaxHeight
        const svgW = settings.tooltipWidth
        const valueLabelFontSize = 12
        const valueLabelRowHeight = valueLabelFontSize + 2
        const valueLabelRows = 2
        const bottomPad = valueLabelRows * valueLabelRowHeight + 4
        const svgH = maxH + bottomPad + 4

        // Derive bar width from the fixed svg width, same logic as _resolvedGroupWidth
        const n = codes.length
        const bw = Math.max(1, (svgW - Math.max(0, n - 1) * gap) / n)
        const totalW = n * bw + Math.max(0, n - 1) * gap
        const offsetX = (svgW - totalW) / 2

        let bars = ''
        const lastLabelRightByRow = Array(valueLabelRows).fill(-Infinity)
        codes.forEach((code, i) => {
            const s = out.statData(code)?.get(regionId)
            const rawVal = s?.value != null && !isNaN(s.value) && s.value !== ':' ? s.value : 0
            const barH = Math.max(rawVal > 0 ? settings.groupMinHeight : 0, out.classifierSize_(rawVal))
            const x = offsetX + i * (bw + gap)
            const color = out.catColors_?.[code] || 'lightgray'
            const label = out.catLabels_?.[code] || code
            const fullValStr = formatRawValue(rawVal)
            const valStr = formatRawValue(rawVal)
            const centerX = x + bw / 2
            const estimatedLabelWidth = valStr.length * valueLabelFontSize * 0.62
            const labelLeft = centerX - estimatedLabelWidth / 2
            const labelRight = centerX + estimatedLabelWidth / 2

            let rowIndex = -1
            for (let r = 0; r < valueLabelRows; r++) {
                if (labelLeft > lastLabelRightByRow[r] + 2) {
                    rowIndex = r
                    break
                }
            }
            if (rowIndex >= 0) lastLabelRightByRow[rowIndex] = labelRight
            const labelY = maxH + valueLabelRowHeight * (rowIndex + 1) - 1

            bars += `
        <rect x="${x}" y="${maxH - barH}" width="${bw}" height="${barH}"
              fill="${color}" rx="1" ry="1"/>
        ${
            rowIndex >= 0
                ? `<text x="${centerX}" y="${labelY}" text-anchor="middle"
               font-size="${valueLabelFontSize}" fill="#555"
               title="${label}: ${fullValStr}">${valStr}</text>`
                : ''
        }`
        })

        return `
    <div class="em-tooltip-barchart-container">
        <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;">
            ${bars}
        </svg>
    </div>`
    }

    function compactValue(value) {
        const abs = Math.abs(value)
        if (abs >= 1e9) return `${trimTrailingZero((value / 1e9).toFixed(1))}B`
        if (abs >= 1e6) return `${trimTrailingZero((value / 1e6).toFixed(1))}M`
        if (abs >= 1e3) return `${trimTrailingZero((value / 1e3).toFixed(1))}K`
        return String(Math.round(value))
    }

    function trimTrailingZero(v) {
        return v.endsWith('.0') ? v.slice(0, -2) : v
    }

    // ── Legend ───────────────────────────────────────────────────────────────

    out.getLegendConstructor = function () {
        return BarChartLegend.legend
    }

    return out
}
