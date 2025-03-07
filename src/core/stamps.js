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
            if (!stampConfig.textColor) stampConfig.textColor = '#000'
            if (!stampConfig.stampColor) stampConfig.stampColor = '#000'
            if (!stampConfig.strokeWidth) stampConfig.strokeWidth = 1

            // Draw the circle
            container
                .append('circle')
                .attr('r', stampConfig.size)
                .attr('cx', stampConfig.x)
                .attr('cy', stampConfig.y)
                .attr('id', 'em-stamp-circle')
                .attr('fill', 'none')
                .attr('stroke', stampConfig.stampColor)
                .attr('stroke-width', stampConfig.strokeWidth)

            // Handle text
            const text = stampConfig.text
            const lineHeight = 13
            const targetWidth = Math.sqrt(measureWidth(text.trim()) * lineHeight)
            const lines = getLines(getWords(text.trim()), targetWidth)
            const textRadius = getTextRadius(lines, lineHeight)

            // Append inside circle
            container
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('fill', stampConfig.textColor)
                .attr('id', 'em-stamp-text')
                .attr('transform', `translate(${stampConfig.x},${stampConfig.y}) scale(${stampConfig.size / textRadius})`)
                .selectAll('tspan')
                .data(lines)
                .enter()
                .append('tspan')
                .attr('x', 0)
                .attr('y', (d, i) => (i - lines.length / 2 + 0.8) * lineHeight)
                .text((d) => d.text.replaceAll('~', ' ').replaceAll('¶', '')) // Removes ¶ (line breaker) and ~ (non breaking space)
        }
    }
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

    return width + 10
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
            // Push current line (if it has text)
            if (line.text) lines.push(line)
            // Start a new empty line
            line = { width: 0, text: '' }
            continue
        }

        let lineText1 = (line.text ? line.text + ' ' : '') + words[i]
        let lineWidth1 = measureWidth(lineText1)

        if ((line.width + lineWidth1) / 2 < targetWidth) {
            line.width = lineWidth1
            line.text = lineText1
        } else {
            lines.push(line)
            line = { width: measureWidth(words[i]), text: words[i] }
        }
    }

    if (line.text) lines.push(line) // Push last line if it exists

    return lines
}
