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

export function formatSizeLabel(value, formatterOrDecimals) {
    if (!Number.isFinite(value)) return ''
    const normalizedValue = normalizeFloatingPointValue(value)

    // Support user-provided custom label formatter callbacks.
    if (typeof formatterOrDecimals === 'function') {
        return formatterOrDecimals(normalizedValue)
    }

    const dec = typeof formatterOrDecimals === 'number' ? formatterOrDecimals : detectValuePrecision(normalizedValue)
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
