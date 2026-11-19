/** Return a valid percentage, including numeric strings from CSV data. */
export function parseCircleRingValue(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined
    const percentage = Number(value)
    return percentage >= 0 && percentage <= 100 ? percentage : undefined
}

export function getCircleRingStatData(layer) {
    if (layer.psShape_ !== 'circle' || layer.psCustomSVG_ || !Number.isFinite(layer.psRingWidth_) || layer.psRingWidth_ <= 0) return
    if (layer.getEncodingStat('ring')) return layer.getEncodingStatData('ring')
}
