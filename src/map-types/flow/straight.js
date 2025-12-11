import { select } from 'd3-selection'
import { ensureArrowMarkers, applyArrow, setHoverArrow } from './arrows.js'
import { buildBidirectionalRouteMap } from './flow-bidirectional.js'
import { generateUniqueId } from '../../core/utils.js'

/**
 * Function to create a flow map with straight lines.
 * exampleGraph = {
 *   nodes:[{id:'FR',x:681.18,y:230.31},{id:'DE',x:824.54,y:123.70}],
 *   links:[{source:'FR',target:'DE',value:82018369.72}],
 * }
 */
export function createFlowMap(out, flowMapContainer) {
    drawStraightLinesByFlow(out, flowMapContainer)
}

// ---- Replace the existing drawStraightLinesByFlow with this one ----
function drawStraightLinesByFlow(out, container) {
    const lineGroup = container.append('g').attr('class', 'em-flow-lines').attr('id', 'em-flow-lines')

    const { nodes, links } = out.flowGraph_

    // Build node lookup for other parts of the renderer
    out._nodeById = out._nodeById || new Map(nodes.map((n) => [n.id, n]))

    // --- ARROWS: create shared markers (once per renderer) ---
    const svgRoot = out.svg_ || container
    const arrowIds = out.flowArrows_
        ? ensureArrowMarkers(svgRoot, {
            cacheKey: "straight",
            scale: out.flowArrowScale_ || 1,
            markerUnits: "strokeWidth",
            hoverColor: out.hoverColor_ || "black",
            outlineColor: out.flowOutlineColor_ || "#ffffff",
            useContextStroke: true,
        })
        : null;

    // Step 1: shared bidirectional aggregation
    const routeMap = buildBidirectionalRouteMap(nodes, links);

    // Build a flat list of segments (each segment corresponds to a single drawable half or full route)
    // We'll compute widths, optionally stack them, then draw.
    const segments = []; // { originId, destId, x1,y1,x2,y2, value, width, route, baseColorFn }

    for (const route of routeMap.values()) {
        const { idA, idB, nodeA, nodeB, flowAB, flowBA } = route
        const coordsA = [nodeA.x, nodeA.y]
        const coordsB = [nodeB.x, nodeB.y]
        const midX = (coordsA[0] + coordsB[0]) / 2
        const midY = (coordsA[1] + coordsB[1]) / 2

        if (flowAB > 0 && flowBA > 0) {
            // A -> B half
            segments.push({
                originId: idA, destId: idB,
                x1: midX, y1: midY, x2: nodeB.x, y2: nodeB.y,
                value: flowAB, route, nodeA, nodeB,
                isHalf: true
            })
            // B -> A half
            segments.push({
                originId: idB, destId: idA,
                x1: midX, y1: midY, x2: nodeA.x, y2: nodeA.y,
                value: flowBA, route, nodeA, nodeB,
                isHalf: true
            })
        } else if (flowAB > 0) {
            segments.push({
                originId: idA, destId: idB, x1: nodeA.x, y1: nodeA.y, x2: nodeB.x, y2: nodeB.y,
                value: flowAB, route, nodeA, nodeB
            })
        } else if (flowBA > 0) {
            segments.push({
                originId: idB, destId: idA, x1: nodeB.x, y1: nodeB.y, x2: nodeA.x, y2: nodeA.y,
                value: flowBA, route, nodeA, nodeB
            })
        }
    }

    // assign widths
    for (const s of segments) s.width = +out.strokeWidthScale(s.value).toFixed(1)


    // ensure endpoints use node center
    for (const s of segments) {
        const o = out._nodeById.get(s.originId), d = out._nodeById.get(s.destId)

        // Don't overwrite the origin endpoint for half-segments (we want midpoint -> node geometry).
        if (o && !s.isHalf) {
            s.x1 = o.x
            s.y1 = o.y
        }
        // destination endpoint should always be anchored at the real node
        if (d) {
            s.x2 = d.x
            s.y2 = d.y
        }
    }


    // Gradients: if color/opacity gradient requested, create defs for each segment
    const usesGradient = out.flowColorGradient_ || out.flowOpacityGradient_
    const defs = (usesGradient && (out.svg_ || container).select('defs').empty())
        ? (out.svg_ || container).append('defs')
        : ((out.svg_ || container).select('defs').empty() ? null : (out.svg_ || container).select('defs'))

    const gradientIds = []
    if (usesGradient && defs) {
        for (const s of segments) {
            const gid = generateUniqueId('flowgrad')
            gradientIds.push(gid)

            // Compute the base data-driven color for this segment (calls getFlowStroke with correct args)
            const baseColor = getFlowStroke(out, s.originId, s.destId, s.route, s.value)

            const g = defs.append('linearGradient')
                .attr('id', gid)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', s.x1)
                .attr('y1', s.y1)
                .attr('x2', s.x2)
                .attr('y2', s.y2)

            // Determine start/end colors properly:
            // - If flowColorGradient_: blend from region colour (or fallback) → the data-driven baseColor
            // - Otherwise keep a flat color (baseColor)
            const startColor = out.flowColorGradient_ ? (out.flowRegionColors_?.[0] ?? baseColor) : baseColor
            const endColor = out.flowColorGradient_ ? baseColor : baseColor

            // Opacity stops: if flowOpacityGradient_ then ramp 0 -> 1; otherwise fully opaque
            const startOpacity = out.flowOpacityGradient_ ? 0 : 1
            const endOpacity = 1

            g.append('stop').attr('offset', '0%').attr('stop-color', startColor).attr('stop-opacity', startOpacity)
            g.append('stop').attr('offset', '100%').attr('stop-color', endColor).attr('stop-opacity', endOpacity)
        }
    }

    // Draw segments (polygons if tapered, otherwise <line>)
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i]
        const baseColor = getFlowStroke(out, s.originId, s.destId, s.route, s.value) // reuse existing function signature
        const colorKey = computeColorKey(out, s.originId, s.destId)
        const paint = (usesGradient && defs) ? `url(#${gradientIds[i]})` : baseColor

        // Outline for simple stroke (only when not tapered)
        if (out.flowOutlines_ && !out.flowWidthGradient_) {
            const outlineWidth = Math.max(0, s.width + 2 * getFlowOutlineWidth(out, s.originId, s.destId, s.route, s.value))
            const outline = lineGroup.append('line')
                .attr('x1', s.x1).attr('y1', s.y1).attr('x2', s.x2).attr('y2', s.y2)
                .attr('stroke', getFlowOutlineColor(out, s.originId, s.destId, s.route, s.value, () => baseColor))
                .attr('stroke-width', outlineWidth)
                .attr('stroke-linecap', 'butt')
                .style('pointer-events', 'none')
            // don't apply arrow to outline (kept as before)
        }

        if (out.flowWidthGradient_) {
            // Build a tapered polygon for a straight segment: simple trapezoid with normals at endpoints.
            // Compute unit normal
            const dx = s.x2 - s.x1, dy = s.y2 - s.y1
            const L = Math.hypot(dx, dy) || 1
            const nx = -dy / L, ny = dx / L

            const startRatio = (out.flowWidthGradientSettings_?.startRatio) ?? 0.25
            const minStartWidth = (out.flowWidthGradientSettings_?.minStartWidth) ?? (s.width * 0.25)
            const wStart = Math.max(minStartWidth, s.width * startRatio)
            const wEnd = s.width

            // corners: top-start, top-end, bot-end, bot-start
            const topStartX = s.x1 + nx * (wStart / 2)
            const topStartY = s.y1 + ny * (wStart / 2)
            const topEndX = s.x2 + nx * (wEnd / 2)
            const topEndY = s.y2 + ny * (wEnd / 2)
            const botEndX = s.x2 - nx * (wEnd / 2)
            const botEndY = s.y2 - ny * (wEnd / 2)
            const botStartX = s.x1 - nx * (wStart / 2)
            const botStartY = s.y1 - ny * (wStart / 2)

            const dPoly = `M${topStartX},${topStartY}L${topEndX},${topEndY}L${botEndX},${botEndY}L${botStartX},${botStartY}Z`

            // optionally draw outline polygon behind
            if (out.flowOutlines_) {
                const pad = getFlowOutlineWidth(out, s.originId, s.destId, s.route, s.value)
                // simple thicker polygon around same trapezoid: expand by pad (approx) by offsetting normals
                const topStartX_o = s.x1 + nx * ((wStart / 2) + pad)
                const topStartY_o = s.y1 + ny * ((wStart / 2) + pad)
                const topEndX_o = s.x2 + nx * ((wEnd / 2) + pad)
                const topEndY_o = s.y2 + ny * ((wEnd / 2) + pad)
                const botEndX_o = s.x2 - nx * ((wEnd / 2) + pad)
                const botEndY_o = s.y2 - ny * ((wEnd / 2) + pad)
                const botStartX_o = s.x1 - nx * ((wStart / 2) + pad)
                const botStartY_o = s.y1 - ny * ((wStart / 2) + pad)

                const dOutline = `M${topStartX_o},${topStartY_o}L${topEndX_o},${topEndY_o}L${botEndX_o},${botEndY_o}L${botStartX_o},${botStartY_o}Z`
                lineGroup.append('path')
                    .attr('d', dOutline)
                    .attr('fill', out.flowOutlineColor_)
                    .attr('class', 'em-flow-link-outline')
            }

            const mainSel = lineGroup.append('path')
                .attr('d', dPoly)
                .attr('fill', paint)
                .attr('class', 'em-flow-link em-flow-link-tapered')
                .attr('data-color-key', colorKey)
                .attr('data-color', baseColor)
                .style('cursor', 'pointer')
            // .on('mouseover', onFlowLineMouseOver(out, originId, destId, value, arrowIds))
            // .on('mousemove', onFlowLineMouseMove(out))
            // .on('mouseout', onFlowLineMouseOut(out, baseColor, arrowIds)); // use baseColor

            // If arrows are enabled, attempt to apply — approximate arrow anchor by using endpoint coordinates.
            if (out.flowArrows_) {
                // convert path to a fake "line" for arrow application: we append a zero-length line at the true end with marker.
                const tip = lineGroup.append('line')
                    .attr('x1', s.x2).attr('y1', s.y2).attr('x2', s.x2).attr('y2', s.y2)
                    .style('pointer-events', 'none')
                applyArrow(tip, arrowIds, 'normal')
                // tip is invisible; markers render visually
            }
        } else {
            // simple stroked line (existing behaviour)
            const dashVis = Math.max(0, Math.hypot(s.x2 - s.x1, s.y2 - s.y1) - (out.flowArrows_ ? arrowBackoffPxForStroke(s.width) : 0))
            const dashGap = out.flowArrows_ ? Math.min(arrowBackoffPxForStroke(s.width), Math.hypot(s.x2 - s.x1, s.y2 - s.y1)) : null

            const main = lineGroup.append('line')
                .attr('data-nb', s.value)
                .attr('x1', s.x1).attr('y1', s.y1)
                .attr('x2', s.x2).attr('y2', s.y2)
                .attr('data-origin', s.originId)
                .attr('data-dest', s.destId)
                .attr('stroke', paint)
                .attr('stroke-width', s.width)
                .attr('stroke-opacity', out.flowOpacity_)
                .attr('stroke-linecap', 'butt')
                .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
                .attr('data-color', baseColor)
                .attr('data-color-key', colorKey)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, s.originId, s.destId, s.value, arrowIds))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baseColor, arrowIds));

            if (out.flowArrows_) applyArrow(main, arrowIds, 'normal');
        }
    }

    // ---- end drawStraightLinesByFlow ----
}



