export const appendStamp = (stampConfig, map) => {
    if (map.svg_) {
        const existing = map.svg_.select('#em-stamp')
        existing.remove()

        if (stampConfig) {
            const container = map.svg_.append('g').attr('id', 'em-stamp')

            // Set defaults
            if (!stampConfig.size) stampConfig.size = 60
            if (!stampConfig.x) stampConfig.x = 230
            if (!stampConfig.y) stampConfig.y = 100
            if (!stampConfig.textColor) stampConfig.textColor = '#585858'
            if (!stampConfig.stampColor) stampConfig.stampColor = '#9e9e9e'
            if (!stampConfig.strokeWidth) stampConfig.strokeWidth = 1
            if (!stampConfig.lineHeight) stampConfig.lineHeight = 15
            if (!stampConfig.shape) stampConfig.shape = 'circle'
            // textAnchor: 'middle' (default, existing behaviour) or 'start' (left-anchored, grows rightward)
            if (!stampConfig.textAnchor) stampConfig.textAnchor = 'middle'
            if (stampConfig.padding === undefined) {
                stampConfig.padding = stampConfig.shape === 'rectangle' ? 1 : 0
            }

            // Handle text
            const text = stampConfig.text
            const targetWidth = Math.sqrt(measureWidth(text.trim()) * stampConfig.lineHeight)
            const lines = getLines(getWords(text.trim()), targetWidth)

            // ── fontSize mode ────────────────────────────────────────────────
            // When stampConfig.fontSize is set we fix the rendered font size and
            // let the shape grow to contain the text, instead of scaling text to
            // fit a fixed shape size.  We derive the scale factor from fontSize
            // relative to lineHeight (lineHeight is the natural font size of the
            // unscaled text element).
            const hasFixedFontSize = stampConfig.fontSize != null

            if (stampConfig.shape === 'rectangle') {
                const maxLineWidth = Math.max(...lines.map((l) => l.width))
                const textHeight = lines.length * stampConfig.lineHeight

                // scale: either driven by fontSize or by fitting text into stampConfig.size
                const scale = hasFixedFontSize ? stampConfig.fontSize / stampConfig.lineHeight : stampConfig.size / textHeight

                const scaledTextWidth = maxLineWidth * scale
                const scaledTextHeight = textHeight * scale

                // Apply same padding to all sides
                const rectWidth = scaledTextWidth + stampConfig.padding * 2
                const rectHeight = scaledTextHeight + stampConfig.padding * 2

                // Anchor geometry: cx is the horizontal centre used for 'middle',
                // x0 is the left edge used for 'start'.
                const cx = stampConfig.x
                const x0 = stampConfig.x // left edge when textAnchor === 'start'

                const rectX =
                    stampConfig.textAnchor === 'start'
                        ? x0 // rect left edge sits exactly at x — padding goes inward only
                        : cx - rectWidth / 2
                const rectY = stampConfig.y - rectHeight / 2

                // Horizontal translation of the text group.
                // For 'start': offset right by padding so text sits inside the padded rect interior.
                const textTranslateX = stampConfig.textAnchor === 'start' ? x0 + stampConfig.padding + scaledTextWidth / 2 : cx

                container
                    .append('rect')
                    .attr('width', rectWidth)
                    .attr('height', rectHeight)
                    .attr('x', rectX)
                    .attr('y', rectY)
                    .attr('rx', stampConfig.rx || 0) // optional rounded corners
                    .attr('id', 'em-stamp-shape')
                    .attr('fill', 'none')
                    .attr('stroke', stampConfig.stampColor)
                    .attr('stroke-width', stampConfig.strokeWidth)

                const textElement = container
                    .append('text')
                    .attr('text-anchor', 'middle') // always centre within its own translated group
                    .attr('dominant-baseline', 'central')
                    .attr('fill', stampConfig.textColor)
                    .attr('id', 'em-stamp-text')
                    .attr('transform', `translate(${textTranslateX},${stampConfig.y}) scale(${scale})`)

                textElement
                    .selectAll('tspan')
                    .data(lines)
                    .enter()
                    .append('tspan')
                    .attr('x', 0)
                    .attr('y', (d, i) => (i - lines.length / 2 + 0.5) * stampConfig.lineHeight)
                    .text((d) => d.text.replaceAll('~', ' ').replaceAll('¶', ''))
            } else {
                // ── Circle / Square / EU-stars ────────────────────────────────
                const textRadius = getTextRadius(lines, stampConfig.lineHeight)

                // scale: either driven by fontSize or by fitting text into stampConfig.size
                const scale = hasFixedFontSize ? stampConfig.fontSize / stampConfig.lineHeight : stampConfig.size / textRadius

                // Effective radius of the rendered text block (before shape padding)
                const renderedRadius = textRadius * scale

                // For 'start' anchoring the shape centre is offset rightward so
                // that its left edge sits at stampConfig.x.
                const shapeRadius = renderedRadius + stampConfig.padding
                const shapeCx = stampConfig.textAnchor === 'start' ? stampConfig.x + shapeRadius : stampConfig.x

                if (stampConfig.shape === 'square') {
                    const sideLength = shapeRadius * 2
                    container
                        .append('rect')
                        .attr('width', sideLength)
                        .attr('height', sideLength)
                        .attr('x', shapeCx - shapeRadius)
                        .attr('y', stampConfig.y - shapeRadius)
                        .attr('rx', stampConfig.rx || 0) // optional rounded corners
                        .attr('id', 'em-stamp-shape')
                        .attr('fill', 'none')
                        .attr('stroke', stampConfig.stampColor)
                        .attr('stroke-width', stampConfig.strokeWidth)
                } else if (stampConfig.shape === 'eu-stars') {
                    // ── EU flag star ring ─────────────────────────────────────
                    // 12 filled 5-pointed stars equally spaced around a circle of
                    // shapeRadius. Each star's outer radius is sized so adjacent
                    // stars just touch: arc between neighbours / 2 = starRadius.
                    // starSize (default 1) is a multiplier to scale stars smaller
                    // without affecting the ring radius or text layout.
                    const NUM_STARS = 12
                    const starSize = stampConfig.starSize != null ? stampConfig.starSize : 1
                    const starRadius = ((shapeRadius * Math.PI) / NUM_STARS) * starSize // outer point radius of each star
                    const starGroup = container.append('g').attr('id', 'em-stamp-shape')

                    Array.from({ length: NUM_STARS }, (_, i) => {
                        // Angle from top (12 o'clock), clockwise — matches EU flag convention
                        const angle = (i * 2 * Math.PI) / NUM_STARS - Math.PI / 2
                        const starCx = shapeCx + shapeRadius * Math.cos(angle)
                        const starCy = stampConfig.y + shapeRadius * Math.sin(angle)
                        // Rotate each star so one point always faces outward from the ring centre
                        starGroup
                            .append('path')
                            .attr('d', starPath(starCx, starCy, starRadius, starRadius * 0.382, angle + Math.PI / 2))
                            .attr('fill', stampConfig.stampColor)
                    })
                } else {
                    // plain circle
                    container
                        .append('circle')
                        .attr('r', shapeRadius)
                        .attr('cx', shapeCx)
                        .attr('cy', stampConfig.y)
                        .attr('id', 'em-stamp-shape')
                        .attr('fill', 'none')
                        .attr('stroke', stampConfig.stampColor)
                        .attr('stroke-width', stampConfig.strokeWidth)
                }

                const textElement = container
                    .append('text')
                    .attr('text-anchor', 'middle') // always centre within its own translated group
                    .attr('fill', stampConfig.textColor)
                    .attr('id', 'em-stamp-text')
                    .attr('transform', `translate(${shapeCx},${stampConfig.y}) scale(${scale})`)

                textElement
                    .selectAll('tspan')
                    .data(lines)
                    .enter()
                    .append('tspan')
                    .attr('x', 0)
                    .attr('y', (d, i) => (i - lines.length / 2 + 0.8) * stampConfig.lineHeight)
                    .text((d) => d.text.replaceAll('~', ' ').replaceAll('¶', ''))
            }
        }
    }
}

