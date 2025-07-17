export function appendPatternFillLegend(map, container, options = {}) {
    const {
        shapeWidth = 25,
        shapeHeight = 20,
        labelOffset = 3,
        boxPadding = 5,
        offsetY = 0, // << new
    } = options

    if (!map.patternFill_) return

    map.patternFill_.forEach((cfg, index) => {
        if (!cfg.legendLabel) return // skip if no label

        const y = offsetY + index * (shapeHeight + boxPadding)

        const item = container.append('g').attr('class', 'em-legend-item pattern-fill-legend')

        const patternColor = cfg.color || '#000' // fallback to black if no color provided
        const isWhitePattern = patternColor.toLowerCase() === '#fff' || patternColor.toLowerCase() === 'white'

        // Add background if pattern is white
        if (isWhitePattern) {
            item.append('rect').attr('x', boxPadding).attr('y', y).attr('width', shapeWidth).attr('height', shapeHeight).attr('fill', '#ddd') // light gray background
        }

        // Add pattern overlay
        item.append('rect')
            .attr('x', boxPadding)
            .attr('y', y)
            .attr('width', shapeWidth)
            .attr('height', shapeHeight)
            .attr('fill', `url(#${cfg.patternId || cfg.pattern})`)

        // Add label
        item.append('text')
            .attr('class', 'em-legend-label')
            .attr('x', boxPadding + shapeWidth + labelOffset)
            .attr('y', y + shapeHeight / 2)
            .attr('dominant-baseline', 'middle')
            .attr('dy', '0.35em') // ~vertical centering
            .text(cfg.legendLabel)
    })
}