// ----------  helpers ----------
function getFlowOutlineColor(out, originId, destId, route, halfValue, innerStrokeFn) {
    const val = out.flowOutlineColor_
    if (typeof val === 'function') {
        const nodeById = out._nodeById || new Map(out.flowGraph_.nodes.map(n => [n.id, n]))
        const linkLike = {
            source: nodeById.get(originId) || { id: originId },
            target: nodeById.get(destId) || { id: destId },
            value: halfValue, route,
            innerColor: (typeof innerStrokeFn === 'function') ? innerStrokeFn() : innerStrokeFn
        }
        let c
        try { c = val(linkLike) } catch (_) { }
        if (c == null && val.length >= 3) {
            try { c = val(originId, destId, route) } catch (_) { }
        }
        return c ?? (out.flowOutlineFallback_ ?? '#ffffff')
    }
    return val ?? (out.flowOutlineFallback_ ?? '#ffffff')
}



// estimate arrow length (px) for a given stroke width (px), matched to arrows.js createMarker()
function arrowBackoffPxForStroke(strokePx) {
    // match arrows.js createMarker(): markerWidth = 3 * scale, tip at ~90% of viewBox
    const arrowLenPx = strokePx * (3 * (out.flowArrowScale_ || 1)) * 0.9;
    return arrowLenPx * 0.7; // slightly less so the base tucks under cleanly
}

