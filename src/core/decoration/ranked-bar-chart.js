// ranked-bar-chart.js
import { select } from 'd3-selection'
import { formatDefaultLocale } from 'd3-format'
import { scaleLinear } from 'd3-scale'
import { executeForAllInsets, getTextColorForBackground, getFontSizeFromClass, getRegionsSelector } from '../utils'
import { getCornerPosition, getCornerCoords } from './corner-position'
import { deepMergeExistingKeys } from '../../legend/legend'
import { buildDiscreteLabelFormatter } from '../../legend/legend-discrete'
import { createHistogramLegend } from '../../legend/choropleth/legend-histogram'
import { getChoroplethLabelFormatter } from '../../legend/choropleth/legend-choropleth'
import { getPropSymbolColorLabelFormatter } from '../../legend/proportional-symbol/legend-proportional-symbols'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/core/decoration/RankedBarChartConfig').RankedBarChartConfig} RankedBarChartConfig */

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
// Used for map types/layers that don't classify regions into colored classes (e.g. no classifier
// is configured) - every bar gets this flat color instead of a per-class one.
const FALLBACK_BAR_COLOR = '#7f7f7f'

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
 * A ranked bar chart map element: one horizontal bar per region, sorted by value, labeled with its
 * id and value. Works with any map/layer type that resolves a single numeric value per region -
 * colored by the region's own class color when the layer has one (choropleth, proportional
 * symbols' color encoding), or a flat fallback color otherwise. Falls back to the histogram
 * distribution view when there are too many regions to list individually.
 *
 * A standalone chart element - not a legend and not a sub-feature of one. It has its own
 * svgId/container/positioning, entirely separate from `Legend.legend()`, so it can render into a
 * completely different <svg> to the map's legend.
 *
 * Hovering a bar highlights only that bar's own region on the map (not every region sharing its
 * class/color).
 *
 * @param {MapInstance} map
 * @param {RankedBarChartConfig} [config]
 */
