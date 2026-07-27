// legend-ranked-bar-chart.js
import { scaleLinear } from 'd3-scale'
import * as Legend from '../legend'
import { deepMergeExistingKeys } from '../legend'
import { executeForAllInsets, getTextColorForBackground } from '../../core/utils'
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
// Gap between the bars' fixed right edge and the country code column that starts there.
const CODE_GAP = 6
// Padding between the value label and the bar edge it sits against, whichever side it ends up on.
const VALUE_PADDING = 5

// EU member states (27).
const EU_CODES = [
    'AT',
    'BE',
    'BG',
    'CY',
    'CZ',
    'DE',
    'DK',
    'EE',
    'EL',
    'ES',
    'FI',
    'FR',
    'HR',
    'HU',
    'IE',
    'IT',
    'LT',
    'LU',
    'LV',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SE',
    'SI',
    'SK',
]
// EFTA member states (4).
const EFTA_CODES = ['IS', 'LI', 'NO', 'CH']
// EU candidate countries. Excludes Kosovo (XK), listed by the EU as a potential candidate
// rather than a candidate. This list changes with real-world accession status more often than
// EU/EFTA membership does, so treat it as best-effort rather than permanently authoritative.
const CANDIDATE_COUNTRY_CODES = ['AL', 'BA', 'GE', 'MD', 'ME', 'MK', 'RS', 'TR', 'UA']

const COUNTRY_GROUP_CODES = {
    eu: EU_CODES,
    euEfta: [...EU_CODES, ...EFTA_CODES],
    euEftaCc: [...EU_CODES, ...EFTA_CODES, ...CANDIDATE_COUNTRY_CODES],
}

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

    // Limit which regions appear to a political grouping ('eu' | 'euEfta' | 'euEftaCc').
    // Undefined (default) means no filtering - every region with a value is shown.
    out.countryGroup = undefined

    // Maximum total height in pixels for the rendered chart (title/subtitle + bars). Undefined
    // (default) lets the chart grow to fit its content - which for ~35 EU/EFTA/CC regions can
    // easily exceed the map's own height. See drawRankedBarChart() for how this is enforced.
    out.height = undefined

    //override attribute values with config values
    for (let key in config) {
        out[key] = config[key]
    }

    // Override the base updateConfig(): the shared Legend.legend() implementation is hardcoded to
    // re-merge from layer.legend_ (the LEGEND's own config), which would silently clobber this
    // object's own config (title, subtitle, countryGroup, ...) with the legend's every update -
    // exactly the "independent element" guarantee this module exists for would otherwise break.
    // Merge from layer.rankedBarChart_ instead, mirroring the base version's own logic.
    out.updateConfig = function () {
        const layer = out.layer
        if (layer.rankedBarChart_) {
            if (layer.rankedBarChart_.svgId !== undefined) out._hasExternalSvgId = true
            deepMergeExistingKeys(out, layer.rankedBarChart_)
        }
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

    let entries = Object.entries(index)
        .filter(([, entry]) => typeof entry?.value === 'number' && Number.isFinite(entry.value))
        .map(([id, entry]) => ({ id, value: entry.value }))

    // Limit to a political grouping if configured, applied before the MAX_BARS check below so
    // e.g. filtering a NUTS0 dataset down to 'eu' can bring a too-large set within the bar limit.
    const allowedCodes = COUNTRY_GROUP_CODES[out.countryGroup]
    if (allowedCodes) {
        entries = entries.filter((e) => allowedCodes.includes(e.id))
    }

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

    // Fit the whole bar list within out.height when set, rather than letting it grow unbounded
    // with region count - all ~35 EU/EFTA/CC countries at the default row height can easily end
    // up taller than the map itself. Bar height and label font size are scaled down together by
    // the same factor so labels stay proportionate to their own (shorter) bars; bar width/x
    // layout is left alone since it doesn't grow with region count the way height does.
    const naturalRowHeight = out.shapeHeight + BAR_HEIGHT_PADDING
    const naturalHeight = entries.length * naturalRowHeight
    const availableHeight = out.height != null ? out.height - baseY : undefined
    const scale = availableHeight != null && availableHeight > 0 && naturalHeight > availableHeight ? availableHeight / naturalHeight : 1

    const barHeight = out.shapeHeight * scale
    const rowHeight = naturalRowHeight * scale
    const fontSize = out.labelFontSize * scale

    // Bars are right-anchored to a common edge and grow leftward as value increases (matching
    // the reference statistical-atlas style), with the country code column starting right after
    // that fixed edge - so the code column stays put regardless of how long any given bar is.
    const barRightX = baseX + MAX_BAR_WIDTH

    const container = out.lgg.append('g').attr('class', 'em-legend-ranked-bar-chart').attr('transform', `translate(0, ${baseY})`)

    entries.forEach((entry, i) => {
        const y = i * rowHeight
        const ecl = classifier(entry.value)
        const fillColor = classToFillStyle(ecl, numberOfClasses)
        const barWidth = Math.max(barScale(entry.value), 1)
        const barLeftX = barRightX - barWidth
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', barLeftX)
            .attr('y', y)
            .attr('width', barWidth)
            .attr('height', barHeight)
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

        // Country code: fixed column starting right after the bars' common right edge.
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label em-legend-ranked-bar-chart-code')
            .attr('text-anchor', 'start')
            .attr('x', barRightX + CODE_GAP)
            .attr('y', y + barHeight)
            .attr('dy', '-0.15em')
            .style('font-size', `${fontSize}px`)
            .text(entry.id)

        // Value: try inside the bar first (right-aligned against its right edge); if it doesn't
        // fit, move it outside, to the left of the bar's own (variable) left edge instead.
        const valueLabel = itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('text-anchor', 'end')
            .attr('x', barRightX - VALUE_PADDING)
            .attr('y', y + barHeight)
            .attr('dy', '-0.15em')
            .style('font-size', `${fontSize}px`)
            .style('fill', getTextColorForBackground(fillColor))
            .text(valueFormatter(entry.value))

        const fitsInsideBar = valueLabel.node().getComputedTextLength() + 2 * VALUE_PADDING <= barWidth
        if (!fitsInsideBar) {
            valueLabel.attr('x', barLeftX - VALUE_PADDING).style('fill', null)
        }
    })
}