// Returns the SVG path string for a 5-pointed star centred at (cx, cy).
// outerR: radius to the outer points; innerR: radius to the inner vertices (0.382 * outerR
// gives the mathematically correct inner radius for a regular 5-pointed star).
// rotationAngle rotates the whole star so a point faces the given direction —
// pass (angle from ring centre to this star + PI/2) so one tip always points outward.
const starPath = (cx, cy, outerR, innerR, rotationAngle = 0) => {
    const points = []
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = (i * Math.PI) / 5 + rotationAngle
        points.push([cx + r * Math.sin(angle), cy - r * Math.cos(angle)])
    }
    return 'M' + points.map((p) => p.join(',')).join('L') + 'Z'
}

// Splitting by both spaces and pilcrows
const getWords = (text) => {
    return text
        .split(/(?<=¶)|\s+/g)
        .map((word) => word.trim())
        .filter((word) => word.length > 0)
}

// Computes text width
const measureWidth = (text) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    textElement.textContent = text
    svg.appendChild(textElement)
    document.body.appendChild(svg)

    const width = textElement.getComputedTextLength()
    document.body.removeChild(svg)

    return width
}

// Compute text radius
const getTextRadius = (lines, lineHeight) => {
    let radius = 0
    for (let i = 0, n = lines.length; i < n; ++i) {
        const dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * lineHeight
        const dx = lines[i].width / 2
        radius = Math.max(radius, Math.sqrt(dx ** 2 + dy ** 2))
    }
    return radius
}

// Handles forced line breaks
const getLines = (words, targetWidth) => {
    let lines = []
    let line = { width: 0, text: '' }

    for (let i = 0, n = words.length; i < n; ++i) {
        if (words[i] === '¶') {
            if (line.text) lines.push(line)
            line = { width: 0, text: '' }
            continue
        }

        let lineText1 = (line.text ? line.text + ' ' : '') + words[i]
        let lineWidth1 = measureWidth(lineText1)

        if ((line.width + lineWidth1) / 2 < targetWidth) {
            line.width = lineWidth1
            line.text = lineText1
        } else {
            if (line.text) lines.push(line) // Only push if there's content
            line = { width: measureWidth(words[i]), text: words[i] }
        }
    }

    if (line.text) lines.push(line)

    return lines
}
