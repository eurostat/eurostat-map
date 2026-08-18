import { isMobile, MOBILE_BREAKPOINT } from './utils'

export function getMobileSymbolScale() {
    if (!isMobile()) return 1
    return Math.max(0.45, Math.min(1, window.innerWidth / MOBILE_BREAKPOINT))
}

export function getResponsiveSymbolSize(value, minimum = 0) {
    const numeric = +value
    if (!Number.isFinite(numeric)) return value
    const scale = getMobileSymbolScale()
    if (scale === 1) return numeric
    return Math.max(minimum, numeric * scale)
}
