import { scaleSqrt } from 'd3-scale'
import { select } from 'd3-selection'
import { createStatMap } from '../../core/stat-map'
import * as BarChartLegend from '../../legend/composition/legend-bar-chart'
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

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/map-types/composition/BarMapConfig').BarMapConfig} BarMapConfig */

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
    out.animateDorling_ = true

    // Layout mode: 'stacked' (horizontal, proportional) | 'grouped' (vertical, absolute)
    out.barType_ = 'grouped' // default to grouped for better absolute value comparison; can switch to 'stacked' for proportional view

    // ── Stacked mode sizing ──────────────────────────────────────────────────
    out.barMinWidth_ = 10 // minimum total bar width in pixels
    out.barMaxWidth_ = 40 // maximum total bar width in pixels
    out.barHeight_ = 8 // fixed bar height in pixels

    // ── Grouped mode sizing ──────────────────────────────────────────────────
    out.barGroupWidth_ = 6 // width of each individual bar in pixels
    out.barGroupGap_ = 0 // gap between bars in pixels
    out.barGroupMinHeight_ = 2 // minimum bar height (prevents invisible bars)
    out.barGroupMaxHeight_ = 40 // maximum bar height in pixels

    // ── Visual style (shared) ─────────────────────────────────────────────────
    out.barStrokeFill_ = 'white'
    out.barStrokeWidth_ = 0.3
    out.barCornerRadius_ = 1

    // ── Category data ─────────────────────────────────────────────────────────
    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.barOtherColor_ = '#FFCC80'
    out.barOtherText_ = 'Other'
    out.showOnlyWhenComplete_ = false

    // ── Internal ──────────────────────────────────────────────────────────────
    out.classifierSize_ = null
    out.barTotalCode_ = undefined
    out.statCodes_ = undefined

    // ── Tooltip ───────────────────────────────────────────────────────────────
    out.barTooltipWidth_ = 150
    out.barTooltipHeight_ = 20

    // ── Getters/setters ──────────────────────────────────────────────────────

    buildGetterSetters(out, [
        'barType_',
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'barMaxWidth_',
        'barMinWidth_',
        'barHeight_',
        'barGroupWidth_',
        'barGroupGap_',
        'barGroupMinHeight_',
        'barGroupMaxHeight_',
        'barStrokeFill_',
        'barStrokeWidth_',
        'barCornerRadius_',
        'barOtherColor_',
        'barOtherText_',
        'barTooltipWidth_',
        'barTooltipHeight_',
        'dorling_',
        'animateDorling_',
        'barTotalCode_',
        'statCodes_',
    ])

    applyConfigValues(out, config, [
        'barType',
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'barMaxWidth',
        'barMinWidth',
        'barHeight',
        'barGroupWidth',
        'barGroupGap',
        'barGroupMinHeight',
        'barGroupMaxHeight',
        'barStrokeFill',
        'barStrokeWidth',
        'barCornerRadius',
        'barOtherColor',
        'barOtherText',
        'barTooltipWidth',
        'barTooltipHeight',
        'statCodes',
    ])

    // ── Convenience wrappers ─────────────────────────────────────────────────

    const _getComposition = (id) => getComposition(id, out, 'barTotalCode_')
    const _getRegionTotal = (id) => getRegionTotal(id, out, 'barTotalCode_')
    const _getAnchors = (map) =>
        map.gridCartogram_ ? map.svg().selectAll('#em-grid-container .em-grid-cell') : map.getCentroidsGroup(map).selectAll('g.em-centroid')

    // ── statBar config method ────────────────────────────────────────────────

    out.statBar = buildStatCompositionMethod(out, 'barTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        if (out.barType_ === 'grouped') {
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
                    applyClassificationToMap(map, out, _getAnchors, 'barTotalCode_', out.barMinWidth_, out.barMaxWidth_)
                )
            }
            applyClassificationToMap(out, out, _getAnchors, 'barTotalCode_', out.barMinWidth_, out.barMaxWidth_)
        }
        return out
    }

    /**
     * For grouped mode: find the maximum individual category value across all
     * regions and all categories, then build a scaleSqrt mapping that value to
     * barGroupMaxHeight_. This ensures bars are comparable across regions.
     */
    function computeGroupedClassifier() {
        if (!out.statCodes_) return

        let maxCatValue = 0

        _getAnchors(out).each(function (rg) {
            const id = rg.properties.id
            for (const code of out.statCodes_) {
                const s = out.statData(code)?.get(id)
                if (s && s.value != null && !isNaN(s.value)) {
                    maxCatValue = Math.max(maxCatValue, s.value)
                }
            }
        })

        if (maxCatValue === 0) maxCatValue = 1 // guard against empty data

        out.classifierSize_ = scaleSqrt().domain([0, maxCatValue]).range([0, out.barGroupMaxHeight_]).clamp(true)
    }

    // ── Styling ──────────────────────────────────────────────────────────────

    //@override
    out.updateStyle = function () {
        try {
            if (!out.classifierSize_) return

            ensureCategoryColors(out, 'barTotalCode_', out.barOtherColor_, out.barOtherText_)

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
                    out.dorlingPadding_ || 0
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
        if (out.barType_ === 'grouped') {
            const n = out.statCodes_?.length || 1
            return _groupFootprintWidth(n) / 2
        }
        const total = _getRegionTotal(regionId) || 0
        return total ? out.classifierSize_(total) / 2 : 0
    }

    /** Total pixel width of a grouped bar cluster for n categories. */
    function _groupFootprintWidth(n) {
        return n * out.barGroupWidth_ + Math.max(0, n - 1) * out.barGroupGap_
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
                .attr('class', 'em-bar')
                .attr('id', (rg) => {
                    regionFeatures.push(rg)
                    return 'bar_' + rg.properties.id
                })

            const selector = getRegionsSelector(out)
            const regions = out.svg().selectAll(selector)

            if (map.geo_ !== 'WORLD' && map.nutsLevel_ == 'mixed') {
                styleMixedNUTSRegions(map, regions, _getComposition)
            }

            if (out.barType_ === 'grouped') {
                addGroupedBarChartsToMap(regionFeatures)
            } else {
                addBarChartsToMap(regionFeatures)
            }

            addMouseEventsToRegions(regions, out)
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'bar_' + rg.properties.id
        })

        if (out.barType_ === 'grouped') {
            addGroupedBarChartsToGridCartogram(regionIds, map)
        } else {
            addBarChartsToGridCartogram(regionIds, map)
        }

        addMouseEventsToGridCartogram(
            out,
            '.barchart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.barStrokeWidth_ + 1).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.barStrokeWidth_).style('stroke', out.barStrokeFill_)
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
        const segments = buildBarSegments(comp, totalWidth)
        const h = out.barHeight_
        const r = out.barCornerRadius_
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
                .attr('stroke', out.barStrokeFill_)
                .attr('stroke-width', out.barStrokeWidth_ + 'px')
                .style('pointer-events', 'none')

            renderBar(chartNode, comp, totalWidth, true).on('end', function () {
                select(chartNode.node()).style('pointer-events', null)
            })

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.barStrokeWidth_ + 1)
                        .style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.barStrokeWidth_).style('stroke', out.barStrokeFill_)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function addBarChartsToGridCartogram(regionIds, map) {
        regionIds.forEach((regionId) => {
            const node = out.svg().select('#bar_' + regionId)
            if (node.empty()) return

            const comp = _getComposition(regionId)
            if (!comp) return

            node.selectAll('.em-bar-chart').remove()

            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ === 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ === 'hexagon' ? 0 : bbox.height / 2

            const total = _getRegionTotal(regionId)
            const totalWidth = out.classifierSize_(total)

            const g = node
                .append('g')
                .attr('id', 'barchart_' + regionId)
                .attr('class', 'em-bar-chart')
                .attr('transform', `translate(${anchorX}, ${anchorY})`)

            const chartNode = g
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', out.barStrokeFill_)
                .attr('stroke-width', out.barStrokeWidth_ + 'px')

            renderBar(chartNode, comp, totalWidth, false)

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
    function buildGroupedSegments(regionId) {
        const codes = out.statCodes_
        if (!codes?.length) return null

        const segments = []
        const n = codes.length
        const bw = out.barGroupWidth_
        const gap = out.barGroupGap_
        const totalGroupWidth = _groupFootprintWidth(n)
        const startX = -totalGroupWidth / 2

        for (let i = 0; i < n; i++) {
            const code = codes[i]
            const s = out.statData(code)?.get(regionId)
            const rawValue = s?.value != null && !isNaN(s.value) ? s.value : 0

            const barHeight = Math.max(rawValue > 0 ? out.barGroupMinHeight_ : 0, out.classifierSize_(rawValue))

            segments.push({
                x: startX + i * (bw + gap),
                width: bw,
                height: barHeight,
                code,
                color: out.catColors_[code] || 'lightgray',
                rawValue,
            })
        }

        // Return null if the region has no data at all
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
        const r = out.barCornerRadius_

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
        regionFeatures.forEach((region) => {
            const regionId = region.properties.id
            const segments = buildGroupedSegments(regionId)
            if (!segments) return

            const chartNode = out
                .svg()
                .select('#bar_' + regionId)
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', out.barStrokeFill_)
                .attr('stroke-width', out.barStrokeWidth_ + 'px')
                .style('pointer-events', 'none')

            renderGroupedBars(chartNode, segments, true).on('end', function () {
                select(chartNode.node()).style('pointer-events', null)
            })

            chartNode
                .on('mouseover', function (e, rg) {
                    select(this)
                        .style('stroke-width', out.barStrokeWidth_ + 1)
                        .style('stroke', 'black')
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    select(this).style('stroke-width', out.barStrokeWidth_).style('stroke', out.barStrokeFill_)
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    function addGroupedBarChartsToGridCartogram(regionIds, map) {
        regionIds.forEach((regionId) => {
            const node = out.svg().select('#bar_' + regionId)
            if (node.empty()) return

            const segments = buildGroupedSegments(regionId)
            if (!segments) return

            node.selectAll('.em-bar-chart').remove()

            const bbox = node.node().getBBox()
            const anchorX = out.gridCartogramShape_ === 'hexagon' ? 0 : bbox.width / 2
            // Anchor at center-bottom of cell so bars grow upward into the cell
            const anchorY = out.gridCartogramShape_ === 'hexagon' ? 0 : bbox.height / 2

            const g = node
                .append('g')
                .attr('id', 'barchart_' + regionId)
                .attr('class', 'em-bar-chart')
                .attr('transform', `translate(${anchorX}, ${anchorY})`)

            const chartNode = g
                .append('g')
                .attr('class', 'barchart')
                .attr('stroke', out.barStrokeFill_)
                .attr('stroke-width', out.barStrokeWidth_ + 'px')

            renderGroupedBars(chartNode, segments, false)

            const shapeEl = node.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
            if (shapeEl?.nextSibling) node.node().insertBefore(g.node(), shapeEl.nextSibling)
        })

        adjustGridCartogramTextLabels({
            map,
            getAnchors: _getAnchors,
            getRadius: (regionId) => {
                const n = out.statCodes_?.length || 1
                return _groupFootprintWidth(n) / 2
            },
        })
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────

    out.tooltip_.textFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (out.barType_ === 'grouped') {
            return html + buildGroupedTooltipHTML(regionId)
        }

        const comp = _getComposition(regionId)
        if (!comp) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        // Stacked: show proportional bar SVG + breakdown table
        const tw = out.barTooltipWidth_
        const th = out.barTooltipHeight_
        const segments = buildBarSegments(comp, tw)
        const r = out.barCornerRadius_

        let rects = ''
        for (const seg of segments) {
            rects += `<rect x="${seg.x}" y="0" width="${seg.width}" height="${th}"
                      rx="${r}" ry="${r}" fill="${seg.color}"
                      stroke="white" stroke-width="0.5"/>`
        }

        html += `
        <div class="em-tooltip-barchart-container" style="padding: 6px 0;">
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
        const codes = out.statCodes_
        if (!codes?.length) return `<div>${out.noDataText()}</div>`

        const bw = 16 // slightly wider bars in tooltip for readability
        const gap = 4
        const maxH = out.barTooltipWidth_ * 0.5 // tooltip bar height proportional to width
        const bottomPad = 14 // space below baseline for value labels
        const totalW = codes.length * bw + (codes.length - 1) * gap
        const svgW = Math.max(out.barTooltipWidth_, totalW + 8)
        const svgH = maxH + bottomPad + 4
        const offsetX = (svgW - totalW) / 2

        // Find max value for this region's tooltip scale
        let maxVal = 0
        codes.forEach((code) => {
            const s = out.statData(code)?.get(regionId)
            if (s?.value != null && !isNaN(s.value)) maxVal = Math.max(maxVal, s.value)
        })
        if (maxVal === 0) return `<div>${out.noDataText()}</div>`

        let bars = ''
        codes.forEach((code, i) => {
            const s = out.statData(code)?.get(regionId)
            const rawVal = s?.value != null && !isNaN(s.value) ? s.value : 0
            const barH = (rawVal / maxVal) * maxH
            const x = offsetX + i * (bw + gap)
            const color = out.catColors_?.[code] || 'lightgray'
            const label = out.catLabels_?.[code] || code
            const valStr = spaceAsThousandSeparator(rawVal)

            bars += `
            <rect x="${x}" y="${maxH - barH}" width="${bw}" height="${barH}"
                  fill="${color}" rx="1" ry="1"/>
            <text x="${x + bw / 2}" y="${maxH + bottomPad - 2}"
                  text-anchor="middle" font-size="7" fill="#555"
                  title="${label}">${valStr}</text>`
        })

        // Category color swatches + labels below chart
        let legend = ''
        codes.forEach((code, i) => {
            const color = out.catColors_?.[code] || 'lightgray'
            const label = out.catLabels_?.[code] || code
            legend += `
            <span style="display:inline-flex;align-items:center;gap:3px;margin-right:8px;font-size:11px;">
                <span style="width:8px;height:8px;background:${color};border-radius:1px;display:inline-block;"></span>
                ${label}
            </span>`
        })

        return `
        <div style="padding: 4px 0 2px;">
            <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block;overflow:visible;">
                <line x1="0" y1="${maxH}" x2="${svgW}" y2="${maxH}"
                      stroke="#ccc" stroke-width="0.5"/>
                ${bars}
            </svg>
        </div>
        <div style="padding: 2px 0 4px; line-height: 1.6;">${legend}</div>`
    }

    // ── Legend ───────────────────────────────────────────────────────────────

    out.getLegendConstructor = function () {
        return BarChartLegend.legend
    }

    return out
}
