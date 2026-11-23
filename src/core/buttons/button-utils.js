import { getCSSPropertyFromClass } from '../utils'
import { isCompact } from '../layout-profile'

/** Buttons are bigger in the compact layout, where they are pressed with a finger. */
export const COMPACT_BUTTON_SIZE = 40

export function getButtonSize(map) {
    if (map && isCompact(map)) return COMPACT_BUTTON_SIZE
    return parseFloat(getCSSPropertyFromClass('em-button', 'width')) || 35
}

export function getButtonPadding(map) {
    return isCompact(map) ? 8 : 10
}

export function getMapDrawingExtent(map) {
    const fallback = { x: 0, y: 0, width: map.width(), height: map.height() }
    const svg = map.svg?.()
    if (!svg) return fallback

    const drawing = svg.select?.('#em-drawing-' + map.svgId_)
    if (!drawing || drawing.empty()) return fallback

    const transform = drawing.attr('transform') || ''
    const match = transform.match(/translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/)
    return {
        x: match ? Number(match[1]) || 0 : 0,
        y: match ? Number(match[2]) || 0 : 0,
        width: map.width(),
        height: map.height(),
    }
}
