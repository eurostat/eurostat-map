export const appendStamp = (stampConfig, map) => {
    if (map.svg_) {
        const existing = map.svg_.select('#em-stamp')
        existing.remove()
        const container = map.svg_.append('g').attr('id', 'em-stamp')
        // Set defaults
        if (!stampConfig.size) stampConfig.size = 20
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

        // text
        const text = stampConfig.text
        const lineHeight = 13
        const targetWidth = Math.sqrt(measureWidth(text.trim()) * lineHeight)
        const lines = getLines(getWords(text.trim()), targetWidth)
        const textRadius = getTextRadius(lines, lineHeight)

        //append inside circle
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
            .text((d) => d.text.replaceAll('¶', ' ')) // replace ¶ with spaces (for users that want nbsp;)
    }
}

const getWords = (text) => {
    const words = text.split(/\s+/g) // To hyphenate: /\s+|(?<=-)/
    if (!words[words.length - 1]) words.pop()
    if (!words[0]) words.shift()
    return words
}
const measureWidth = (text) => {
    // Create an off-screen SVG <text> element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    // Add text to the element
    textElement.textContent = text

    // Append the <text> element to the SVG
    svg.appendChild(textElement)
    document.body.appendChild(svg) // Temporarily add the SVG to the DOM

    // Measure the width of the text
    const width = textElement.getComputedTextLength()

    // Clean up by removing the SVG
    document.body.removeChild(svg)

    return width + 10 // add padding
}

const getTextRadius = (lines, lineHeight) => {
    let radius = 0
    for (let i = 0, n = lines.length; i < n; ++i) {
        const dy = (Math.abs(i - n / 2 + 0.5) + 0.5) * lineHeight
        const dx = lines[i].width / 2
        radius = Math.max(radius, Math.sqrt(dx ** 2 + dy ** 2))
    }
    return radius
}
const getLines = (words, targetWidth) => {
    let line
    let lineWidth0 = Infinity
    const lines = []

    for (let i = 0, n = words.length; i < n; ++i) {
        let lineText1 = (line ? line.text + ' ' : '') + words[i]
        let lineWidth1 = measureWidth(lineText1)
        if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
            line.width = lineWidth0 = lineWidth1
            line.text = lineText1
        } else {
            lineWidth0 = measureWidth(words[i])
            line = { width: lineWidth0, text: words[i] }
            lines.push(line)
        }
    }
    return lines
}
