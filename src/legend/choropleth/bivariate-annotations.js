// The labelled call-outs at the corners of the bivariate legend square, and its multi-line text.

export function addCornerAnnotations(out) {
    if (!out.annotations) return

    const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
    const numberOfClasses = out.map.numberOfClasses_ || 3
    const cellSize = out.squareSize / numberOfClasses
    const corners = {
        // Anchor each annotation at the center of the corresponding corner class cell.
        topLeft: [cellSize / 2, cellSize / 2],
        topRight: [out.squareSize - cellSize / 2, cellSize / 2],
        bottomLeft: [cellSize / 2, out.squareSize - cellSize / 2],
        bottomRight: [out.squareSize - cellSize / 2, out.squareSize - cellSize / 2],
    }
    const cx = out.squareSize / 2
    const cy = out.squareSize / 2

    const annotationsGroup = out.lgg
        .append('g')
        .attr('class', 'bivariate-corner-annotations')
        .attr(
            'transform',
            `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
        )

    Object.entries(corners).forEach(([cornerName, point]) => {
        const text = out.annotations?.[cornerName]
        if (!text || typeof text !== 'string' || !text.trim()) return

        const [x0, y0] = point
        const vx = x0 - cx
        const vy = y0 - cy
        const norm = Math.hypot(vx, vy) || 1
        const ux = vx / norm
        const uy = vy / norm
        const cornerOffset = getAnnotationOffset(out, cornerName, ux, uy)
        const cornerLineLength = getAnnotationLineLength(out, cornerName, ux, uy, cornerOffset)

        const x1 = x0 + ux * cornerLineLength
        const y1 = y0 + uy * cornerLineLength
        const tx = x1 + cornerOffset.x
        const ty = y1 + cornerOffset.y

        const anchor = ux > 0.2 ? 'start' : ux < -0.2 ? 'end' : 'middle'
        const lines = splitMultilineText(text)

        const annotationLine = annotationsGroup
            .append('line')
            .attr('class', 'em-bivariate-corner-annotation-line')
            .attr('x1', x0)
            .attr('y1', y0)
            .attr('x2', x1)
            .attr('y2', y1)

        const annotationText = annotationsGroup
            .append('text')
            .attr('class', 'em-bivariate-corner-annotation')
            .attr('x', tx)
            .attr('y', ty)
            .attr('text-anchor', anchor)
            .attr('dominant-baseline', 'middle')

        if (out.rotation === -45) {
            annotationText.attr('transform', `rotate(45 ${tx} ${ty})`)
        }

        appendMultilineText(annotationText, lines, tx)

        const lineEndOffset = getAnnotationLineEndOffset(out, cornerName)
        const lineEnd = getLineEndpointToAnnotationLabel(x0, y0, annotationText, x1, y1, lineEndOffset)
        annotationLine.attr('x2', lineEnd.x).attr('y2', lineEnd.y)
    })
}

export function getLineEndpointToAnnotationLabel(x0, y0, annotationText, fallbackX, fallbackY, lineEndOffset = { x: 0, y: 0 }) {
    const node = annotationText?.node && annotationText.node()
    if (!node || typeof node.getBBox !== 'function') {
        return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
    }

    const bbox = node.getBBox()
    if (!bbox || !Number.isFinite(bbox.x) || !Number.isFinite(bbox.y)) {
        return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
    }

    const closestX = clamp(x0, bbox.x, bbox.x + bbox.width)
    const closestY = clamp(y0, bbox.y, bbox.y + bbox.height)

    const vx = closestX - x0
    const vy = closestY - y0
    const vLen = Math.hypot(vx, vy)
    if (!vLen) {
        return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
    }

    const labelGap = 1.5
    return {
        x: closestX - (vx / vLen) * labelGap + lineEndOffset.x,
        y: closestY - (vy / vLen) * labelGap + lineEndOffset.y,
    }
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

export function getAnnotationLineEndOffset(out, cornerName) {
    const defaultOffset = { x: 0, y: 0 }
    const offsets = out.annotationLineEndOffsets

    if (!offsets || typeof offsets !== 'object') {
        return defaultOffset
    }

    const cornerOffset = offsets[cornerName]
    if (cornerOffset && typeof cornerOffset === 'object') {
        return {
            x: typeof cornerOffset.x === 'number' && Number.isFinite(cornerOffset.x) ? cornerOffset.x : defaultOffset.x,
            y: typeof cornerOffset.y === 'number' && Number.isFinite(cornerOffset.y) ? cornerOffset.y : defaultOffset.y,
        }
    }

    if (typeof offsets.x === 'number' || typeof offsets.y === 'number') {
        return {
            x: typeof offsets.x === 'number' && Number.isFinite(offsets.x) ? offsets.x : defaultOffset.x,
            y: typeof offsets.y === 'number' && Number.isFinite(offsets.y) ? offsets.y : defaultOffset.y,
        }
    }

    return defaultOffset
}

export function getAnnotationOffset(out, cornerName, ux, uy) {
    const defaultOffset = { x: ux * 8, y: uy * 8, isCustom: false }
    const offsets = out.annotationOffsets

    if (offsets && typeof offsets === 'object') {
        const cornerOffset = offsets[cornerName]
        if (cornerOffset && typeof cornerOffset === 'object') {
            const x = typeof cornerOffset.x === 'number' && Number.isFinite(cornerOffset.x) ? cornerOffset.x : defaultOffset.x
            const y = typeof cornerOffset.y === 'number' && Number.isFinite(cornerOffset.y) ? cornerOffset.y : defaultOffset.y
            return { x, y, isCustom: true }
        }

        const x = typeof offsets.x === 'number' && Number.isFinite(offsets.x) ? offsets.x : defaultOffset.x
        const y = typeof offsets.y === 'number' && Number.isFinite(offsets.y) ? offsets.y : defaultOffset.y
        if (typeof offsets.x === 'number' || typeof offsets.y === 'number') {
            return { x, y, isCustom: true }
        }
    }

    return defaultOffset
}

export function getAnnotationLineLength(out, cornerName, ux, uy, cornerOffset) {
    let baseLineLength = 18
    const lineLengthConfig = out.annotationLineLength

    if (typeof lineLengthConfig === 'number' && Number.isFinite(lineLengthConfig)) {
        baseLineLength = lineLengthConfig
    } else if (lineLengthConfig && typeof lineLengthConfig === 'object') {
        const value = lineLengthConfig[cornerName]
        if (typeof value === 'number' && Number.isFinite(value)) {
            baseLineLength = value
        }
    }

    // When per-annotation offsets are used, adapt the line so its end stays close to the moved label.
    const radialOffset = cornerOffset?.isCustom ? ux * cornerOffset.x + uy * cornerOffset.y : 0
    return Math.max(2, baseLineLength + radialOffset)
}

export function splitMultilineText(text) {
    if (typeof text !== 'string') return []
    const breakPattern = new RegExp('<br\\s*\\/?>(?:\\r?\\n)?|\\r?\\n', 'gi')
    return text
        .split(breakPattern)
        .map((line) => line.trim())
        .filter(Boolean)
}

export function appendMultilineText(textSelection, lines, x, centered = true) {
    if (!lines.length) return
    if (lines.length === 1) {
        textSelection.text(lines[0])
        return
    }

    const lineHeight = 1.15
    const startDy = centered ? -((lines.length - 1) * lineHeight) / 2 : 0

    lines.forEach((line, index) => {
        textSelection
            .append('tspan')
            .attr('x', x)
            .attr('dy', `${index === 0 ? startDy : lineHeight}em`)
            .text(line)
    })
}
