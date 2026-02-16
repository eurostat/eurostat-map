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
            if (!stampConfig.lineHeight) stampConfig.lineHeight = 15
            if (!stampConfig.shape) stampConfig.shape = 'circle'

            // Draw the shape
            if (stampConfig.shape === 'square') {
                const sideLength = stampConfig.size * 2
                container
                    .append('rect')
                    .attr('width', sideLength)
                    .attr('height', sideLength)
                    .attr('x', stampConfig.x - stampConfig.size)
                    .attr('y', stampConfig.y - stampConfig.size)
                    .attr('id', 'em-stamp-shape')
                    .attr('fill', 'none')
                    .attr('stroke', stampConfig.stampColor)
                    .attr('stroke-width', stampConfig.strokeWidth)
            } else {
                container
                    .append('circle')
                    .attr('r', stampConfig.size)
                    .attr('cx', stampConfig.x)
                    .attr('cy', stampConfig.y)
                    .attr('id', 'em-stamp-shape')
                    .attr('fill', 'none')
                    .attr('stroke', stampConfig.stampColor)
                    .attr('stroke-width', stampConfig.strokeWidth)
            }

            // Handle text
            const text = stampConfig.text
            const targetWidth = Math.sqrt(measureWidth(text.trim()) * stampConfig.lineHeight)
            const lines = getLines(getWords(text.trim()), targetWidth)
            const textRadius = getTextRadius(lines, stampConfig.lineHeight)

            // Append inside shape
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
                .attr('y', (d, i) => (i - lines.length / 2 + 0.8) * stampConfig.lineHeight)
                .text((d) => d.text.replaceAll('~', ' ').replaceAll('¶', ''))
        }
    }
}