export const rankedBarChart = function (map, config = {}) {
    const out = {}

    if (map.map) {
        out.layer = map
        out.map = map.map
    } else {
        out.layer = map
        out.map = map
    }

    // the SVG where to make the chart
    out.svgId = 'em-ranked-bar-chart-container-' + Math.round(10e4 * Math.random())
    out.svg = undefined
    out.lgg = undefined

    // the chart element position, in case it is embedded within the map SVG
    out.x = undefined
    out.y = undefined
    out.position = undefined

    // the chart box
    out.boxPadding = 7
    out.boxOpacity = 0.9
    out.onlyApplyOpacityWhileZoomed = false

    // chart title/subtitle
    out.title = ''
    out.subtitle = ''
    out.titleFontSize = getFontSizeFromClass('em-ranked-bar-chart-title')
    out.width = 150
    // Maximum total height in pixels for the rendered chart (title/subtitle + bars). Undefined
    // (default) lets the chart grow to fit its content - which for ~35 EU/EFTA/CC regions can
    // easily exceed the map's own height. See drawRankedBarChart() for how this is enforced.
    out.height = undefined

    out.shapeHeight = 20
    out.labelFontSize = getFontSizeFromClass('em-ranked-bar-chart-label')
    out.labelFormatter = null
    out.decimals = undefined
    out.ascending = true

    // Histogram config used for the too-many-regions fallback. Not part of RankedBarChartConfig -
    // always derived internally from the map's own labelType/ascending settings.
    out.histogram = null
    // Consumed by the shared histogram fallback (see legend-histogram.js) - never set here, so the
    // fallback draws without a thresholds/ranges axis. Matches this element's own pre-existing
    // behavior (it never set this either).
    out.labelType = undefined

    // Limit which regions appear to a political grouping ('eu' | 'euEfta' | 'euEftaCc').
    // Undefined (default) means no filtering - every region with a value is shown.
    out.countryGroup = undefined

    formatDefaultLocale({
        decimal: '.',
        thousands: ' ',
        grouping: [3],
        currency: ['', '€'],
    })

    //override attribute values with config values
    for (let key in config) {
        out[key] = config[key]
    }

    // ── Color/classification, generalized across map types ──────────────────────────────────
    // Choropleth and proportional-symbol maps classify regions into colored classes - reuse
    // whichever one the layer has. Any other map/layer type (no classifier configured) falls back
    // to a flat bar color instead of crashing - see FALLBACK_BAR_COLOR in drawRankedBarChart().
    out.getNumberOfClasses = function (out) {
        const layer = out.layer
        const map = out.map
        const mapType = map._mapType
        return layer.numberOfClasses_ !== undefined ? layer.numberOfClasses_ : mapType === 'ps' ? map.psClasses_ : map.numberOfClasses_
    }

    out.getColorClassifier = function (out) {
        const layer = out.layer
        const map = out.map
        const mapType = map._mapType
        return layer.classifier_ !== undefined ? layer.classifier_ : mapType === 'ps' ? map.classifierColor_ : map.classifier_
    }

    out.getClassToFillStyle = function (out) {
        const layer = out.layer
        const map = out.map
        const mapType = map._mapType
        return layer.classToFillStyle_ !== undefined ? layer.classToFillStyle_ : mapType === 'ps' ? map.psClassToFillStyle_ : map.classToFillStyle_
    }

    out.getColorStats = function (out) {
        const layer = out.layer
        const map = out.map

        if (layer.encodings_) {
            if (layer.encodings_['color']) {
                return layer.getEncodingStatData('color')
            }
            if (layer.encodings_['fill']) {
                return layer.getEncodingStatData('fill')
            }
        }

        const colorStat = map.statData('color')
        if (colorStat && colorStat.getArray && colorStat.getArray()?.length > 0) {
            return colorStat
        }

        const defaultStat = map.statData()
        if (defaultStat && defaultStat.getArray && defaultStat.getArray()?.length > 0) {
            return defaultStat
        }

        return map.statData()
    }

    // Only used by the histogram fallback (see legend-histogram.js), which calls it on `out` itself.
    out.getLabelFormatter = function (out) {
        const map = out.map
        const mapType = map._mapType
        if (mapType === 'ps') return getPropSymbolColorLabelFormatter(out)
        return getChoroplethLabelFormatter(out)
    }

    // Merge from layer.rankedBarChart_ (this element's own config), never from layer.legend_ - it
    // is not a legend and must never pick up the legend's config on update.
    out.updateConfig = function () {
        const layer = out.layer
        if (layer.rankedBarChart_) {
            if (layer.rankedBarChart_.svgId !== undefined) out._hasExternalSvgId = true
            deepMergeExistingKeys(out, layer.rankedBarChart_)
        }
    }

    out.build = function () {
        out.svg = select('#' + out.svgId)
        out.svg.selectAll('*').remove()
        out.lgg = out.svg.attr('class', 'em-ranked-bar-chart')
    }

    out.updateContainer = function () {
        const layer = out.layer
        const container = out.lgg
        const chartSvg = out.svg
        container.selectAll('*').remove()

        const needsBuild = layer && container && (!chartSvg || chartSvg.attr('id') !== layer.rankedBarChart_.svgId)
        if (needsBuild) out.build()

        out.applyPosition()
    }

    out.applyPosition = function () {
        const map = out.map
        const container = out.lgg
        if (!map || !container || !container.node()) return

        const hasManualX = out.x != null
        const hasManualY = out.y != null
        const userCornerPosition = getCornerPosition(out.position)
        // Don't fall back to a default 'top right' position for a caller-managed external
        // container (see _hasExternalSvgId in updateConfig()) - the caller positioned it
        // themselves and expects us to leave that transform alone unless they also opt into
        // x/y/position explicitly.
        const autoCornerFallback = !out._hasExternalSvgId
        const cornerPosition = userCornerPosition || (!hasManualX && !hasManualY && autoCornerFallback ? 'top right' : null)
        if (!hasManualX && !hasManualY && !cornerPosition) return

        const bbox = getChartBBox(container, out)
        // Unlike the legend, this element never shares a corner with other instances of itself
        // and doesn't carry a toggle button of its own - no stacking/button-reserve concept here.
        const cornerCoords = cornerPosition ? getCornerCoords(cornerPosition, bbox, map, out.boxPadding) : null

        const x = hasManualX ? out.x : cornerCoords ? cornerCoords.x : map.width() - out.width - out.boxPadding
        const y = hasManualY ? out.y : cornerCoords ? cornerCoords.y : out.boxPadding

        container.attr('transform', `translate(${x},${y})`)
    }

    /** Draw chart background box */
    out.makeBackgroundBox = function () {
        out.lgg.append('rect').attr('id', 'em-ranked-bar-chart-background').attr('class', 'em-ranked-bar-chart-background')
        out.updateBackgroundBoxOpacity()
    }

    /** Keep conditional background opacity synchronized with the current zoom state. */
    out.updateBackgroundBoxOpacity = function () {
        const opacity = out.onlyApplyOpacityWhileZoomed && !out.map.__hasZoomed ? 0 : out.boxOpacity
        out.lgg?.select('#em-ranked-bar-chart-background').style('opacity', opacity)
        return out
    }

    out.addTitle = function () {
        if (out.title) {
            const titlesContainer = out.lgg.append('g').attr('id', 'em-ranked-bar-chart-titles')
            let cssFontSize = getFontSizeFromClass('em-ranked-bar-chart-title')
            titlesContainer
                .append('text')
                .attr('class', 'em-ranked-bar-chart-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + cssFontSize)
                .text(out.title)
        }
    }

    out.addSubtitle = function () {
        if (out.subtitle) {
            const titlesContainer = out.lgg.select('#em-ranked-bar-chart-titles')
            let titleFontSize = getFontSizeFromClass('em-ranked-bar-chart-title')
            let subtitleFontSize = getFontSizeFromClass('em-ranked-bar-chart-subtitle')
            titlesContainer
                .append('text')
                .attr('class', 'em-ranked-bar-chart-subtitle')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + titleFontSize + subtitleFontSize + 3) // 3px padding after title
                .html(out.subtitle)
        }
    }

    out.getBaseY = function () {
        return (
            out.boxPadding +
            (out.title ? getFontSizeFromClass('em-ranked-bar-chart-title') : 0) +
            (out.subtitle ? getFontSizeFromClass('em-ranked-bar-chart-subtitle') : 0) +
            10
        )
    }
    out.getBaseX = function () {
        return out.boxPadding
    }

    /** Set chart box dimensions, ensuring it has suitable dimensions to fit all chart elements */
    out.setBoxDimension = function () {
        if (out.lgg.node()) {
            const bb = out.lgg.node().getBBox({ stroke: true })
            const p = out.boxPadding
            out.svg
                .select('#em-ranked-bar-chart-background')
                .attr('x', bb.x - p)
                .attr('y', bb.y - p)
                .attr('width', bb.width + 2 * p)
                .attr('height', bb.height + 2 * p)
            out.applyPosition()
        }
    }

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (!out.lgg.node()) return

        out.makeBackgroundBox()
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

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

// ── Single-region highlight ──────────────────────────────────────────────────────────────────
// Hovering a bar highlights only that bar's own region, not every region sharing its class/color -
// works across map/layer types since getRegionsSelector() is geometry-based, not tied to a
// specific map type. Mirrors the fill___ / hoverColor_ convention already used for region hover
// elsewhere in the codebase (see map-choropleth.js's own highlightRegion()).

function highlightRegionById(map, regionId) {
    const selector = getRegionsSelector(map)
    const region = map
        .svg()
        .selectAll(selector)
        .filter((d) => d?.properties?.id === regionId)
    if (region.empty()) return
    region.style('fill', map.hoverColor_ || 'orange')
}

function unhighlightRegionById(map, regionId) {
    const selector = getRegionsSelector(map)
    const region = map
        .svg()
        .selectAll(selector)
        .filter((d) => d?.properties?.id === regionId)
    region.each(function () {
        const sel = select(this)
        const original = sel.attr('fill___')
        if (original) sel.style('fill', original)
    })
}

// Chart height varies a lot with the number of regions, so a caller can't reasonably pre-size a
// container for it up front. If the target element is an actual <svg> (as opposed to a <g> nested
// inside an already-correctly-sized parent SVG, e.g. IMAGE's own usage), grow its width/height
// attributes to fit the rendered content - otherwise the SVG's own viewport silently clips
// anything beyond whatever fixed size the caller happened to set.
function resizeContainerToFitContent(out) {
    const node = out.svg?.node()
    if (!node || node.tagName?.toLowerCase() !== 'svg') return

    const background = out.svg.select('#em-ranked-bar-chart-background')
    if (background.empty()) return

    const width = +background.attr('width') || 0
    const height = +background.attr('height') || 0
    if (!width || !height) return

    const currentWidth = +node.getAttribute('width') || 0
    const currentHeight = +node.getAttribute('height') || 0

    if (width > currentWidth) node.setAttribute('width', width)
    if (height > currentHeight) node.setAttribute('height', height)
}

function getChartBBox(container, obj) {
    const node = container.node()
    // Prefer the background rect bounds when available: it represents the visual chart box and
    // is less sensitive to rotated child geometry artifacts.
    const backgroundNode = node?.querySelector?.('#em-ranked-bar-chart-background')
    if (backgroundNode && typeof backgroundNode.getBBox === 'function') {
        try {
            const bgBBox = backgroundNode.getBBox({ stroke: true })
            if (Number.isFinite(bgBBox.width) && Number.isFinite(bgBBox.height) && (bgBBox.width || bgBBox.height)) return bgBBox
        } catch (e) {
            // Fall back to group bbox below.
        }
    }
    try {
        const bbox = node.getBBox({ stroke: true })
        if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && (bbox.width || bbox.height)) return bbox
    } catch (e) {
        // Fall back below when the browser cannot provide a rendered bbox yet.
    }
    return { x: 0, y: 0, width: obj.width || 0, height: obj.height || 0 }
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
        // Too many regions to list individually - show the distribution instead. Pass this
        // element's own class prefix through - it's not a legend, so its histogram fallback
        // shouldn't carry em-legend-* classes either (see legend-histogram.js).
        out.histogram = out.histogram || { orientation: 'horizontal' }
        createHistogramLegend(out, baseX, baseY, 'em-ranked-bar-chart')
        return
    }

    entries.sort((a, b) => (out.ascending ? a.value - b.value : b.value - a.value))

    const classifier = out.getColorClassifier(out)
    const classToFillStyle = out.getClassToFillStyle(out)
    const numberOfClasses = out.getNumberOfClasses(out)
    const hasClassifier = typeof classifier === 'function' && typeof classToFillStyle === 'function'
    // Always format the region's own raw value - never a 'ranges' class-label formatter,
    // regardless of any legend's own labelType setting.
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

    const container = out.lgg.append('g').attr('class', 'em-ranked-bar-chart-list').attr('transform', `translate(0, ${baseY})`)

    entries.forEach((entry, i) => {
        const y = i * rowHeight
        const ecl = hasClassifier ? classifier(entry.value) : null
        const fillColor = hasClassifier ? classToFillStyle(ecl, numberOfClasses) : FALLBACK_BAR_COLOR
        const barWidth = Math.max(barScale(entry.value), 1)
        const barLeftX = barRightX - barWidth
        const itemContainer = container.append('g').attr('class', 'em-ranked-bar-chart-item')

        itemContainer
            .append('rect')
            .attr('class', 'em-ranked-bar-chart-rect')
            .attr('x', barLeftX)
            .attr('y', y)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .style('fill', fillColor)
            .attr('ecl', ecl)
            .on('mouseover', function () {
                highlightRegionById(map, entry.id)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegionById, entry.id)
                }
            })
            .on('mouseout', function () {
                unhighlightRegionById(map, entry.id)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegionById, entry.id)
                }
            })

        // Country code: fixed column starting right after the bars' common right edge.
        itemContainer
            .append('text')
            .attr('class', 'em-ranked-bar-chart-label em-ranked-bar-chart-code')
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
            .attr('class', 'em-ranked-bar-chart-label em-ranked-bar-chart-value')
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
