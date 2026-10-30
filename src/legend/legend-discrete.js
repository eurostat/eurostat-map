// legends for discrete color scales
import { select } from 'd3-selection'
import { format } from 'd3-format'
import { executeForAllInsets, getLegendRegionsSelector, spaceAsThousandSeparator, getFontSizeFromClass, toCategoryEcl } from '../core/utils'
import { highlightRegions, getDimmedFill } from './legend.js'
import { getCentroidsGroup } from '../core/geo/centroids'
//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

// ─────────────────────────────────────────────────────────────────────────────
// Shared formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared label formatter factory for discrete colour legends.
 * Works for both choropleth and prop-symbol colour scales.
 *
 * @param {object} out - legend instance
 * @param {function} getThresholdsFn - map-specific threshold getter, called lazily
 * @param {object} statData - stat data object (may be null)
 * @param {string} labelType - 'thresholds' | 'ranges'
 * @param {function|null} userFormatter - user-supplied override
 * @returns {function}
 */
export function buildDiscreteLabelFormatter(out, getThresholdsFn, statData, labelType, userFormatter) {
    if (userFormatter) {
        return (...args) => normalizeMinus(userFormatter(...args))
    }

    const decimals = resolveDecimals(out, statData)
    const decimalFormatter = format(`,.${decimals}f`)
    const fmt = (value) => normalizeMinus(decimalFormatter(value))

    if (labelType === 'ranges') {
        const thresholds = getThresholdsFn()
        return (label, i) => {
            if (i === 0) return `> ${fmt(thresholds[thresholds.length - 1])}`
            if (i === thresholds.length) return `< ${fmt(thresholds[0])}`
            return `${fmt(thresholds[thresholds.length - i - 1])} − < ${fmt(thresholds[thresholds.length - i])}`
        }
    }

    // thresholds
    return (value) => fmt(value)
}
function normalizeMinus(value) {
    return String(value).replace(/-/g, '−')
}

/**
 * Resolve decimal places: explicit config > auto-detect from data > 0.
 * Checks both root out.decimals and nested out.colorLegend.decimals.
 *
 * @param {object} out - legend instance
 * @param {object} statData - stat data object (may be null)
 * @returns {number}
 */
