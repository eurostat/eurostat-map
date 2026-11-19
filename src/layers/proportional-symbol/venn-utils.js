/** Venn circles represent non-negative magnitudes. Missing values are distinct from zero. */
export function parseVennValue(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function vennCircleHits(centres, radius, x, y) {
    return centres.flatMap(([cx, cy], index) => (Math.hypot(x - cx, y - cy) <= radius ? [index] : []))
}
