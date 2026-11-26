/** Smallest space, in screen pixels, left between two parts of a legend that would otherwise overlap. */
const PART_GAP = 4

/**
 * Make sure that no part of a legend is drawn over another. The parts are the groups directly inside the legend
 * (titles, size legend, colour legend, no-data and pattern items...), in drawing order. A part that draws over an
 * earlier one is moved down below it; parts side by side, or already clear of each other, are not touched. This runs
 * for every legend, so that a small `marginTop`, a long title or a large symbol can never make two parts collide.
 *
 * What the parts really draw is compared, element by element: the empty corners of a group's bounding box (around a
 * rotated square, say) do not count, nor does the room a text box reserves above and below its letters, so a legend
 * with deliberately tight spacing (a negative `titlePadding`) stays as it is.
 *
 * @param {SVGGElement} legend the legend's root group
 */
export function separateStackedParts(legend) {
    const matrix = legend.getScreenCTM?.()
    if (!matrix || !matrix.d) return // not rendered (hidden, or no layout engine): nothing can be measured
    const placed = [] // what the earlier parts draw
    for (const part of legend.children) {
        if (part.tagName === 'text') placed.push(...drawnRects(part, matrix.d)) // a title written straight into the legend
        if (part.tagName !== 'g') continue
        const drawn = drawnRects(part, matrix.d)
        if (!drawn.length) continue
        let shift = 0
        // moving below one element can run into another: repeat until clear of all of them
        for (let pass = 0; pass <= placed.length; pass++) {
            let next = shift
            for (const box of drawn) {
                for (const other of placed) {
                    const hit = box.left < other.right - 1 && other.left < box.right - 1 && box.top + shift < other.bottom - 0.5 && other.top < box.bottom + shift - 0.5
                    if (hit) next = Math.max(next, other.bottom + PART_GAP - box.top)
                }
            }
            if (next === shift) break
            shift = next
        }
        if (shift) part.setAttribute('transform', `translate(0,${shift / matrix.d}) ${part.getAttribute('transform') || ''}`.trim())
        drawn.forEach(({ left, right, top, bottom }) => placed.push({ left, right, top: top + shift, bottom: bottom + shift }))
    }
}

/** The screen rectangles of what a legend part draws: letters without their line spacing, thick lines with their stroke. */
function drawnRects(part, scale) {
    const rects = []
    const selector = 'text, rect, circle, ellipse, path, polygon, line'
    for (const element of part.matches(selector) ? [part] : part.querySelectorAll(selector)) {
        if (element.closest('defs, clipPath, marker')) continue
        let { left, right, top, bottom, width, height } = element.getBoundingClientRect()
        if (!width && !height) continue
        if (element.tagName === 'text') {
            top += height * 0.12
            bottom -= height * 0.12
        } else if (element.tagName === 'line') {
            const half = (parseFloat(getComputedStyle(element).strokeWidth) || 0) * Math.abs(scale) * 0.5
            top -= half
            bottom += half
        }
        rects.push({ left, right, top, bottom })
    }
    return rects
}

/**
 * The smallest height of the swatches of a vertical stack: rows closer together than the label text is tall would
 * print their labels over each other.
 *
 * @param {number} height the configured swatch height
 * @param {number} fontSize the label font size
 * @returns {number}
 */
export function legibleSwatchHeight(height, fontSize) {
    return Math.max(height, Math.round((fontSize || 12) * 0.85)) // the figures of a label are about 0.75em tall
}

/**
 * The gap between a title and the content below it: at least the room the descenders of the title need.
 *
 * @param {number} padding the configured titlePadding
 * @param {number} fontSize the title font size
 * @returns {number}
 */
export function titleClearance(padding, fontSize) {
    return Math.max(padding, Math.ceil((fontSize || 14) * 0.35))
}

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
            row.append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', sepLength)
                .attr('y1', y)
                .attr('x2', sepLength + tickLength)
                .attr('y2', y)
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

/**
 * Spread text labels over rows so that none of them touches another. The labels have to be in the document (their
 * bounding boxes are measured) and are taken left to right. A label goes on the first row where it clears the
 * previous label of that row by `gap` pixels, and a new row is opened when there is none, so labels never touch
 * (unless `maxRows` is reached, when the row whose last label ends first is reused).
 *
 * @param {SVGTextElement[]} nodes the labels, sorted by x
 * @param {number} [gap=3] minimum space between two labels on the same row
 * @param {number} [maxRows=Infinity] most rows to use
 * @returns {{rows:number[], count:number}} the row of each label (0 = the first row) and the number of rows used
 */
export function assignLabelRows(nodes, gap = 3, maxRows = Infinity) {
    const ends = []
    const rows = nodes.map((node) => {
        const box = node.getBBox()
        let row = ends.findIndex((end) => end + gap <= box.x)
        if (row === -1) row = ends.length < maxRows ? ends.length : ends.indexOf(Math.min(...ends))
        ends[row] = box.x + box.width
        return row
    })
    return { rows, count: Math.max(1, ends.length) }
}
