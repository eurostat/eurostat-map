/** Draw an SVG colour swatch at the position chosen by the legend layout. */
export function appendLegendSwatch(row, { x, y, width, height, color, onEnter, onLeave }) {
    return row
        .append('rect')
        .attr('class', 'em-legend-rect')
        .attr('x', x ?? null)
        .attr('y', y ?? null)
        .attr('width', width)
        .attr('height', height)
        .style('fill', color)
        .on('mouseover', onEnter ?? null)
        .on('mouseout', onLeave ?? null)
}

/** Position a swatch label or a label at a threshold between swatches. */
export function appendLegendSwatchLabel(row, { x, y, dy, anchor, text, className = 'em-legend-label' }) {
    return row
        .append('text')
        .attr('class', className)
        .attr('x', x)
        .attr('y', y)
        .attr('dy', dy)
        .attr('text-anchor', anchor ?? null)
        .text(text)
}
