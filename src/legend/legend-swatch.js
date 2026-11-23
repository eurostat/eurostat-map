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

/**
 * Lay out a vertical stack of swatch + label rows. Shared by the discrete choropleth "ranges" legend and the
 * flow colour legend so both space their rows identically.
 *
 * @param {Object} container d3 selection to append the rows to
 * @param {Array<{color:string,label:string,yOffset?:number,onEnter?:Function,onLeave?:Function}>} items
 * @param {Object} opts
 * @param {number} opts.shapeWidth swatch width
 * @param {number} opts.shapeHeight swatch height
 * @param {number} [opts.startY=0] y of the first row
 * @param {number} [opts.gap=0] vertical gap between rows
 * @param {number} opts.labelX x of the labels
 * @param {number} [opts.separatorLength] when set, draws a separator line above every row but the first
 * @param {string} [opts.rowClass='em-legend-item'] class of each row group
 * @param {string} [opts.labelDy='0.3em'] label dy
 * @returns {Array<{row:Object,swatch:Object,label:Object,y:number}>}
 */
export function appendLegendSwatchRows(container, items, opts) {
    const { shapeWidth, shapeHeight, startY = 0, gap = 0, labelX, separatorLength, rowClass = 'em-legend-item', labelDy = '0.3em' } = opts
    return items.map((item, i) => {
        const y = startY + i * (shapeHeight + gap) + (item.yOffset || 0)
        const row = container.append('g').attr('class', rowClass)
        const swatch = appendLegendSwatch(row, {
            x: 0,
            y,
            width: shapeWidth,
            height: shapeHeight,
            color: item.color,
            onEnter: item.onEnter,
            onLeave: item.onLeave,
        })
        if (separatorLength != null && i > 0) {
            row.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', separatorLength).attr('y2', y)
        }
        const label = appendLegendSwatchLabel(row, { x: labelX, y: y + shapeHeight / 2, dy: labelDy, text: item.label })
        return { row, swatch, label, y }
    })
}