export function resolveDecimals(out, statData) {
    const explicit =
        typeof out.decimals === 'number' ? out.decimals : typeof out.colorLegend?.decimals === 'number' ? out.colorLegend.decimals : undefined

    if (explicit !== undefined) return explicit
    if (!statData?.getArray) return 0

    const arr = statData.getArray()
    if (!arr?.length) return 0

    const values = arr.filter((v) => Number.isFinite(v))
    if (!values.length) return 0

    let max = 0
    for (const v of values) {
        const str = v.toString()
        if (str.includes('.')) max = Math.max(max, str.split('.')[1].length)
    }
    return max
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing
// ─────────────────────────────────────────────────────────────────────────────

// can either be 'ranges' (e.g. 0-10, 10-20) or 'thresholds' (e.g. 0, 10, 20 with ticks)
export function drawDiscreteLegend(out, x, y) {
    // container
    out._discreteLegendContainer = out.lgg.append('g').attr('class', 'em-discrete-legend-container').attr('transform', `translate(${x},${y})`)

    // title
    if (out.colorLegend?.title) {
        out._discreteLegendContainer
            .append('text')
            .attr('class', 'em-color-legend-title')
            .attr('id', 'em-color-legend-title')
            .attr('x', 0)
            .attr('y', 0)
            .text(out.colorLegend.title)
    }

    // subtitle
    if (out.colorLegend?.subtitle) {
        const titleH = out.colorLegend.title ? getFontSizeFromClass('em-color-legend-title') + 2 : 0
        out._discreteLegendContainer.append('text').attr('class', 'em-legend-subtitle').attr('x', 0).attr('y', titleH).html(out.colorLegend.subtitle)
    }

    // choropleths dont have multiple visual variables (yet), so we use the root legend config
    const config = out.map._mapType == 'ps' ? out.colorLegend : out // Use out.colorLegend for proportional symbols, out for choropleth

    const horizontal = config.orientation === 'horizontal'

    // thresholds vs ranges
    if (horizontal) {
        createHorizontalLegend(out, config)
    } else if (out.labelType === 'ranges' || out.colorLegend?.labelType === 'ranges') {
        createRangesLegend(out, config)
    } else {
        createThresholdsLegend(out, config)
    }

    if (horizontal) {
        appendHorizontalExtraItems(out, config)
        return
    }

    // Optionally add no-data
    if (config.noData) {
        let y = out.getNumberOfClasses(out) * config.shapeHeight + getTitlePadding(out) + 3 // 3px padding
        const x = 0
        if (config.pointOfDivergence && config.pointOfDivergencePadding) y += config.pointOfDivergencePadding // shift legend items down after point of divergence
        const container = out._discreteLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        const highlightFunction = out.getHighlightFunction(out.map)
        const unhighlightFunction = out.getUnHighlightFunction(out.map)
        out.appendNoDataLegend(container, config.noDataText, highlightFunction, unhighlightFunction)
    }

    // Optionally add extra categorical classes mixed into this choropleth's classification
    // (e.g. a "no railway lines" class alongside numeric electrification-rate classes)
    let categoryY = out.getNumberOfClasses(out) * config.shapeHeight + getTitlePadding(out) + 3
    if (config.pointOfDivergence && config.pointOfDivergencePadding) categoryY += config.pointOfDivergencePadding
    if (config.noData) categoryY += out.noDataShapeHeight + out.noDataPadding // stack below the no-data box
    appendCategoryLegendItems(out, categoryY)
}

/**
 * Appends one legend swatch per extra categorical class (out.layer.categoryFillStyle_/
 * categoryText_ - e.g. IMAGE's "edit classification" categories) into out._discreteLegendContainer,
 * stacked starting at startY. Shared by drawDiscreteLegend() (choropleth/prop-symbol maps that
 * already have a numeric color classifier) and callers that only have categories and no numeric
 * classifier at all (e.g. a size-only proportional-symbol map - see legend-proportional-symbols.js).
 * No-ops if there are no categories configured.
 */
export function appendCategoryLegendItems(out, startY) {
    const categoryFillStyle = out.layer?.categoryFillStyle_
    if (!categoryFillStyle) return
    const categoryText = out.layer.categoryText_
    let y = startY
    const highlightFunction = out.getHighlightFunction(out.map)
    const unhighlightFunction = out.getUnHighlightFunction(out.map)
    Object.keys(categoryFillStyle).forEach((rawValue) => {
        const container = out._discreteLegendContainer.append('g').attr('class', 'em-category-legend').attr('transform', `translate(0,${y})`)
        const text = (categoryText && categoryText[rawValue]) || rawValue
        out.appendCategoryLegend(container, toCategoryEcl(rawValue), categoryFillStyle[rawValue], text, highlightFunction, unhighlightFunction)
        y += out.noDataShapeHeight + out.noDataPadding
    })
}

/**
 * Horizontal variant of the discrete legend (orientation: 'horizontal'): one contiguous bar of
 * class swatches running low -> high from left to right, `config.width` pixels wide in total
 * (shared equally between the classes), with the class thresholds (labelType 'thresholds') labelled
 * under the seams between swatches, or each class's range (labelType 'ranges') centred under its
 * own swatch. Supports the same maxMin / maxMinLabels / maxMinRegionLabels and point-of-divergence
 * options as the vertical layout (the divergence line is vertical, with its arrows pointing left/right).
 */
function createHorizontalLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const n = out.getNumberOfClasses(out)
    const titlePadding = getTitlePadding(out)
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    const classifier = out.getColorClassifier(out)
    const classToFillStyle = out.getClassToFillStyle(out)
    const labelFormatter = out.getLabelFormatter(out)
    const ranges = out.labelType === 'ranges' || out.colorLegend?.labelType === 'ranges'
    const barWidth = config.width ?? out.width
    const tickLength = config.tickLength ?? 4
    const barBottom = titlePadding + config.shapeHeight
    const labelY = barBottom + tickLength + 2
    const labelFontSize = getFontSizeFromClass('em-legend-label') || 12

    // Point of divergence: s = number of classes to the left of the divergence seam. The config index counts
    // from the top of the equivalent vertical legend, so it is mirrored when the vertical one would be ascending.
    const hasDivergence = !!config.pointOfDivergenceLabel && config.pointOfDivergence != null
    let s = null
    if (hasDivergence) {
        const idx = config.pointOfDivergence
        s = out.ascending ? n - idx : idx
        if (!(s >= 0 && s <= n)) s = null
    }
    // in 'ranges' mode the classes after the divergence seam shift right to leave a gap for the line
    const gap = s !== null && ranges ? (config.pointOfDivergencePadding ?? 0) : 0
    const itemWidth = (barWidth - gap) / n
    const itemX = (j) => j * itemWidth + (gap && j >= s ? gap : 0)
    // x of the seam between class j and j+1
    const seamX = (j) => (j + 1) * itemWidth + (gap && j + 1 > s ? gap : 0)

    // low -> high from left to right, whichever way the vertical legend would be ordered
    for (let j = 0; j < n; j++) {
        const x = itemX(j)
        const ecl = j
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', titlePadding)
            .attr('width', itemWidth)
            .attr('height', config.shapeHeight)
            .style('fill', classToFillStyle(ecl, n))
            .on('mouseover', function () {
                highlightFunction(map, ecl)
                if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, highlightFunction, ecl)
            })
            .on('mouseout', function () {
                unhighlightFunction(map, ecl)
                if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction, ecl)
            })

        if (j > 0 && !(gap && j === s)) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-separator')
                .attr('x1', x)
                .attr('y1', titlePadding)
                .attr('x2', x)
                .attr('y2', barBottom)
        }

        if (ranges) {
            // vertical-legend index of this class, as labelFormatter's 'ranges' mode expects
            const i = out.ascending ? n - 1 - j : j
            const text = config.labels
                ? config.labels[i]
                : classifier?.invertExtent
                  ? labelFormatter(classifier.invertExtent(ecl)[out.ascending ? 0 : 1], i)
                  : ''
            itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', x + itemWidth / 2)
                .attr('y', barBottom + 4)
                .attr('dy', '0.9em')
                .attr('text-anchor', 'middle')
                .text(text)
        } else if (j < n - 1) {
            // threshold between class j and j+1
            const sx = seamX(j)
            itemContainer
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', sx)
                .attr('y1', barBottom)
                .attr('x2', sx)
                .attr('y2', barBottom + tickLength)
            const text = config.labels
                ? config.labels[out.ascending ? n - 2 - j : j]
                : classifier?.invertExtent
                  ? labelFormatter(classifier.invertExtent(ecl)[1])
                  : ''
            const label = itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', sx)
                .attr('y', labelY)
                .attr('dy', '0.9em')
                .attr('text-anchor', 'middle')
                .text(text)
            // mark the label at the divergence seam so drawHorizontalDivergence can move it
            if (hasDivergence && j + 1 === s) label.attr('class', 'em-legend-label em-legend-label-divergence')
        }
    }

    // Range labels are wide ('98.9 − < 133.9'): when neighbours would touch, alternate them onto a second row
    if (ranges) {
        const rowEnds = [-Infinity, -Infinity]
        container.selectAll('.em-legend-item > text.em-legend-label').each(function () {
            const box = this.getBBox()
            let row = rowEnds[0] + 3 < box.x ? 0 : rowEnds[1] + 3 < box.x ? 1 : 0
            if (row === 1) select(this).attr('y', barBottom + 4 + labelFontSize + 2)
            rowEnds[row] = box.x + box.width
        })
    }

    // Max / min bounds: a tick and label at each end of the bar, from the stat data extent
    const stat = out.getColorStats(out)
    // (like the vertical legend, bounds only exist for threshold labels)
    if (!ranges && (out.maxMin || config.maxMin) && stat?.getMin && stat?.getMax && Number.isFinite(stat.getMin()) && Number.isFinite(stat.getMax())) {
        drawHorizontalMaxMin(out, config, { n, barWidth, barBottom, labelY, tickLength, labelFontSize, classifier, labelFormatter, stat })
    }

    // Point of divergence line + labels (drawn last so it can see the label sizes)
    if (hasDivergence && s !== null) {
        const xSeam = s * itemWidth + gap / 2
        drawHorizontalDivergence(out, config, { xSeam, barWidth, titlePadding, tickLength, labelFontSize })
    }
}

