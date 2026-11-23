// Max / min bounds of discrete colour legends: the extreme values, their labels and region highlighting
import { select } from 'd3-selection'
import { executeForAllInsets, getLegendRegionsSelector } from '../../core/utils'
import { highlightRegions, getDimmedFill } from '../legend.js'
import { getCentroidsGroup } from '../../core/geo/centroids'
import { swatchStackLayout } from '../legend-swatch'

export function highlightMaxRegion(map, numberOfClasses, id) {
    const ecl = numberOfClasses - 1
    applyMaxMinHighlight(map, ecl, id)
    if (map.insetTemplates_) {
        executeForAllInsets(map.insetTemplates_, map.svgId, (insetMap) => {
            applyMaxMinHighlight(insetMap, ecl, id)
        })
    }
}

export function highlightMinRegion(map, id) {
    const ecl = 0
    applyMaxMinHighlight(map, ecl, id)
    if (map.insetTemplates_) {
        executeForAllInsets(map.insetTemplates_, map.svgId, (insetMap) => {
            applyMaxMinHighlight(insetMap, ecl, id)
        })
    }
}

function applyMaxMinHighlight(map, ecl, id) {
    if (map._mapType === 'ps') {
        applyMaxMinHighlightPs(map, id)
        return
    }

    highlightRegions(map, ecl)
    const selector = getLegendRegionsSelector(map)
    map.svg_
        .selectAll(selector)
        .selectAll(`[ecl='${ecl}']`)
        .each(function (d) {
            if (!d?.properties?.id) return
            if (d.properties.id !== id) select(this).style('fill', getDimmedFill(map))
        })
}

// Isolate a single proportional symbol by region id, dimming every other symbol regardless
// of its class (the max/min region is a single feature, not "the whole top/bottom class").
function applyMaxMinHighlightPs(map, id) {
    const layer = map.activeLayer ? map.activeLayer() : map
    getCentroidsGroup(layer)
        .selectAll('[ecl]')
        .each(function (d) {
            select(this).style('opacity', d?.properties?.id === id ? layer.psFillOpacity_ : '0')
        })
}

/**
 * Work out the max / min bounds of a discrete legend from the stat data: the extreme values, their labels, whether
 * each is worth drawing, and the region highlighting for hovering them. Shared by the vertical and horizontal
 * layouts, which only differ in where the ticks go. Returns null when the legend shows no bounds.
 *
 * @param {Object} out legend instance
 * @param {Object} config legend config (maxMin, maxMinLabels, maxMinRegionLabels)
 * @param {Object} c
 * @param {Object} c.classifier colour classifier (for invertExtent)
 * @param {Function} c.labelFormatter
 * @param {number} c.topEcl class drawn next to the MAX end of the scale
 * @param {number} c.bottomEcl class drawn next to the MIN end of the scale
 */
export function resolveMaxMin(out, config, { classifier, labelFormatter, topEcl, bottomEcl }) {
    const map = out.map
    const stat = out.getColorStats(out)
    if (!(out.maxMin || config.maxMin) || !stat?.getMin || !stat?.getMax) return null
    const globalMin = stat.getMin()
    const globalMax = stat.getMax()
    if (!Number.isFinite(globalMin) || !Number.isFinite(globalMax)) return null

    let minRegionId
    let maxRegionId
    let minRegion
    let maxRegion
    if (stat.getMaxRegionId && stat.getMinRegionId) {
        minRegionId = stat.getMinRegionId()
        maxRegionId = stat.getMaxRegionId()
        const allFeatures = map.Geometries.getAllRegionFeatures()
        const minFeature = allFeatures.find((f) => f.properties.id === minRegionId)
        const maxFeature = allFeatures.find((f) => f.properties.id === maxRegionId)
        if (minFeature) minRegion = minFeature.properties?.na || minRegionId
        if (maxFeature) maxRegion = maxFeature.properties?.na || maxRegionId
    }

    // A top or bottom class holding a single value already shows that value as its threshold label, so the
    // duplicate bound is suppressed. That is a class with equal bounds, or whose inner boundary is the extreme.
    let showMax = true
    let showMin = true
    if (classifier?.invertExtent) {
        const topExtent = classifier.invertExtent(topEcl)
        const bottomExtent = classifier.invertExtent(bottomEcl)
        if (topExtent && (topExtent[0] === topExtent[1] || topExtent[0] === globalMax)) showMax = false
        if (bottomExtent && (bottomExtent[0] === bottomExtent[1] || bottomExtent[1] === globalMin)) showMin = false
    }

    let maxLabel = labelFormatter(globalMax) + (config.maxMinLabels ? config.maxMinLabels[1] : '')
    let minLabel = labelFormatter(globalMin) + (config.maxMinLabels ? config.maxMinLabels[0] : '')
    if (config.maxMinRegionLabels) {
        maxLabel = `${labelFormatter(globalMax)} (${maxRegion})`
        minLabel = `${labelFormatter(globalMin)} (${minRegion})`
    }

    return {
        showMax,
        showMin,
        maxLabel,
        minLabel,
        highlightMax: () => highlightMaxRegion(map, out.getNumberOfClasses(out), maxRegionId),
        highlightMin: () => highlightMinRegion(map, minRegionId),
        unhighlight: () => {
            const unhighlightFunction = out.getUnHighlightFunction(map)
            unhighlightFunction(map)
            if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction)
        },
    }
}

/** MAX and MIN ticks and labels at the two ends of the vertical swatch stack. */
export function appendVerticalMaxMin(out, config, { container, titlePadding, numberOfClasses, sepLineLength, classifier, labelFormatter }) {
    const mm = resolveMaxMin(out, config, {
        classifier,
        labelFormatter,
        topEcl: out.ascending ? numberOfClasses - 1 : 0,
        bottomEcl: out.ascending ? 0 : numberOfClasses - 1,
    })
    if (!mm) return

    const tickX2 = config.maxMinTickLength ? sepLineLength + config.maxMinTickLength : sepLineLength + config.tickLength
    const labelX =
        Math.max(config.shapeWidth, sepLineLength + (config.maxMinTickLength || config.tickLength)) + (config.labelOffsets.x || 0)
    const group = container.append('g').attr('class', 'em-legend-max-min-group')

    const add = (kind, y, text, onOver) => {
        group
            .append('line')
            .attr('class', `em-legend-tick em-legend-tick-${kind}`)
            .attr('x1', 0)
            .attr('y1', y)
            .attr('x2', tickX2)
            .attr('y2', y)
        group
            .append('text')
            .style('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', onOver)
            .on('mouseout', mm.unhighlight)
            .attr('class', `em-legend-label em-legend-label-${kind}`)
            .attr('x', labelX)
            .attr('y', y)
            .attr('dy', '0.3em')
            .text(text)
    }
    if (mm.showMax) add('max', titlePadding, mm.maxLabel, mm.highlightMax)
    if (mm.showMin) add('min', swatchStackLayout({ count: numberOfClasses, shapeHeight: config.shapeHeight, startY: titlePadding }).bottom, mm.minLabel, mm.highlightMin)
}
