import { rgb } from 'd3-color'

/** Missing values are distinct from zero and signed observations. */
export function parseVennValue(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
}

export function vennMask(values, thresholds) {
    return values.reduce((mask, value, index) => (value >= thresholds[index] ? mask | (1 << index) : mask), 0)
}

export function vennPalette(colors, belowColor) {
    const channels = colors.map((color) => rgb(color))
    return Array.from({ length: 8 }, (_, mask) => {
        if (!mask) return belowColor
        const selected = channels.filter((color, index) => mask & (1 << index))
        const mix = (channel) => selected.reduce((value, color) => (value * color[channel]) / 255, 255)
        return rgb(mix('r'), mix('g'), mix('b')).formatHex()
    })
}

export function vennCircleHits(centres, radius, x, y) {
    return centres.flatMap(([cx, cy], index) => (Math.hypot(x - cx, y - cy) <= radius ? [index] : []))
}