function drawHorizontalMaxMin(out, config, c) {
    const { n, barWidth, barBottom, labelY, tickLength, labelFontSize, classifier, labelFormatter, stat } = c
    const map = out.map
    const container = out._discreteLegendContainer
    const globalMin = stat.getMin()
    const globalMax = stat.getMax()
    let globalMinRegionId
    let globalMaxRegionId
    let globalMinRegion
    let globalMaxRegion
    if (stat.getMaxRegionId && stat.getMinRegionId) {
        globalMinRegionId = stat.getMinRegionId()
        globalMaxRegionId = stat.getMaxRegionId()
        const allFeatures = map.Geometries.getAllRegionFeatures()
        const minFeature = allFeatures.find((f) => f.properties.id === globalMinRegionId)
        const maxFeature = allFeatures.find((f) => f.properties.id === globalMaxRegionId)
        if (minFeature) globalMinRegion = minFeature.properties?.na || globalMinRegionId
        if (maxFeature) globalMaxRegion = maxFeature.properties?.na || globalMaxRegionId
    }

    // a single-value top/bottom class already shows the same value as its threshold label
    let showMax = true
    let showMin = true
    if (classifier?.invertExtent) {
        const topExtent = classifier.invertExtent(n - 1)
        const bottomExtent = classifier.invertExtent(0)
        if (topExtent && (topExtent[0] === topExtent[1] || topExtent[0] === globalMax)) showMax = false
        if (bottomExtent && (bottomExtent[0] === bottomExtent[1] || bottomExtent[1] === globalMin)) showMin = false
    }

    let maxLabel = labelFormatter(globalMax) + (config.maxMinLabels ? config.maxMinLabels[1] : '')
    let minLabel = labelFormatter(globalMin) + (config.maxMinLabels ? config.maxMinLabels[0] : '')
    if (config.maxMinRegionLabels) {
        maxLabel = `${labelFormatter(globalMax)} (${globalMaxRegion})`
        minLabel = `${labelFormatter(globalMin)} (${globalMinRegion})`
    }

    const group = container.append('g').attr('class', 'em-legend-max-min-group')
    const tickEnd = barBottom + (config.maxMinTickLength ?? tickLength)
    const unhighlight = () => {
        const unhighlightFunction = out.getUnHighlightFunction(map)
        unhighlightFunction(map)
        if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction)
    }
    const add = (isMax, x, text, onOver) => {
        const kind = isMax ? 'max' : 'min'
        const tick = group
            .append('line')
            .attr('class', `em-legend-tick em-legend-tick-${kind}`)
            .attr('x1', x)
            .attr('y1', barBottom)
            .attr('x2', x)
            .attr('y2', tickEnd)
        const label = group
            .append('text')
            .style('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', onOver)
            .on('mouseout', unhighlight)
            .attr('class', `em-legend-label em-legend-label-${kind}`)
            .attr('x', x)
            .attr('y', labelY)
            .attr('dy', '0.9em')
            // end labels are anchored inwards so they never stick out of the legend box
            .attr('text-anchor', isMax ? 'end' : 'start')
            .text(text)
        return { tick, label }
    }
    const items = []
    if (showMin) items.push(add(false, 0, minLabel, () => highlightMinRegion(map, globalMinRegionId)))
    if (showMax) items.push(add(true, barWidth, maxLabel, () => highlightMaxRegion(map, n, globalMaxRegionId)))

    // if an end label runs into a neighbouring threshold label, drop it onto a second row
    const others = container
        .selectAll('.em-legend-label')
        .filter(function () {
            return !this.classList.contains('em-legend-label-max') && !this.classList.contains('em-legend-label-min')
        })
        .nodes()
    items.forEach(({ tick, label }) => {
        const box = label.node().getBBox()
        const clash = others.some((o) => {
            const ob = o.getBBox()
            return ob.x < box.x + box.width + 2 && ob.x + ob.width + 2 > box.x
        })
        if (clash) {
            const rowY = labelY + labelFontSize + 4
            label.attr('y', rowY)
            tick.attr('y2', rowY)
        }
    })
}

