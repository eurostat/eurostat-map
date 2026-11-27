import { spaceAsThousandSeparator } from '../core/utils'

/**
 * Detect the number of decimal places in a d3 scale's domain max value.
 * Used to format labels with the same precision as the actual dataset rather than the
 * precision of an auto-computed representative value (which can introduce extra decimals,
 * e.g. domain[1] * 0.1 = 2.47 when the data itself only has 1 d.p.).
 * @param {Object} classifier - A d3 scale (or similar) exposing .domain()
 * @returns {number}
 */
export function getMaxDomainPrecision(classifier) {
    const domain = classifier?.domain?.()
    const maxVal = domain?.[1] ?? 0
    if (!Number.isFinite(maxVal)) return 0
    const str = Number.parseFloat(maxVal.toFixed(12)).toString()
    return str.includes('.') ? str.split('.')[1].length : 0
}

// Below this magnitude, spelling the value out in words (e.g. "15 thousand") reads as more
// vague than just showing the number (e.g. "15 000") - word notation only starts pulling its
// weight once the plain number gets long enough to be hard to parse at a glance (millions+).
const WORD_NOTATION_THRESHOLD = 1_000_000

// Default decimal precision once word/compact notation kicks in (see below) - enough to
// distinguish entries at that scale without the inconsistency fixed-precision avoids.
const DEFAULT_COMPACT_DECIMALS = 1

export function formatSizeLabel(value, formatterOrDecimals) {
    if (!Number.isFinite(value)) return ''
    const normalizedValue = normalizeFloatingPointValue(value)

    // Support user-provided custom label formatter callbacks.
    if (typeof formatterOrDecimals === 'function') {
        return formatterOrDecimals(normalizedValue)
    }

    if (Math.abs(normalizedValue) < WORD_NOTATION_THRESHOLD) {
        const dec = typeof formatterOrDecimals === 'number' ? formatterOrDecimals : detectValuePrecision(normalizedValue)
        return spaceAsThousandSeparator(Number(normalizedValue.toFixed(dec)))
    }

    // Word/compact notation rescales the value (e.g. 4 219 310 -> "4.2 million"), so detecting
    // decimals from the RAW value's own digit count (as the branch above does) no longer means
    // anything here - a value that happens to be a round number of millions and one with a
    // fractional remainder look identical once scaled, so two entries in the same legend/chart
    // could get wildly different decimal places depending on an artifact of their raw figure
    // (e.g. one country's GDP happening to be a round number of millions and another's not).
    // Default to a fixed precision instead, so every value at this scale is rounded consistently,
    // unless the caller explicitly asked for a different one.
    const dec = typeof formatterOrDecimals === 'number' ? formatterOrDecimals : DEFAULT_COMPACT_DECIMALS

    const compactIntlFormatter = new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'long',
        maximumFractionDigits: dec,
    })
    const compactFormatter = {
        format(value) {
            return spaceAsThousandSeparator(compactIntlFormatter.format(value))
        },
    }
    return compactFormatter.format(normalizedValue)
}

/**
 * The most decimal places among some values: the precision of a dataset.
 * @param {Array<*>} values
 * @param {number=} limit
 */
export function getDecimals(values, limit = 4) {
    return (values || []).reduce((most, value) => {
        if (value === '' || value === null || !Number.isFinite(Number(value))) return most
        const text = String(normalizeFloatingPointValue(Number(value)))
        const decimals = text.includes('e') || !text.includes('.') ? 0 : text.split('.')[1].length
        return Math.min(limit, Math.max(most, decimals))
    }, 0)
}

/**
 * One format for all the numbers of a legend: the same decimal places for each, those of the data ("1.0", "51.0",
 * "100.0" for data with one decimal), with more where two different numbers would otherwise look the same. Millions and
 * above are written in words.
 *
 * @param {number[]} values the numbers the legend shows
 * @param {Array<*>=} data the dataset, which gives the precision (otherwise the shown numbers do)
 * @param {number=} decimals the author's own number of decimal places
 * @returns {function(number): string}
 */
export function formatLegendValues(values, data, decimals) {
    const shown = values.map(Number).filter(Number.isFinite)
    const format = (places) => (value) => {
        if (!Number.isFinite(Number(value))) return ''
        const number = normalizeFloatingPointValue(Number(value))
        if (Math.abs(number) >= WORD_NOTATION_THRESHOLD) return formatSizeLabel(number)
        const [whole, fraction] = number.toFixed(places).split('.')
        const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        return fraction ? grouped + '.' + fraction : grouped
    }
    if (decimals !== undefined) return format(decimals)

    let places = getDecimals(data?.length ? data : shown)
    const distinct = new Set(shown).size
    while (places < 4 && new Set(shown.map(format(places))).size < distinct) places++
    return format(places)
}

function normalizeFloatingPointValue(value) {
    const rounded = Number.parseFloat(value.toFixed(12))
    return Object.is(rounded, -0) ? 0 : rounded
}

function detectValuePrecision(value) {
    const str = value.toString()
    if (!str.includes('.')) return 0
    return str.split('.')[1].length
}