function getFlowStroke(out, originId, destId, route, halfValue) {
    const fallback = typeof out.flowColor_ === 'string' ? out.flowColor_ : '#999999'
    const nodeById = out._nodeById || new Map(out.flowGraph_.nodes.map(n => [n.id, n]))
    const source = nodeById.get(originId) || { id: originId }
    const target = nodeById.get(destId) || { id: destId }
    const linkLike = { source, target, value: halfValue, route }

    if (typeof out.flowColor_ === 'function') {
        let color
        try { color = out.flowColor_(linkLike) } catch (_) { }
        if (color == null && out.flowColor_.length >= 3) {
            try { color = out.flowColor_(originId, destId, route) } catch (_) { }
        }
        if (color != null) return color
    }
    return colorByTopN(out, originId, destId, fallback)
}

function colorByTopN(out, originId, destId, fallback) {
    if (!out.topLocationKeys || !out.flowTopLocations_) return fallback
    const type = out.flowTopLocationsType_ || 'sum'
    if (type === 'origin') {
        return out.topLocationKeys.has(originId) ? out.topLocationColorScale(originId) : fallback
    }
    if (type === 'destination') {
        return out.topLocationKeys.has(destId) ? out.topLocationColorScale(destId) : fallback
    }
    return out.topLocationKeys.has(destId)
        ? out.topLocationColorScale(destId)
        : (out.topLocationKeys.has(originId) ? out.topLocationColorScale(originId) : fallback)
}

