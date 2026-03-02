import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from '../legend'
import { executeForAllInsets } from '../../core/utils'

/**
 * A legend for bar chart maps.
 *
 * Shows:
 *  - A size legend: example bars at min/mid/max widths, labeled with the
 *    corresponding total values. This mirrors the size legend in legend-pie-chart
 *    (circle size) and legend-waffle-chart (waffle size).
 *  - A colour legend: one colour swatch per category with its label.
 *    Hovering a swatch highlights those segments across the map.
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
        labelFormatter: undefined, // custom format function for value labels
        noData: false,
        noDataText: 'No data',
    }

    // ── Colour legend config ─────────────────────────────────────────────────
    out.colorLegend = {
        title: null,
        titlePadding: 10,
        marginTop: 20, // gap between size and colour legend sections
        labelOffsets: { x: 5, y: 5 },
        shapeWidth: 25,
        shapeHeight: 20,
        shapePadding: 1,
        noData: true,
        noDataText: 'No data',
    }

    out._sizeLegendHeight = 0

    // ── Config override ──────────────────────────────────────────────────────
    if (config) {
        for (let key in config) {
            if (key === 'colorLegend' || key === 'sizeLegend') {
                for (let p in out[key]) {
                    if (config[key][p] !== undefined) out[key][p] = config[key][p]
                }
                if (config.colorLegend === false) out.colorLegend = false
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

        // Size legend
        if (map.classifierSize_) {
            out._sizeLegendContainer = lgg.append('g').attr('class', 'em-bar-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)

            drawBarSizeLegend(
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

        // Colour legend
        buildColorLegend(out, baseX, baseY)

        out.setBoxDimension()
    }

    // ── Color legend ─────────────────────────────────────────────────────────

    function buildColorLegend(out, baseX, baseY) {
        const config = out.colorLegend
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-bar-color-legend')

        if (out._sizeLegendContainer) {
            const sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            out._colorLegendContainer.attr('transform', `translate(${baseX},${sizeLegendHeight + out.colorLegend.marginTop})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
        }

        if (config.title) {
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-color-legend-title')
                .attr('x', 0)
                .attr('y', out.titleFontSize)
                .text(config.title)
        }

        const scs = map.catColors()
        let i = 0

        for (const code in scs) {
            const y = config.titlePadding + (config.title ? out.titleFontSize : 0) + i * (config.shapeHeight + config.shapePadding)

            // Colour swatch (bar-shaped to hint at the chart type)
            out._colorLegendContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', config.shapeWidth)
                .attr('height', config.shapeHeight)
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

            // Label
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', config.shapeWidth + config.labelOffsets.x)
                .attr('y', y + config.shapeHeight * 0.5)
                .attr('dy', '0.35em')
                .text(map.catLabels()[code] || code)

            i++
        }

        // No-data entry
        if (config.noData) {
            let sizeLegendHeight = out._sizeLegendContainer ? out._sizeLegendContainer.node().getBBox().height : 0

            const y =
                sizeLegendHeight +
                out.colorLegend.marginTop +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)

            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding},${y})`)

            out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
        }
    }

    // ── Size legend ──────────────────────────────────────────────────────────

    /**
     * Draw example bars at representative sizes with value labels.
     * Bars are rendered as stacked colour segments matching the first category's
     * colour, giving a visual hint about the chart type.
     *
     * @param {Object} legend
     * @param {Object} container - d3 group to draw into
     * @param {Array|null} values - Custom values; null → auto
     * @param {Function} classifierSize - d3 scale mapping totals → widths
     * @param {string|null} title
     * @param {number} titlePadding
     * @param {number} barHeight - Fixed bar height from map config
     * @param {Object} catColors - Category colour map for segment colouring
     */
    function drawBarSizeLegend(legend, container, values, classifierSize, title, titlePadding, barHeight, catColors) {
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
        const padding = 2 // gap between example bars

        for (const val of sortedValues) {
            const barWidth = classifierSize(val)

            // Draw a miniature version of the stacked bar using equal segments per category
            // (we show the shape, not real data proportions, for the size legend)
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

            // Label to the right of the widest bar (so labels stay aligned)
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

    function formatValue(val, customFormatter) {
        if (customFormatter) return customFormatter(val)
        if (val >= 1_000_000) return format('.1f')(val / 1_000_000) + 'M'
        if (val >= 1_000) return format('.1f')(val / 1_000) + 'K'
        return format('.0f')(val)
    }

    // ── Highlight helpers ─────────────────────────────────────────────────────

    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.barchart').selectAll('rect[code]')
        allSegments.style('opacity', 0.15)
        allSegments.filter(`rect[code='${code}']`).style('opacity', 1)
    }

    function unhighlightRegions(map) {
        map.svg_.selectAll('.barchart').selectAll('rect[code]').style('opacity', 1)
    }

    return out
}
