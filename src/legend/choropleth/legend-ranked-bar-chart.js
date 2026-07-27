// legend-ranked-bar-chart.js
import { scaleLinear } from 'd3-scale'
import * as Legend from '../legend'
import { executeForAllInsets } from '../../core/utils'
import { buildDiscreteLabelFormatter } from '../legend-discrete'
import { createHistogramLegend } from './legend-histogram'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/legend/choropleth/RankedBarChartConfig').RankedBarChartConfig} RankedBarChartConfig */

// Above this many eligible regions, drawing one bar per region stops being legible (and for
// NUTS1/2/3 maps could be hundreds/thousands of regions) - fall back to the histogram
// distribution view instead. Comfortably covers country-level maps (EU/EFTA/candidates ~35).
const MAX_BARS = 40

const BAR_HEIGHT_PADDING = 3
const MAX_BAR_WIDTH = 130
const LABEL_BAR_GAP = 4

/**
 * A ranked bar chart element for choropleth-classified maps: one horizontal bar per region,
 * sorted by value, colored by the region's own class color, labeled with its id and value.
 * Falls back to the histogram distribution view when there are too many regions to list
 * individually.
 *
 * Independent of the legend: has its own svgId/positioning (see the base Legend.legend()), so
 * it can render into its own container - including an entirely different <svg> to the legend's -
 * rather than being a sub-feature of it.
 *
 * @param {MapInstance} map
 * @param {RankedBarChartConfig} [config]
 */
export const rankedBarChart = function (map, config = {}) {
    // build generic legend-like object (inherit) - gives us svgId/positioning/build/
    // updateContainer/box-background/getColorStats/getColorClassifier/getClassToFillStyle/
    // getNumberOfClasses/getLabelFormatter for free, exactly like legend-choropleth.js does.
    const out = Legend.legend(map)

    // Histogram config used for the too-many-regions fallback. Not part of RankedBarChartConfig -
    // always derived internally from the map's own labelType/ascending settings.
    out.histogram = null

    //override attribute values with config values
    for (let key in config) {
        out[key] = config[key]
    }

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (!out.lgg.node()) return

        const map = out.layer

        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        //exit early if no classifier
        if (!map.classToFillStyle()) return

        //exit early if stat data not yet available
        if (!out.getColorStats(out)?.getArray()?.length) return

        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        drawRankedBarChart(out, baseX, baseY)

        out.setBoxDimension()
        resizeContainerToFitContent(out)
    }

    return out
}

// Ranked bar chart height varies a lot with the number of regions, so a caller can't reasonably
// pre-size a container for it up front. If the target element is an actual <svg> (as opposed to
// a <g> nested inside an already-correctly-sized parent SVG, e.g. IMAGE's own usage), grow its
// width/height attributes to fit the rendered content - otherwise the SVG's own viewport silently
// clips anything beyond whatever fixed size the caller happened to set.
function resizeContainerToFitContent(out) {
    const node = out.svg?.node()
    if (!node || node.tagName?.toLowerCase() !== 'svg') return

    const background = out.svg.select('#em-legend-background')
    if (background.empty()) return

    const width = +background.attr('width') || 0
    const height = +background.attr('height') || 0
    if (!width || !height) return

    const currentWidth = +node.getAttribute('width') || 0
    const currentHeight = +node.getAttribute('height') || 0

    if (width > currentWidth) node.setAttribute('width', width)
    if (height > currentHeight) node.setAttribute('height', height)
}

function drawRankedBarChart(out, baseX, baseY) {
    const map = out.map
    const stat = out.getColorStats(out)
    const index = stat?.get ? stat.get() : undefined
    if (!index) return

    const entries = Object.entries(index)
        .filter(([, entry]) => typeof entry?.value === 'number' && Number.isFinite(entry.value))
        .map(([id, entry]) => ({ id, value: entry.value }))

    if (!entries.length) return

    if (entries.length > MAX_BARS) {
        // Too many regions to list individually - show the distribution instead.
        out.histogram = out.histogram || { orientation: 'horizontal' }
        createHistogramLegend(out, baseX, baseY)
        return
    }

    entries.sort((a, b) => (out.ascending ? a.value - b.value : b.value - a.value))

    const classifier = out.getColorClassifier(out)
    const classToFillStyle = out.getClassToFillStyle(out)
    const numberOfClasses = out.getNumberOfClasses(out)
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    // Always format the region's own raw value - never the 'ranges' class-label formatter,
    // regardless of the legend's own labelType setting.
    const valueFormatter = buildDiscreteLabelFormatter(out, () => [], stat, 'thresholds', out.labelFormatter)

    const barScale = scaleLinear()
        .domain([0, Math.max(...entries.map((e) => e.value), 0)])
        .range([0, MAX_BAR_WIDTH])

    const rowHeight = out.shapeHeight + BAR_HEIGHT_PADDING

    const container = out.lgg.append('g').attr('class', 'em-legend-ranked-bar-chart').attr('transform', `translate(0, ${baseY})`)

    // Pass 1: draw each row's label (provisionally right-anchored at baseX) and the bar, without
    // knowing the final label column width yet.
    const rows = entries.map((entry, i) => {
        const y = i * rowHeight
        const ecl = classifier(entry.value)
        const fillColor = classToFillStyle(ecl, numberOfClasses)
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        const label = itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('text-anchor', 'end')
            .attr('x', baseX)
            .attr('y', y + out.shapeHeight)
            .attr('dy', '-0.15em')
            .text(`${valueFormatter(entry.value)} ${entry.id}`)

        const bar = itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('y', y)
            .attr('width', Math.max(barScale(entry.value), 1))
            .attr('height', out.shapeHeight)
            .style('fill', fillColor)
            .attr('ecl', ecl)
            .on('mouseover', function () {
                highlightFunction(map, ecl)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightFunction, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map, ecl)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction, ecl)
                }
            })

        return { label, bar }
    })

    // Pass 2: now that every label is rendered, measure the widest one and align the whole
    // column to it (text-anchor 'end' means moving x right-aligns everything consistently,
    // and no label - regardless of how many digits/characters it has - overflows past baseX).
    const maxLabelWidth = Math.max(0, ...rows.map((r) => r.label.node().getComputedTextLength()))
    const barStartX = baseX + maxLabelWidth + LABEL_BAR_GAP

    rows.forEach(({ label, bar }) => {
        label.attr('x', barStartX - LABEL_BAR_GAP)
        bar.attr('x', barStartX)
    })
}
