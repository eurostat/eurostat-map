// corner-position.js
// Generic corner-positioning helpers for map-overlay elements (legends, the ranked bar chart, ...).
// Kept free of any single overlay's own concerns (e.g. the legend's toggle-button reserve or its
// multi-legend stacking) so different overlay kinds can share the same placement math without
// depending on each other's module.

/** Normalizes a user-supplied position string to one of the four supported corners, or null. */
export function getCornerPosition(position) {
    if (typeof position !== 'string') return null
    const normalized = position.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
    const supported = ['top right', 'bottom right', 'top left', 'bottom left']
    return supported.includes(normalized) ? normalized : null
}

/** The map's drawing area in SVG coordinates, accounting for the zoom/pan group's own translate. */
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

/** How far down a top-corner overlay must shift to clear the map's own title/subtitle text. */
export function getTopTextOverlapOffset(map, padding, bbox, left, top) {
    // When header is disabled, title/subtitle are drawn in the root SVG and can overlap top overlays.
    if (map.header_ || map.isInset) return 0
    if (!map.title_ && !map.subtitle_) return 0

    const svg = map.svg?.()
    if (!svg) return 0

    const title = svg.select?.('#title' + map.geo_)
    const subtitle = svg.select?.('#subtitle' + map.geo_)

    let textBottom = 0
    let textLeft = Infinity
    let textRight = -Infinity
    ;[title, subtitle].forEach((textSel) => {
        if (!textSel || textSel.empty()) return
        try {
            const bb = textSel.node().getBBox({ stroke: true })
            textBottom = Math.max(textBottom, bb.y + bb.height)
            textLeft = Math.min(textLeft, bb.x)
            textRight = Math.max(textRight, bb.x + bb.width)
        } catch (e) {
            // Ignore bbox errors and keep fallback offset.
        }
    })

    if (!textBottom || textLeft === Infinity || textRight === -Infinity) return 0

    const right = left + (bbox?.width || 0)
    const overlapsHorizontally = left < textRight && right > textLeft
    if (!overlapsHorizontally) return 0

    const requiredTop = textBottom + padding
    return Math.max(0, requiredTop - top)
}

/**
 * Resolve x/y coordinates for an overlay box in the given corner.
 * @param {number} [buttonReserve] extra top/bottom space to leave clear (e.g. for the legend's own
 *   toggle button) - callers that don't have such a concept can omit it.
 */
export function getCornerCoords(position, bbox, map, padding, buttonReserve = 0) {
    const [vertical, horizontal] = position.split(' ')
    const extent = getMapDrawingExtent(map)
    const maxX = Math.max(extent.x + padding, extent.x + extent.width - bbox.width - padding)
    const minY = extent.y + padding
    const maxY = Math.max(minY, extent.y + extent.height - bbox.height - padding)
    const left = horizontal === 'right' ? maxX : extent.x + padding
    const baseTop = vertical === 'bottom' ? maxY - buttonReserve : minY + buttonReserve
    let top = Math.max(minY, Math.min(maxY, baseTop))

    if (vertical === 'top') {
        const overlapOffset = getTopTextOverlapOffset(map, padding, bbox, left, top)
        if (overlapOffset > 0) {
            top = Math.max(minY, Math.min(maxY, top + overlapOffset))
        }
    }

    return {
        x: left - bbox.x,
        y: top - bbox.y,
    }
}
