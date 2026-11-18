export function placeTooltip(bounds, size, point, offset) {
    const { left, top, right, bottom } = bounds
    const { width, height } = size
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
    const rightOfPoint = point.x + offset.x
    const leftOfPoint = point.x - offset.x - width
    const sideTop = clamp(point.y - offset.y, top, bottom - height)

    if (rightOfPoint >= left && rightOfPoint + width <= right) return { x: rightOfPoint, y: sideTop }
    if (leftOfPoint >= left && leftOfPoint + width <= right) return { x: leftOfPoint, y: sideTop }

    // Neither side fits. Centre on the point and use the vertical gap to keep it visible.
    const x = clamp(point.x - width / 2, left, right - width)
    const below = clamp(point.y + offset.y, top, bottom)
    const above = clamp(point.y - offset.y, top, bottom)
    if (below + height <= bottom) return { x, y: below }
    if (above - height >= top) return { x, y: above - height }

    // For an oversized tooltip, use the larger gap and contain the content there.
    const belowSpace = bottom - below
    const aboveSpace = above - top
    return belowSpace >= aboveSpace ? { x, y: below, maxHeight: belowSpace } : { x, y: top, maxHeight: aboveSpace }
}
