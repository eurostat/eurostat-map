// legends for discrete color scales
import { getTitlePadding } from './discrete/shared'
import { spaceAsThousandSeparator } from '../core/utils'
import { legibleSwatchHeight } from './legend-swatch'
import { format } from 'd3-format'
import { getFontSizeFromClass } from '../core/utils'
import { classStackBottom } from './discrete/shared'
import { appendExtraSwatchStack, extraSwatchRows } from './discrete/extras'
import { createThresholdsLegend, createRangesLegend } from './discrete/vertical'
import { createHorizontalLegend, appendHorizontalExtraItems } from './discrete/horizontal'
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

    // classes placed between the values (too few of them for the classes asked for) need the decimals of their boundaries
    const layer = out.layer
    const classifier = layer?.classifier_ || layer?.classifierColor_
    if (layer?._classCount !== undefined && classifier?.domain) {
        values.push(...classifier.domain().map((v) => +Number(v).toFixed(4)))
    }

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
    // rows closer together than the label text is tall would print the labels over each other
    if (!horizontal) config.shapeHeight = legibleSwatchHeight(config.shapeHeight, getFontSizeFromClass('em-legend-label'))

    const classes = out.getNumberOfClasses(out)
    const single = out.layer?._singleClassValue
    // thresholds vs ranges
    if (classes === 0) {
        // no value to classify: only the no-data and category items below
        appendExtraSwatchStack(out, extraSwatchRows(out, config), getTitlePadding(out))
        return
    } else if (classes === 1 && single !== undefined) {
        // every value is the same: one swatch, labelled with it
        const label = config.labels?.[0] ?? spaceAsThousandSeparator(single)
        createRangesLegend(out, Object.assign(Object.create(config), { labels: [label], maxMin: false }))
    } else if (horizontal) {
        createHorizontalLegend(out, config)
    } else if (out.labelType === 'ranges' || out.colorLegend?.labelType === 'ranges') {
        createRangesLegend(out, config)
    } else {
        createThresholdsLegend(out, config)
    }

    if (horizontal && !(classes === 1 && single !== undefined)) {
        appendHorizontalExtraItems(out, config)
        return
    }

    // The no-data box and any extra categorical classes (e.g. a "no railway lines" class alongside numeric
    // electrification-rate classes) stack below the classes, as rows of the same swatch stack.
    let extrasY = classStackBottom(out, config) + 3 // 3px padding
    if (config.pointOfDivergence && config.pointOfDivergencePadding) extrasY += config.pointOfDivergencePadding // shift down after point of divergence
    appendExtraSwatchStack(out, extraSwatchRows(out, config), extrasY)
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
    appendExtraSwatchStack(out, extraSwatchRows(out, {}, { includeNoData: false }), startY)
}