function drawHorizontalDivergence(out, config, c) {
    const { xSeam, barWidth, titlePadding, tickLength, labelFontSize } = c
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const labels = config.pointOfDivergenceLabel.split('|')

    // the line runs down from the top of the bar, past the labels
    const lineLength = config.divergingLineLength || config.shapeHeight + tickLength + 2 + labelFontSize + (config.divergingLinePadding ?? 15)
    const yEnd = titlePadding + lineLength
    const showDivergingLine = config.showDivergingLine ?? true
    if (showDivergingLine) {
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', titlePadding)
            .attr('x2', xSeam)
            .attr('y2', yEnd)
        const tickLen = config.tickLength || 5
        container
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', xSeam - tickLen / 2)
            .attr('y1', yEnd)
            .attr('x2', xSeam + tickLen / 2)
            .attr('y2', yEnd)
    }

    if (labels.length > 1) {
        // arrows pointing left (lower values) and right (higher values). labels[0] is the "top" label of the
        // vertical legend, i.e. the high end when ascending, so it goes on the right in that case.
        const rightText = out.ascending ? labels[0] : labels[1]
        const leftText = out.ascending ? labels[1] : labels[0]
        const arrowLength = config.divergingArrowLength || 30
        const atExtremes = config.pointOfDivergenceLabelsAtExtremes ?? false
        const stacked = config.pointOfDivergenceLabelsStacked ?? false

        const defs = container.append('defs')
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', markerHeight)
            .attr('markerHeight', markerHeight)
            .attr('refX', 0)
            .attr('refY', markerHeight / 2)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', `0 0, ${markerHeight} ${markerHeight / 2}, 0 ${markerHeight}`)
            .attr('fill', 'black')

        const makeLabel = (text, x, y, anchor, dy) =>
            container.append('text').attr('class', 'em-legend-label').attr('x', x).attr('y', y).attr('dy', dy).attr('text-anchor', anchor).text(text)

        // when the labels sit at the extremes, draw them first so the arrows can stretch up to them
        let leftLen = arrowLength
        let rightLen = arrowLength
        if (atExtremes) {
            const leftLabel = makeLabel(leftText, 0, yEnd, 'start', '0.3em')
            const rightLabel = makeLabel(rightText, barWidth, yEnd, 'end', '0.3em')
            if (config.divergingArrowLength == null) {
                leftLen = Math.max(xSeam - leftLabel.node().getBBox().width - 10, markerHeight)
                rightLen = Math.max(barWidth - xSeam - rightLabel.node().getBBox().width - 10, markerHeight)
            }
        }
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', yEnd)
            .attr('x2', xSeam - leftLen)
            .attr('y2', yEnd)
            .attr('marker-end', 'url(#arrowhead)')
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', yEnd)
            .attr('x2', xSeam + rightLen)
            .attr('y2', yEnd)
            .attr('marker-end', 'url(#arrowhead)')

        if (!atExtremes) {
            if (stacked) {
                // above each arrow, running outwards from the line
                makeLabel(leftText, xSeam - 6, yEnd - 4, 'end', '0')
                makeLabel(rightText, xSeam + 6, yEnd - 4, 'start', '0')
            } else {
                // beyond each arrow tip
                makeLabel(leftText, xSeam - leftLen - 8, yEnd, 'end', '0.3em')
                makeLabel(rightText, xSeam + rightLen + 8, yEnd, 'start', '0.3em')
            }
        }

        // the threshold value at the divergence seam would sit under the line: move it below the arrows' junction
        if (showDivergingLine) {
            out._discreteLegendContainer.selectAll('.em-legend-label-divergence').each(function () {
                container.node().appendChild(this)
            })
            container
                .selectAll('.em-legend-label-divergence')
                .attr('x', xSeam)
                .attr('y', yEnd + 4)
                .attr('dy', '0.9em')
        }
    } else {
        // single label under the end of the line; it replaces the threshold value at that seam
        container
            .append('text')
            .attr('class', 'em-legend-diverging-label em-legend-label')
            .attr('x', xSeam)
            .attr('y', yEnd + 4)
            .attr('dy', '0.9em')
            .attr('text-anchor', 'middle')
            .text(config.pointOfDivergenceLabel)
        if (showDivergingLine) out._discreteLegendContainer.selectAll('.em-legend-label-divergence').remove()
    }
}

