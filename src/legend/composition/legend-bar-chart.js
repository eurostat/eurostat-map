import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from '../legend'
import { executeForAllInsets } from '../../core/utils'

/**
 * A legend for bar chart maps.
 *
 * Adapts automatically to the map's `barType`:
 *
 * **'stacked'** — shows horizontal example bars at min/mid/max widths, labeled
 * with the corresponding total values, followed by a colour swatch per category.
 *
 * **'grouped'** — shows vertical example bars at min/mid/max heights, labeled
 * with the corresponding individual category values, followed by a colour swatch
 * per category. The bars grow upward from a baseline, matching the map's own
 * visual language.
 *
 * @param {Object} map - The bar chart map instance
 * @param {Object} config - Legend configuration overrides
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    // ── Size legend config ───────────────────────────────────────────────────
    out.sizeLegend = {
        title: null,
        titlePadding: 10,
        values: null, // custom values; null → auto [min, mid, max]
        labelFormatter: undefined,
        noData: false,
        noDataText: 'No data',
    }

    // ── Colour legend config ─────────────────────────────────────────────────
    out.colorLegend = {
        title: null,
        titlePadding: 10,
        marginTop: 20,
        labelOffsets: { x: 5, y: 5 },
        shapeWidth: 25,
        shapeHeight: 20,
        shapePadding: 1,
        noData: true,
        noDataText: 'No data',
    }

    // ── Config override ──────────────────────────────────────────────────────
    if (config) {
        for (const key in config) {
            if (key === 'colorLegend' || key === 'sizeLegend') {
                if (config[key] === false) {
                    out[key] = false
                } else {
                    for (const p in out[key]) {
                        if (config[key][p] !== undefined) out[key][p] = config[key][p]
                    }
                }
            } else {
                out[key] = config[key]
            }
        }
    }

    // ── Update ───────────────────────────────────────────────────────────────

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const lgg = out.lgg
        lgg.selectAll('*').remove()
        out.makeBackgroundBox()

        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        // Size legend — branches on barType
        if (map.classifierSize_) {
            out._sizeLegendContainer = lgg.append('g').attr('class', 'em-bar-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)

            if (map.barType_ === 'grouped') {
                drawGroupedSizeLegend(
                    out,
                    out._sizeLegendContainer,
                    out.sizeLegend.values,
                    map.classifierSize_,
                    out.sizeLegend.title,
                    out.sizeLegend.titlePadding,
                    map.barGroupWidth_,
                    map.barGroupGap_,
                    map.catColors_
                )
            } else {
                drawStackedSizeLegend(
                    out,
                    out._sizeLegendContainer,
                    out.sizeLegend.values,
                    map.classifierSize_,
                    out.sizeLegend.title,
                    out.sizeLegend.titlePadding,
                    map.barHeight_,
                    map.catColors_
                )
            }
        }

        buildColorLegend(out, baseX, baseY)
        out.setBoxDimension()
    }

    // ── Stacked size legend ───────────────────────────────────────────────────

    /**
     * Draw horizontal example bars at representative total values.
     * Bar width encodes the total; segments are equal-width colour slices
     * matching the category colours (shape hint, not real proportions).
     *
     * @param {Object} legend
     * @param {Object} container
     * @param {Array|null} values - Custom values; null → auto [min, mid, max]
     * @param {Function} classifierSize - scale: total → bar width px
     * @param {string|null} title
     * @param {number} titlePadding
     * @param {number} barHeight
     * @param {Object} catColors
     */
    function drawStackedSizeLegend(legend, container, values, classifierSize, title, titlePadding, barHeight, catColors) {
        const domain = classifierSize.domain()
        const legendValues = values || [domain[0], Math.round((domain[0] + domain[1]) / 2), domain[1]]
        const sortedValues = [...legendValues].sort((a, b) => b - a) // largest first

        let y = 0

        if (title) {
            container.append('text').attr('class', 'em-size-legend-title').attr('x', 0).attr('y', y).attr('dominant-baseline', 'hanging').text(title)
            y += legend.titleFontSize + titlePadding
        }

        const maxBarWidth = classifierSize(sortedValues[0])
        const colors = catColors ? Object.values(catColors) : ['#7f7f7f']
        const h = barHeight || 8
        const padding = 2

        for (const val of sortedValues) {
            const barWidth = classifierSize(val)
            const segCount = colors.length || 1
            const segWidth = barWidth / segCount

            for (let i = 0; i < segCount; i++) {
                container
                    .append('rect')
                    .attr('x', i * segWidth)
                    .attr('y', y)
                    .attr('width', segWidth)
                    .attr('height', h)
                    .attr('rx', 1)
                    .attr('ry', 1)
                    .attr('fill', colors[i] || '#7f7f7f')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.3)
            }

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', maxBarWidth + 8)
                .attr('y', y + h / 2)
                .attr('dominant-baseline', 'middle')
                .text(formatValue(val, legend.sizeLegend?.labelFormatter))

            y += h + padding
        }
    }

    // ── Grouped size legend ───────────────────────────────────────────────────

    /**
     * Draw vertical example bars at representative individual category values.
     * Bars grow upward from a baseline; each example uses the first category
     * colour. Labels appear below the baseline, centered under each bar.
     *
     * Three bars are drawn side by side (largest on the left), spaced with
     * the same barGroupGap as the map, so the example clusters look like the
     * actual chart symbols.
     *
     *     ┌──┐
     *     │  │ ┌──┐
     *     │  │ │  │ ┌──┐
     *  ───┴──┴─┴──┴─┴──┴───
     *    100K  50K  10K
     *
     * @param {Object} legend
     * @param {Object} container
     * @param {Array|null} values - Custom values; null → auto
     * @param {Function} classifierSize - scale: category value → bar height px
     * @param {string|null} title
     * @param {number} titlePadding
     * @param {number} barGroupWidth - Individual bar width from map config
     * @param {number} barGroupGap - Gap between bars from map config
     * @param {Object} catColors
     */
    function drawGroupedSizeLegend(legend, container, values, classifierSize, title, titlePadding, barGroupWidth, barGroupGap, catColors) {
        const domain = classifierSize.domain()
        const legendValues = values || [domain[1], Math.round((domain[0] + domain[1]) / 2), Math.max(domain[0], domain[1] * 0.1)]
        const sortedValues = [...legendValues].sort((a, b) => b - a) // largest first

        const bw = 16
        const gap = 30
        const maxBarHeight = classifierSize(sortedValues[0])
        const labelHeight = 16 // space below baseline for value labels
        const colors = catColors ? Object.values(catColors) : ['#7f7f7f']
        const barColor = '#7f7f7f'

        let y = 0

        if (title) {
            container.append('text').attr('class', 'em-size-legend-title').attr('x', 0).attr('y', y).attr('dominant-baseline', 'hanging').text(title)
            y += legend.titleFontSize + titlePadding
        }

        // Baseline at y + maxBarHeight
        const baseline = y + maxBarHeight

        // Thin baseline rule
        const totalRuleWidth = sortedValues.length * bw + (sortedValues.length - 1) * gap
        container
            .append('line')
            .attr('x1', 0)
            .attr('x2', totalRuleWidth)
            .attr('y1', baseline)
            .attr('y2', baseline)
            .attr('stroke', '#aaa')
            .attr('stroke-width', 0.8)

        sortedValues.forEach((val, i) => {
            const barH = classifierSize(val)
            const x = i * (bw + gap)

            // Bar growing upward from baseline
            container
                .append('rect')
                .attr('x', x)
                .attr('y', baseline - barH)
                .attr('width', bw)
                .attr('height', barH)
                .attr('rx', 1)
                .attr('ry', 1)
                .attr('fill', barColor)

            // Value label centered below baseline
            container
                .append('text')
                .attr('class', 'em-legend-label em-bar-grouped-legend-label')
                .attr('x', x + bw / 2)
                .attr('y', baseline + labelHeight - 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(formatValue(val, legend.sizeLegend?.labelFormatter))
        })
    }

    // ── Colour legend ─────────────────────────────────────────────────────────

    function buildColorLegend(out, baseX, baseY) {
        const cfg = out.colorLegend
        if (cfg === false) return

        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-bar-color-legend')

        if (out._sizeLegendContainer) {
            const sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            out._colorLegendContainer.attr('transform', `translate(${baseX}, ${sizeLegendHeight + cfg.marginTop})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX}, ${baseY})`)
        }

        if (cfg.title) {
            out._colorLegendContainer.append('text').attr('class', 'em-color-legend-title').attr('x', 0).attr('y', out.titleFontSize).text(cfg.title)
        }

        const scs = map.catColors()
        let i = 0

        for (const code in scs) {
            const y = cfg.titlePadding + (cfg.title ? out.titleFontSize : 0) + i * (cfg.shapeHeight + cfg.shapePadding)

            out._colorLegendContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', cfg.shapeWidth)
                .attr('height', cfg.shapeHeight)
                .attr('rx', 2)
                .attr('ry', 2)
                .style('fill', scs[code])
                .on('mouseover', function () {
                    highlightRegions(map, code)
                    if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, code)
                })
                .on('mouseout', function () {
                    unhighlightRegions(map)
                    if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions, code)
                })

            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', cfg.shapeWidth + cfg.labelOffsets.x)
                .attr('y', y + cfg.shapeHeight * 0.5)
                .attr('dy', '0.35em')
                .text(map.catLabels()[code] || code)

            i++
        }

        // No-data swatch
        if (cfg.noData) {
            const sizeLegendHeight = out._sizeLegendContainer ? out._sizeLegendContainer.node().getBBox().height : 0

            const y =
                sizeLegendHeight +
                cfg.marginTop +
                out.boxPadding +
                (cfg.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (cfg.shapeHeight + cfg.shapePadding)

            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding}, ${y})`)

            out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
        }
    }

    // ── Highlight helpers ─────────────────────────────────────────────────────

    /**
     * Dim all bar segments then re-highlight the hovered category.
     * Works for both stacked and grouped modes since both use rect[code].
     */
    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.barchart').selectAll('rect[code]')
        allSegments.style('opacity', 0.15)
        allSegments.filter(`rect[code='${code}']`).style('opacity', 1)
    }

    function unhighlightRegions(map) {
        map.svg_.selectAll('.barchart').selectAll('rect[code]').style('opacity', 1)
    }

    // ── Shared utilities ──────────────────────────────────────────────────────

    function formatValue(val, customFormatter) {
        if (customFormatter) return customFormatter(val)
        if (val >= 1_000_000) return format('.1f')(val / 1_000_000) + 'M'
        if (val >= 1_000) return format('.1f')(val / 1_000) + 'K'
        return format('.0f')(val)
    }

    return out
}
