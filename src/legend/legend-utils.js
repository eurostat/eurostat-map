import { spaceAsThousandSeparator } from '../core/utils'

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