/** No-data and extra category swatches for the horizontal layout: a row to the right of the bar. */
function appendHorizontalExtraItems(out, config) {
    const barWidth = config.width ?? out.width
    const titlePadding = getTitlePadding(out)
    const highlightFunction = out.getHighlightFunction(out.map)
    const unhighlightFunction = out.getUnHighlightFunction(out.map)
    const gap = 16
    let x = barWidth + gap
    const place = (cls, draw) => {
        const container = out._discreteLegendContainer.append('g').attr('class', cls).attr('transform', `translate(${x},${titlePadding})`)
        draw(container)
        x += container.node().getBBox().width + gap
    }
    if (config.noData) {
        place('em-no-data-legend', (c) => out.appendNoDataLegend(c, config.noDataText, highlightFunction, unhighlightFunction))
    }
    const fills = out.layer?.categoryFillStyle_
    if (fills) {
        const texts = out.layer.categoryText_
        Object.keys(fills).forEach((raw) =>
            place('em-category-legend', (c) =>
                out.appendCategoryLegend(c, toCategoryEcl(raw), fills[raw], (texts && texts[raw]) || raw, highlightFunction, unhighlightFunction)
            )
        )
    }
}

function getTitlePadding(out) {
    // Calculate the padding between the title and the first legend item
    const map = out.map
    let p = map._mapType == 'ps' ? out.colorLegend.titlePadding : out.titlePadding || 0
    if (out.maxMin) p += 10 // extra padding if max/min labels are shown
    if (out.colorLegend?.subtitle) p += getFontSizeFromClass('em-legend-subtitle') + 2
    return p
}

function createThresholdsLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const numberOfClasses = out.getNumberOfClasses(out)
    const titlePadding = getTitlePadding(out)
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    const classifier = out.getColorClassifier(out)
    const classToFillStyle = out.getClassToFillStyle(out)
    const stat = out.getColorStats(out)
    const sepLineLength = config.sepLineLength ?? config.shapeWidth

    // Label formatter
    const labelFormatter = out.getLabelFormatter(out)

    // ---- Correct global min/max from statData ----
    let globalMin
    let globalMax
    let globalMinRegionId
    let globalMaxRegionId
    let globalMinRegion
    let globalMaxRegion
    if ((out.maxMin || config.maxMin) && stat) {
        if (stat?.getMin && stat?.getMax) {
            globalMin = stat.getMin()
            globalMax = stat.getMax()
        }
        if (stat?.getMaxRegionId && stat?.getMinRegionId) {
            globalMinRegionId = stat.getMinRegionId()
            globalMaxRegionId = stat.getMaxRegionId()
            const allFeatures = map.Geometries.getAllRegionFeatures()
            const minFeature = allFeatures.find((f) => f.properties.id === globalMinRegionId)
            const maxFeature = allFeatures.find((f) => f.properties.id === globalMaxRegionId)
            if (minFeature) globalMinRegion = minFeature.properties?.na || globalMinRegionId
            if (maxFeature) globalMaxRegion = maxFeature.properties?.na || globalMaxRegionId
        }
    }

    for (let i = 0; i < numberOfClasses; i++) {
        const y = i * config.shapeHeight + titlePadding
        const x = 0
        const ecl = out.ascending ? numberOfClasses - i - 1 : i
        const fillColor = classToFillStyle(ecl, numberOfClasses)
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        // Append rectangle for each class
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.shapeWidth)
            .attr('height', config.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                //select(this).raise().raise()
                highlightFunction(map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightFunction, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightFunction, ecl)
                }
            })

        // Append separation line
        if (i > 0) {
            itemContainer.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', sepLineLength).attr('y2', y)
        }

        // Append tick line at each internal boundary
        if (i > 0) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', sepLineLength)
                .attr('y1', y)
                .attr('x2', sepLineLength + config.tickLength)
                .attr('y2', y)
        }

        // Append label at internal boundaries
        if (i < numberOfClasses - 1) {
            // mark label so we can move it in drawDivergingLine
            const label = itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', Math.max(config.shapeWidth, sepLineLength + config.tickLength) + (config.labelOffsets.x || 0))
                .attr('y', y + config.shapeHeight)
                .attr('dy', '0.3em') // ~vertical centering
                .text(() => {
                    if (config.labels) return config.labels[i]

                    if (classifier?.invertExtent) {
                        const range = classifier.invertExtent(ecl)
                        return labelFormatter(range[out.ascending ? 0 : 1])
                    }
                    return map.noDataText_ || ''
                })

            // mark label so we can move it in drawDivergingLine
            if (config.pointOfDivergenceLabel && i == config.pointOfDivergence - 1) label.attr('class', 'em-legend-label em-legend-label-divergence')
        }
    }

    // Add MIN and MAX ticks at the ends of the scale using statData extent
    if ((out.maxMin || config.maxMin) && Number.isFinite(globalMin) && Number.isFinite(globalMax)) {
        // Detect if the top or bottom class is a single-value class.
        // When that happens, the threshold label already shows the same value,
        // so we suppress the duplicate max/min boundary label.
        let showMax = true
        let showMin = true
        if (classifier?.invertExtent) {
            const topClassEcl = out.ascending ? numberOfClasses - 1 : 0
            const bottomClassEcl = out.ascending ? 0 : numberOfClasses - 1
            const topExtent = classifier.invertExtent(topClassEcl)
            const bottomExtent = classifier.invertExtent(bottomClassEcl)
            // A class with equal bounds, or whose inner boundary equals the global extreme,
            // contains only one distinct value and would duplicate the threshold label.
            if (topExtent && (topExtent[0] === topExtent[1] || topExtent[0] === globalMax)) showMax = false
            if (bottomExtent && (bottomExtent[0] === bottomExtent[1] || bottomExtent[1] === globalMin)) showMin = false
        }

        const tickX1 = 0
        const tickX2 = config.maxMinTickLength ? sepLineLength + config.maxMinTickLength : sepLineLength + config.tickLength
        const labelX = config.maxMinTickLength
            ? Math.max(config.shapeWidth, sepLineLength + config.maxMinTickLength) + (config.labelOffsets.x || 0)
            : Math.max(config.shapeWidth, sepLineLength + config.tickLength) + (config.labelOffsets.x || 0)

        let maxLabel = labelFormatter(globalMax) + (config.maxMinLabels ? config.maxMinLabels[1] : '')
        let minLabel = labelFormatter(globalMin) + (config.maxMinLabels ? config.maxMinLabels[0] : '')

        if (config.maxMinRegionLabels) {
            maxLabel = `${labelFormatter(globalMax)} (${globalMaxRegion})`
            minLabel = `${labelFormatter(globalMin)} (${globalMinRegion})`
        }
        const maxMinGroup = container.append('g').attr('class', 'em-legend-max-min-group')

        if (showMax) {
            // Top boundary (MAX)
            const yTop = titlePadding
            maxMinGroup
                .append('line')
                .attr('class', 'em-legend-tick em-legend-tick-max')
                .attr('x1', tickX1)
                .attr('y1', yTop)
                .attr('x2', tickX2)
                .attr('y2', yTop)

            maxMinGroup
                .append('text')
                .style('pointer-events', 'all')
                .style('cursor', 'pointer')
                .on('mouseover', function () {
                    const numberOfClasses = out.getNumberOfClasses(out)
                    highlightMaxRegion(map, numberOfClasses, globalMaxRegionId)
                })
                .on('mouseout', function () {
                    const unhighlightFunction = out.getUnHighlightFunction(map)
                    unhighlightFunction(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction)
                    }
                })
                .attr('class', 'em-legend-label em-legend-label-max')
                .attr('x', labelX)
                .attr('y', yTop)
                .attr('dy', '0.3em')
                .text(maxLabel)
        }

        if (showMin) {
            // Bottom boundary (MIN)
            const yBottom = numberOfClasses * config.shapeHeight + titlePadding
            maxMinGroup
                .append('line')
                .attr('class', 'em-legend-tick em-legend-tick-min')
                .attr('x1', tickX1)
                .attr('y1', yBottom)
                .attr('x2', tickX2)
                .attr('y2', yBottom)

            maxMinGroup
                .append('text')
                .style('pointer-events', 'all')
                .style('cursor', 'pointer')
                .on('mouseover', function () {
                    highlightMinRegion(map, globalMinRegionId)
                })
                .on('mouseout', function () {
                    const unhighlightFunction = out.getUnHighlightFunction(map)
                    unhighlightFunction(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightFunction)
                    }
                })
                .attr('class', 'em-legend-label em-legend-label-min')
                .attr('x', labelX)
                .attr('y', yBottom)
                .attr('dy', '0.3em')
                .text(minLabel)
        }
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate
    // the max length of the legend labels so it doesnt cover them
    if (config.pointOfDivergenceLabel) {
        const scaleTopY = titlePadding
        const scaleBottomY = numberOfClasses * config.shapeHeight + titlePadding
        for (let i = 0; i < numberOfClasses; i++) {
            let y = i * config.shapeHeight + titlePadding
            // point of divergence indicator
            if (i == config.pointOfDivergence) {
                drawDivergingLine(out, y, config, scaleTopY, scaleBottomY)
            }
        }
    }
}

function createRangesLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const labelFormatter = out.getLabelFormatter(out)
    const numberOfClasses = out.getNumberOfClasses(out)
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    const classToFillStyle = out.getClassToFillStyle(out)
    const colorClassifier = out.getColorClassifier(out)
    const titlePadding = getTitlePadding(out)
    const sepLineLength = config.sepLineLength ?? config.shapeWidth

    // for each class
    for (let i = 0; i < numberOfClasses; i++) {
        let y = i * config.shapeHeight + titlePadding
        const x = 0
        const ecl = out.ascending ? numberOfClasses - i - 1 : i
        const fillColor = classToFillStyle(ecl, numberOfClasses)
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        // shift legend items down after point of divergence if applicable
        if (config.pointOfDivergenceLabel && i >= config.pointOfDivergence) y += config.pointOfDivergencePadding

        // Append rectangle
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.shapeWidth)
            .attr('height', config.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                //select(this).raise()
                highlightFunction(map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightFunction, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightFunction, ecl)
                }
            })

        // Append separation line
        if (i > 0) {
            itemContainer.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', sepLineLength).attr('y2', y)
        }

        // Append labels
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('x', Math.max(config.shapeWidth, sepLineLength + config.tickLength) + (config.labelOffsets.x || 0))
            .attr('y', y + config.shapeHeight / 2)
            .attr('dy', '0.3em')
            .text(config.labels ? config.labels[i] : labelFormatter(colorClassifier.invertExtent(ecl)[out.ascending ? 0 : 1], i))
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
    if (config.pointOfDivergenceLabel) {
        const scaleTopY = titlePadding
        const scaleBottomY = numberOfClasses * config.shapeHeight + titlePadding
        for (let i = 0; i < numberOfClasses; i++) {
            let y = i * config.shapeHeight + titlePadding
            // point of divergence indicator
            if (i == config.pointOfDivergence) {
                drawDivergingLine(out, y, config, scaleTopY, scaleBottomY)
            }
        }
    }
}

