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
 * Geometry of a vertical stack of swatches. The single source of truth for where each row sits, so every
 * discrete legend (choropleth ranges/thresholds, categorical, flow colour) spaces its swatches the same way
 * and anything drawn after the rows (no-data box, diverging line, max/min ticks) can ask where the stack ends.
 *
 * @param {Object} o
 * @param {number} o.count number of swatches
 * @param {number} o.shapeHeight swatch height
 * @param {number} [o.startY=0] y of the top of the first swatch
 * @param {number} [o.gap=0] vertical gap between swatches (0 = contiguous)
 * @returns {{rowY:(i:number)=>number, top:number, bottom:number}}
 */
export function swatchStackLayout({ count, shapeHeight, startY = 0, gap = 0 }) {
    const rowY = (i) => startY + i * (shapeHeight + gap)
    return { rowY, top: startY, bottom: count ? rowY(count - 1) + shapeHeight : startY }
}

/**
 * Draw a vertical stack of swatch rows: one `<g>` per item holding the swatch, an optional label centred on the
 * swatch, and whatever the caller's `decorate` hook adds (separator lines, ticks, boundary labels...).
 * Layout is the only thing decided here; what each row means (class, ticks, hover) stays with the caller.
 *
 * @param {Object} container d3 selection to append the rows to
 * @param {Array<{color:string,label?:string,yOffset?:number,onEnter?:Function,onLeave?:Function}>} items
 * @param {Object} opts
 * @param {number} opts.shapeWidth swatch width
 * @param {number} opts.shapeHeight swatch height
 * @param {number} [opts.startY=0] y of the first row
 * @param {number} [opts.gap=0] vertical gap between rows
 * @param {number} [opts.labelX] x of the centred labels (required when items have a label)
 * @param {string} [opts.labelDy='0.3em'] label dy
 * @param {string} [opts.rowClass='em-legend-item'] class of each row group
 * @param {(row:Object, info:{i:number,y:number,item:Object})=>void} [opts.decorate] runs after the swatch, before the label
 * @returns {Array<{row:Object,swatch:Object,label:Object|null,y:number}>}
 */
export function appendLegendSwatchRows(container, items, opts) {
    const { shapeWidth, shapeHeight, startY = 0, gap = 0, labelX, labelDy = '0.3em', rowClass = 'em-legend-item', decorate } = opts
    const layout = swatchStackLayout({ count: items.length, shapeHeight, startY, gap })
    return items.map((item, i) => {
        const y = layout.rowY(i) + (item.yOffset || 0)
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
        decorate?.(row, { i, y, item })
        const label = item.label == null ? null : appendLegendSwatchLabel(row, { x: labelX, y: y + shapeHeight / 2, dy: labelDy, text: item.label })
        return { row, swatch, label, y }
    })
}
