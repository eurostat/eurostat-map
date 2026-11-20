// Layout helpers for map labels: where a flow node label sits relative to its symbol, and which labels
// to hide when they collide. Pure functions are kept separate from the DOM pass so they can be unit tested.

/** Elements a label must not overlap: they are drawn on top of the map and always win. */
const OBSTACLE_SELECTOR = '.em-legend, .em-title, .em-subtitle, .em-scalebar, .em-footnote'

/**
 * Where to put a flow node label relative to the node's symbol. The label sits on the symbol edge
 * (`x`/`y`, in the node's coordinate system) and is pushed away from it by `dx`/`dy` in `em`. Labels are
 * rescaled to a constant screen size on zoom while the symbol grows with the map, and `em` offsets follow
 * the font size, so the gap stays the same on screen. Text is vertically centred (`dominant-baseline: central`).
 * @param {'top'|'bottom'|'left'|'right'} [position='top']
 * @param {number} [radius=0] radius of the node symbol
 * @returns {{x: number, y: number, dx: string, dy: string, anchor: 'start'|'middle'|'end'}}
 */
export function flowNodeLabelPlacement(position = 'top', radius = 0) {
    const r = radius || 0
    switch (position) {
        case 'bottom':
            return { x: 0, y: r, dx: '0', dy: '0.8em', anchor: 'middle' }
        case 'left':
            return { x: -r, y: 0, dx: '-0.4em', dy: '0', anchor: 'end' }
        case 'right':
            return { x: r, y: 0, dx: '0.4em', dy: '0', anchor: 'start' }
        default:
            return { x: 0, y: -r, dx: '0', dy: '-0.8em', anchor: 'middle' }
    }
}

const hasArea = (box) => box && box.right > box.left && box.bottom > box.top

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/**
 * Decides which labels stay visible. Labels are taken in priority order: a label is hidden when it lies
 * (partly) outside the frame, or overlaps an obstacle or a label that was already kept.
 * @param {Array<{left:number,right:number,top:number,bottom:number}|null>} boxes label boxes, highest priority first
 * @param {Array<{left:number,right:number,top:number,bottom:number}>} obstacles boxes that labels may not overlap
 * @param {{left:number,right:number,top:number,bottom:number}} frame area the labels have to stay inside
 * @param {number} [padding=2] extra clearance around each label
 * @returns {boolean[]} true where the label stays visible
 */
export function chooseVisibleLabels(boxes, obstacles, frame, padding = 2) {
    const taken = obstacles.filter(hasArea)
    return boxes.map((box) => {
        // nothing to draw, so nothing to hide
        if (!hasArea(box)) return true
        const inside = box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom
        if (!inside) return false
        const padded = { left: box.left - padding, right: box.right + padding, top: box.top - padding, bottom: box.bottom + padding }
        if (taken.some((other) => intersects(padded, other))) return false
        taken.push(box)
        return true
    })
}

/**
 * Hides the labels of a map that collide with each other, with the legend / title / subtitle / scale bar, or
 * that fall outside the map. Enabled with `labels({ hideOverlapping: true })`. Flow node labels have priority
 * over geographic labels (larger nodes first), then geographic labels keep their array order.
 *
 * It measures what is on screen, so it has to run after the zoom transform has been applied.
 * @param {Object} map eurostat-map instance (or a layer of it)
 */
export function hideCollidingLabels(map) {
    if (!map.labels_?.hideOverlapping || !map.svg_) return
    const svgNode = map.svg_.node()
    const zoomGroup = svgNode?.querySelector('#em-zoom-group-' + map.svgId_)
    if (!zoomGroup) return
    const frame = svgNode.getBoundingClientRect()
    if (!frame.width || !frame.height) return // not displayed

    const labels = [...zoomGroup.querySelectorAll('#em-labels .em-flow-node-label'), ...zoomGroup.querySelectorAll('#em-labels .em-geographic-label')]
    const haloById = new Map([...zoomGroup.querySelectorAll('.em-label-halos text')].map((halo) => [halo.id, halo]))
    const obstacles = [...svgNode.querySelectorAll(OBSTACLE_SELECTOR)].map((element) => element.getBoundingClientRect())

    const visible = chooseVisibleLabels(
        labels.map((label) => label.getBoundingClientRect()),
        obstacles,
        frame
    )
    labels.forEach((label, i) => {
        const visibility = visible[i] ? '' : 'hidden'
        label.style.visibility = visibility
        // geographic label halos are drawn in a separate group
        const text = label.querySelector('text')
        const halo = text && haloById.get(text.id.replace('em-label-', 'em-label-halo-'))
        if (halo) halo.style.visibility = visibility
    })
}
