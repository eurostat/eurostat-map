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

function normalizeFloatingPointValue(value) {
    const rounded = Number.parseFloat(value.toFixed(12))
    return Object.is(rounded, -0) ? 0 : rounded
}

function detectValuePrecision(value) {
    const str = value.toString()
    if (!str.includes('.')) return 0
    return str.split('.')[1].length
}
