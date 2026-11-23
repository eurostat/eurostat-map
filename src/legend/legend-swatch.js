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

/** Thin line across the top of a swatch, separating it from the one above. */
export function appendLegendSeparator(row, y, length) {
    return row.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', length).attr('y2', y)
}

/** `decorate` hook for "ranges" rows: a separator above every row but the first. */
export function rangesDecorator(sepLength) {
    return (row, { i, y }) => {
        if (i > 0) appendLegendSeparator(row, y, sepLength)
    }
}

/**
 * `decorate` hook for "thresholds" rows: every internal boundary gets a separator, a tick and the threshold
 * label, which sits on the boundary below its swatch (so the last swatch has none).
 *
 * @param {Object} o
 * @param {number} o.count number of rows
 * @param {number} o.sepLength separator length
 * @param {number} o.tickLength tick length, drawn after the separator
 * @param {number} o.labelX x of the boundary labels
 * @param {number} o.shapeHeight swatch height (boundary labels sit at the swatch bottom)
 * @param {(i:number, item:Object)=>string} o.labelText text of the boundary label below row i
 * @param {(label:Object, i:number)=>void} [o.onLabel] hook to tag a label (e.g. the one at the point of divergence)
 */
export function thresholdsDecorator({ count, sepLength, tickLength, labelX, shapeHeight, labelText, onLabel }) {
    return (row, { i, y, item }) => {
        if (i > 0) {
            appendLegendSeparator(row, y, sepLength)
            row.append('line').attr('class', 'em-legend-tick').attr('x1', sepLength).attr('y1', y).attr('x2', sepLength + tickLength).attr('y2', y)
        }
        if (i < count - 1) {
            const label = appendLegendSwatchLabel(row, { x: labelX, y: y + shapeHeight, dy: '0.3em', text: () => labelText(i, item) })
            onLabel?.(label, i)
        }
    }
}

/**
 * Where a swatch stack or bar starts below its title: the one place that adds the pieces up, so the vertical
 * discrete, categorical and flow colour legends (and the horizontal bar) cannot drift apart. Callers measure
 * what they have (a title drawn inside the legend container, a subtitle line) and pass it in.
 *
 * @param {Object} [o]
 * @param {number} [o.titleHeight=0] height of a title drawn inside the same container (0 if the legend box draws it)
 * @param {number} [o.subtitleHeight=0] height of a subtitle line, including its own spacing
 * @param {number} [o.titlePadding=0] the configured gap between the title block and the first swatch
 * @param {number} [o.extraPadding=0] anything else that must sit above the first swatch (e.g. the max label)
 * @returns {number}
 */
export function swatchStackStart({ titleHeight = 0, subtitleHeight = 0, titlePadding = 0, extraPadding = 0 } = {}) {
    return titleHeight + subtitleHeight + titlePadding + extraPadding
}

/**
 * Geometry of a horizontal swatch bar: `count` equal swatches spanning `width`, optionally with a gap opened before
 * class `breakAt` (the point of divergence). Horizontal counterpart of swatchStackLayout.
 *
 * @param {Object} o
 * @param {number} o.count number of swatches
 * @param {number} o.width total bar width, break included
 * @param {number|null} [o.breakAt=null] index of the first swatch after the break (null: no break)
 * @param {number} [o.breakSize=0] width of the break
 * @returns {{itemWidth:number, itemX:(j:number)=>number, seamX:(j:number)=>number, breakX:number|null}}
 */
export function swatchBarLayout({ count, width, breakAt = null, breakSize = 0 }) {
    const size = breakAt === null ? 0 : breakSize
    const itemWidth = (width - size) / count
    return {
        itemWidth,
        itemX: (j) => j * itemWidth + (size && j >= breakAt ? size : 0),
        // x of the seam between swatch j and j + 1
        seamX: (j) => (j + 1) * itemWidth + (size && j + 1 > breakAt ? size : 0),
        // middle of the break
        breakX: breakAt === null ? null : breakAt * itemWidth + size / 2,
    }
}
