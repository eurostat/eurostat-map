// arrows.js — shared arrow utilities for straight + sankey
const uid = (prefix = 'arrow') => `${prefix}-${Math.random().toString(36).slice(2)}`
const markerSize = 3
const viewBoxSize = 10
const tipX = 9.9

export const arrowHeadLength = (strokeWidth, scale) => (strokeWidth * scale * markerSize * tipX) / viewBoxSize

/**
 * Ensure <defs> exists on the given SVG root/selection.
 * @param {d3.Selection} svgRoot
 */
export function ensureDefs(svgRoot) {
    let defs = svgRoot.select('defs')
    if (defs.empty()) defs = svgRoot.append('defs')
    return defs
}

/**
 * Create (once) a trio of arrow markers: normal, hover, outline.
 * Returns their IDs. If they already exist, just returns the same IDs.
 *
 * @param {d3.Selection} svgRoot - your <svg> selection (or top container that can host <defs>)
 * @param {Object} opts
 * @param {string} [opts.cacheKey="default"] - so straight/sankey can keep separate sets if desired
 * @param {number} [opts.scale=1] - multiplies the marker geometry
 * @param {string} [opts.markerUnits="strokeWidth"] - "strokeWidth" to scale with line width, or "userSpaceOnUse"
 * @param {string} [opts.hoverColor="black"]
 * @param {string} [opts.outlineColor="#ffffff"]
 * @param {string} [opts.idBase] - stable base, otherwise generated
 * @param {boolean} [opts.useContextStroke=true] - if true, marker fill = "context-stroke"
 */
export function ensureArrowMarkers(svgRoot, opts = {}) {
    const {
        cacheKey = 'default',
        scale = 1,
        markerUnits = 'strokeWidth',
        hoverColor = 'black',
        outlineColor = '#ffffff',
        idBase = uid('arrow'),
        useContextStroke = true,
        joinAtBase = false,
    } = opts

    // stash on the svg node so both renderers can reuse
    const node = svgRoot.node()
    node._arrowCache ||= new Map()
    if (node._arrowCache.has(cacheKey)) return node._arrowCache.get(cacheKey)

    const defs = ensureDefs(svgRoot)

    const ids = {
        normal: `${idBase}`,
        hover: `${idBase}-hover`,
        outline: `${idBase}-outline`,
    }

    // create if missing
    if (defs.select(`#${ids.normal}`).empty()) {
        createMarker(defs, ids.normal, {
            markerUnits,
            scale,
            joinAtBase,
            fill: useContextStroke ? 'context-stroke' : hoverColor,
            out: opts.out, // 👈 add this
        })
    }
    if (defs.select(`#${ids.hover}`).empty()) {
        createMarker(defs, ids.hover, {
            markerUnits,
            scale,
            joinAtBase,
            fill: hoverColor,
            out: opts.out,
        })
    }
    if (defs.select(`#${ids.outline}`).empty()) {
        createMarker(defs, ids.outline, {
            markerUnits,
            scale,
            joinAtBase,
            fill: opts.out?.flowOutlineColor_ || outlineColor,
            out: opts.out,
        })
    }

    node._arrowCache.set(cacheKey, ids)
    return ids
}

/**
 * Apply a marker-end to a selection (e.g., your line/path).
 * Pass ids from ensureArrowMarkers and one of "normal" | "hover" | "outline".
 */
export function applyArrow(selection, ids, variant = 'normal') {
    if (!ids) return selection
    const id = ids[variant]
    return selection.attr('marker-end', id ? `url(#${id})` : null)
}

/**
 * Convenience helpers for hover swapping.
 */
export function setHoverArrow(selection, ids, on) {
    return applyArrow(selection, ids, on ? 'hover' : 'normal')
}

/**
 * Internal: create a compact, rounded arrow head.
 * You can tweak geometry here and it’ll propagate everywhere.
 */
function createMarker(defs, id, { markerUnits = 'strokeWidth', scale = 1, fill = 'context-stroke', joinAtBase }) {
    const midY = viewBoxSize / 2
    const size = markerSize * scale

    const m = defs
        .append('marker')
        .attr('id', id)
        .attr('markerUnits', markerUnits) // scales with line/outline width
        .attr('markerWidth', size)
        .attr('markerHeight', size)
        .attr('viewBox', `0 0 ${viewBoxSize} ${viewBoxSize}`)
        .attr('refX', joinAtBase ? 0 : tipX)
        .attr('refY', midY)
        .attr('orient', 'auto')

    // single filled arrow; outline comes from the *outline line*'s own marker
    m.append('path')
        .attr('fill', fill)
        .attr('d', `M0,0 L${tipX},${midY} L0,${viewBoxSize}${joinAtBase ? '' : ` L${viewBoxSize * 0.22},${midY}`} Z`)
}
