import { spaceAsThousandSeparator } from '../core/utils'

export function formatSizeLabel(value, decimals) {
    if (!Number.isFinite(value)) return ''
    const dec = typeof decimals === 'number' ? decimals : detectValuePrecision(value)
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
    return compactFormatter.format(value)
}

function detectValuePrecision(value) {
    const str = value.toString()
    if (!str.includes('.')) return 0
    return str.split('.')[1].length
}