function drawDivergingLine(out, y, config, scaleTopY, scaleBottomY) {
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const x = 0
    if (config.labelType == 'ranges') y = y + config.pointOfDivergencePadding / 2 // move to the middle of the space between legend item
    const maxLabelLength = out._discreteLegendContainer
        .selectAll('.em-legend-label')
        .filter(function () {
            return !this.classList.contains('em-legend-label-max') && !this.classList.contains('em-legend-label-min')
        })
        .nodes()
        .reduce((max, node) => Math.max(max, node.getBBox().width), 0)
    const divergingLinePadding = config.divergingLinePadding ?? 15
    const lineLength =
        config.divergingLineLength || config.shapeWidth + config.labelOffsets?.x + maxLabelLength + config.labelOffsets?.x + divergingLinePadding // rect > offset > label > offset > padding > vertical line

    const showDivergingLine = config.showDivergingLine ?? true
    if (showDivergingLine) {
        // Draw the horizontal divergence line
        container
            .append('line')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', x + lineLength)
            .attr('y2', y)
            .attr('class', 'em-legend-diverging-line')

        // Small vertical tick at the end of the line, matching other threshold ticks
        const tickLen = config.tickLength || 5
        container
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', x + lineLength)
            .attr('y1', y - tickLen / 2)
            .attr('x2', x + lineLength)
            .attr('y2', y + tickLen / 2)
    }

    const labels = config.pointOfDivergenceLabel.split('|')
    if (labels.length > 1) {
        // divergence line with up and down arrows
        const directionLineLength = config.divergingArrowLength || 30
        const directionLineX = x + lineLength
        const labelsAtExtremes = (config.pointOfDivergenceLabelsAtExtremes ?? false) && scaleTopY != null && scaleBottomY != null
        const labelsStacked = config.pointOfDivergenceLabelsStacked ?? false

        // When labels sit at the scale extremes and the caller hasn't pinned an explicit
        // arrow length, stretch each arrow to reach near its own label instead of stopping
        // at the short default length meant for a divergence-point-adjacent label.
        const extremesArrowMargin = 20
        const autoExtendArrows = labelsAtExtremes && config.divergingArrowLength == null
        const upLength = autoExtendArrows ? Math.max(y - scaleTopY - extremesArrowMargin, markerHeight) : directionLineLength
        const downLength = autoExtendArrows ? Math.max(scaleBottomY - y - extremesArrowMargin, markerHeight) : directionLineLength

        // Add arrowhead marker definition
        const defs = container.append('defs')
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', markerHeight)
            .attr('markerHeight', markerHeight)
            .attr('refX', 0)
            .attr('refY', markerHeight / 2)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', `0 0, ${markerHeight} ${markerHeight / 2}, 0 ${markerHeight}`)
            .attr('fill', 'black')

        // Upward line with arrowhead
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', directionLineX)
            .attr('y1', y)
            .attr('x2', directionLineX)
            .attr('y2', y - upLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Downward line with arrowhead
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', directionLineX)
            .attr('y1', y)
            .attr('x2', directionLineX)
            .attr('y2', y + downLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Labels for the upward and downward arrows: either beside the arrow (default) or
        // above/below its head, starting at the arrow's x position ('stacked'); either near
        // the divergence point (default) or up near the top/bottom of the whole scale ('at
        // extremes').
        const upTipY = y - upLength
        const downTipY = y + downLength

        if (labelsStacked) {
            // Gap in pixels between an arrow tip and its label, when not positioned at the
            // scale extremes (where the labels instead sit flush with the max/min value labels).
            const stackedLabelGap = 10

            const topLabel = container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX)
                .attr('y', labelsAtExtremes ? scaleTopY : upTipY - stackedLabelGap)
                .text(labels[0])
            if (labelsAtExtremes) {
                // Sits on the same y as the max stat value label (which uses dy=0.3em to center
                // its text on that y) - match it so this label never renders further north than
                // the max label's own text does.
                topLabel.attr('dy', '0.3em')
            } else {
                // Pull the text further up, away from the tip, the same way the bottom label's
                // dy pushes it further down - otherwise the (undescended) baseline sitting only
                // stackedLabelGap above the tip reads as almost touching it.
                topLabel.attr('dy', '-0.3em')
            }

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX)
                .attr('y', labelsAtExtremes ? scaleBottomY : downTipY + stackedLabelGap)
                .attr('dy', labelsAtExtremes ? '0.3em' : '0.9em')
                .text(labels[1])
        } else {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX + 10)
                .attr('y', labelsAtExtremes ? scaleTopY : upTipY + 10)
                .attr('dy', '0.3em')
                .text(labels[0])

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX + 10)
                .attr('y', labelsAtExtremes ? scaleBottomY : downTipY - 10)
                .attr('dy', '0.3em')
                .text(labels[1])
        }
    } else {
        // just the single label
        container
            .append('text')
            .attr('class', 'em-legend-diverging-label em-legend-label')
            .attr('x', x + lineLength + 5)
            .attr('y', y)
            .attr('dy', '0.3em')
            .text(config.pointOfDivergenceLabel)
    }

    // Move the threshold value label at the divergence point so it never overlaps the line -
    // only relevant when the line is actually drawn. With showDivergingLine false there's
    // nothing to overlap, so the stat value stays in its normal place next to its own tick.
    if (showDivergingLine) {
        if (labels.length > 1) {
            // Move it to the right of the line end and reparent into container
            out._discreteLegendContainer
                .selectAll('.em-legend-label-divergence')
                .each(function () {
                    container.node().appendChild(this)
                })
                .attr('x', x + lineLength + 10)
        } else {
            // Single pointOfDivergenceLabel — remove the threshold value label to avoid clashing
            out._discreteLegendContainer.selectAll('.em-legend-label-divergence').remove()
        }
    }
}

function highlightMaxRegion(map, numberOfClasses, id) {
    const ecl = numberOfClasses - 1
    applyMaxMinHighlight(map, ecl, id)
    if (map.insetTemplates_) {
        executeForAllInsets(map.insetTemplates_, map.svgId, (insetMap) => {
            applyMaxMinHighlight(insetMap, ecl, id)
        })
    }
}

function highlightMinRegion(map, id) {
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
