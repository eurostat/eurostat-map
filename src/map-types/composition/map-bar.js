import { select } from 'd3-selection'
import * as StatMap from '../../core/stat-map'
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

/**
 * Returns a proportional stacked bar chart map.
 *
 * Each region displays a proportionally-sized bar divided into category segments.
 * Bar width scales with the total value (like pie radius); bar height is fixed.
 * Categories are stacked horizontally from left to right, making it easy to
 * compare absolute quantities across regions alongside compositional breakdown.
 *
 * @param {*} config
 *
 * @example
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
 */
export const map = function (config) {
    const out = StatMap.statMap(config, true, 'bar')

    // ── Config defaults ──────────────────────────────────────────────────────

    out.dorling_ = config?.dorling || false
    out.animateDorling_ = true

    // Bar sizing: width scales with data, height is fixed
    out.barMinWidth_ = 10 // minimum total bar width in pixels
    out.barMaxWidth_ = 40 // maximum total bar width in pixels
    out.barHeight_ = 8 // fixed bar height in pixels

    // Visual style
    out.barStrokeFill_ = 'white'
    out.barStrokeWidth_ = 0.3
    out.barCornerRadius_ = 1 // rounded corners on bar segments

    // Category data
    out.catColors_ = undefined
    out.catLabels_ = undefined
    out.barOtherColor_ = '#FFCC80'
    out.barOtherText_ = 'Other'
    out.showOnlyWhenComplete_ = false

    // Internal
    out.classifierSize_ = null
    out.barTotalCode_ = undefined
    out.statCodes_ = undefined

    // Tooltip
    out.barTooltipWidth_ = 150 // width of the bar shown in tooltip
    out.barTooltipHeight_ = 20 // height of the bar shown in tooltip

    // ── Getters/setters ──────────────────────────────────────────────────────
    buildGetterSetters(out, [
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'barMaxWidth_',
        'barMinWidth_',
        'barHeight_',
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
        'catColors',
        'catLabels',
        'showOnlyWhenComplete',
        'noDataFillStyle',
        'barMaxWidth',
        'barMinWidth',
        'barHeight',
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

    /**
     * Configure the bar chart map using a single config object.
     *
     * @param {Object} config
     * @param {String} config.eurostatDatasetCode
     * @param {Object} [config.filters]
     * @param {String} [config.unitText]
     * @param {String} config.categoryParameter
     * @param {Array}  config.categoryCodes
     * @param {Array}  [config.categoryLabels]
     * @param {Array}  [config.categoryColors]
     * @param {String} [config.totalCode]
     *
     * @example
     * .statBar({
     *   eurostatDatasetCode: 'tour_occ_nin2',
     *   filters: { unit: 'NR', time: '2022', nace_r2: 'I551-I553' },
     *   unitText: 'Nights',
     *   categoryParameter: 'c_resid',
     *   categoryCodes: ['FOR', 'DOM'],
     *   categoryLabels: ['Foreign', 'Domestic'],
     *   categoryColors: ['#7fc97f', '#beaed4'],
     *   totalCode: 'TOTAL',
     * })
     */
    out.statBar = buildStatCompositionMethod(out, 'barTotalCode_')

    // ── Classification ───────────────────────────────────────────────────────

    //@override
    out.updateClassification = function () {
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, (map) =>
                applyClassificationToMap(map, out, _getAnchors, 'barTotalCode_', out.barMinWidth_, out.barMaxWidth_)
            )
        }
        applyClassificationToMap(out, out, _getAnchors, 'barTotalCode_', out.barMinWidth_, out.barMaxWidth_)
        return out
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
                runDorlingSimulation(out, (d) => {
                    const total = _getRegionTotal(d.properties.id) || 0
                    return total ? out.classifierSize_(total) / 2 : 0
                })
            } else {
                stopDorlingSimulation(out)
            }

            return out
        } catch (e) {
            console.error('Error in bar chart styling: ' + e.message, e)
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

            addBarChartsToMap(regionFeatures)
            addMouseEventsToRegions(regions, out)
        }
    }

    function applyStyleToGridCartogram(map) {
        const regionIds = []
        _getAnchors(map).attr('id', (rg) => {
            regionIds.push(rg.properties.id)
            return 'bar_' + rg.properties.id
        })
        addBarChartsToGridCartogram(regionIds, map)
        addMouseEventsToGridCartogram(
            out,
            '.barchart',
            _getRegionTotal,
            (chart) => chart.style('stroke-width', out.barStrokeWidth_ + 1).style('stroke', 'black'),
            (chart) => chart.style('stroke-width', out.barStrokeWidth_).style('stroke', out.barStrokeFill_)
        )
    }

    // ── Bar chart rendering ──────────────────────────────────────────────────

    /**
     * Convert composition proportions into positioned bar segments.
     * Returns array of {x, width, code, color} for SVG rect elements.
     *
     * @param {Object} comp - Composition object {code: proportion, ...}
     * @param {number} totalWidth - Total bar width in pixels
     * @returns {Array<{x: number, width: number, code: string, color: string}>}
     */
    function buildBarSegments(comp, totalWidth) {
        const segments = []
        let x = 0
        const codes = Object.keys(comp)

        for (let i = 0; i < codes.length; i++) {
            const code = codes[i]
            // Last segment fills remaining width to avoid floating-point gaps
            const segWidth = i === codes.length - 1 ? totalWidth - x : Math.max(0, comp[code] * totalWidth)

            if (segWidth > 0) {
                segments.push({ x, width: segWidth, code, color: out.catColors_[code] || 'lightgray' })
                x += segWidth
            }
        }
        return segments
    }

    /**
     * Render bar segments into an SVG container group.
     * The bar is centered at (0, 0): x offset by -totalWidth/2, y offset by -barHeight/2.
     *
     * @param {Object} container - d3 selection (g element)
     * @param {Object} comp - Composition proportions
     * @param {number} totalWidth - Total bar width in pixels
     * @param {boolean} animated - Whether to animate in
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

            const nodes = out.svg().selectAll('#bar_' + regionId)
            const chartNode = nodes
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
            const anchorX = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.width / 2
            const anchorY = out.gridCartogramShape_ == 'hexagon' ? 0 : bbox.height / 2

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

    // ── Tooltip ──────────────────────────────────────────────────────────────

    const barChartTooltipFunction = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = _getComposition(regionId)

        let html = `<div class="em-tooltip-bar">${regionName}${regionId ? ` (${regionId})` : ''}</div>`

        if (!comp) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        // Build a proportional bar SVG for the tooltip
        const tw = out.barTooltipWidth_
        const th = out.barTooltipHeight_
        const segments = buildBarSegments(comp, tw)
        const r = out.barCornerRadius_

        let rects = ''
        for (const seg of segments) {
            rects += `<rect x="${seg.x}" y="0" width="${seg.width}" height="${th}" rx="${r}" ry="${r}"
                      fill="${seg.color}" stroke="white" stroke-width="0.5"/>`
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

    out.tooltip_.textFunction = barChartTooltipFunction

    // ── Legend ───────────────────────────────────────────────────────────────
    out.getLegendConstructor = function () {
        return BarChartLegend.legend
    }

    return out
}
