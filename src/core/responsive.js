export function getMobileSymbolScale() {
    if (typeof window === 'undefined' || window.innerWidth > 768) return 1
    return Math.max(0.45, Math.min(1, window.innerWidth / 768))
}

export function getResponsiveSymbolSize(value, minimum = 0) {
    const numeric = +value
    if (!Number.isFinite(numeric)) return value
    const scale = getMobileSymbolScale()
    if (scale === 1) return numeric
    return Math.max(minimum, numeric * scale)
}