function getFlowOutlineWidth(out, originId, destId, route, halfValue) {
    const w = out.flowOutlineWidth_
    if (typeof w === 'function') {
        const nodeById = out._nodeById || new Map(out.flowGraph_.nodes.map(n => [n.id, n]))
        const linkLike = { source: nodeById.get(originId) || { id: originId }, target: nodeById.get(destId) || { id: destId }, value: halfValue, route }
        let res
        try { res = w(linkLike) } catch (_) { }
        if (res == null && w.length >= 3) {
            try { res = w(originId, destId, route) } catch (_) { }
        }
        return Math.max(0, +res || 0)
    }
    return Math.max(0, +w || 1)
}


function computeColorKey(out, originId, destId) {
    if (!out.topLocationKeys) return null;

    const type = out.flowTopLocationsType_ || 'sum';

    if (type === 'origin') {
        return out.topLocationKeys.has(originId) ? originId : 'Other';
    }

    if (type === 'destination') {
        return out.topLocationKeys.has(destId) ? destId : 'Other';
    }

    // default: 'sum' / mixed – prefer destination if in top list, else origin, else "Other"
    if (out.topLocationKeys.has(destId)) return destId;
    if (out.topLocationKeys.has(originId)) return originId;
    return 'Other';
}

// Hover handlers (arrow swap aware)
function onFlowLineMouseOver(out, sourceId, targetId, flow, arrowIds) {
    return function (e) {
        const hoveredColor = out.hoverColor_ || 'black'
        select(this).attr('stroke', hoveredColor)
        if (out.flowArrows_) setHoverArrow(select(this), arrowIds, true)

        if (out._tooltip) {
            const sourceNode = out.flowGraph_.nodes.find((n) => n.id === sourceId)
            const targetNode = out.flowGraph_.nodes.find((n) => n.id === targetId)
            const linkObj = { source: sourceNode, target: targetNode, value: flow }
            out._tooltip.mouseover(out.tooltip_.textFunction(linkObj, out))
        }
    }
}

function onFlowLineMouseMove(out) {
    return function (e) {
        if (out._tooltip) out._tooltip.mousemove(e)
    }
}

function onFlowLineMouseOut(out, baseColor, arrowIds) {
    return function () {
        select(this).attr('stroke', baseColor)   // restore solid base color
        if (out.flowArrows_) setHoverArrow(select(this), arrowIds, false)
        if (out._tooltip) out._tooltip.mouseout()
    }
}