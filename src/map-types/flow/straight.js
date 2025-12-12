import { select } from 'd3-selection'
import { ensureArrowMarkers, applyArrow, setHoverArrow } from './arrows.js'
import { buildBidirectionalRouteMap } from './flow-bidirectional.js'
import { generateUniqueId } from '../../core/utils.js'
import { drawEdgeBundleLines } from './edge-bundling.js';

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

// ------------- orchestrator -------------
function drawStraightLinesByFlow(out, container) {
    // minimal guard
    if (!out?.flowGraph_) return;

    // create arrow markers once
    const svgRoot = out.svg_ || container;
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

    const segments = buildSegments(out);

    assignWidths(out, segments);
    const gradientIds = prepareGradients(out, container, segments);
    drawSegments(out, container, segments, gradientIds, arrowIds);

}


// ---------------- helpers ----------------
const idFor = (v) => (v && typeof v === 'object' ? (v.id ?? v.iata ?? v.code) : v);

// Build segments array depending on out.flowBidirectional_
function buildSegments(out) {
    const { nodes = [], links = [] } = out.flowGraph_ || {};
    out._nodeById = out._nodeById || new Map(nodes.map((n) => [n.id, n]));

    const segs = [];

    if (out.flowBidirectional_) {
        // Original bidirectional handling remains the same
        const routeMap = buildBidirectionalRouteMap(nodes, links);
        for (const route of routeMap.values()) {
            const { idA, idB, nodeA, nodeB, flowAB, flowBA } = route;
            const midX = (nodeA.x + nodeB.x) / 2;
            const midY = (nodeA.y + nodeB.y) / 2;

            if (flowAB > 0 && flowBA > 0) {
                segs.push({
                    originId: idA,
                    destId: idB,
                    x1: midX,
                    y1: midY,
                    x2: nodeB.x,
                    y2: nodeB.y,
                    value: flowAB,
                    route,
                    nodeA,
                    nodeB,
                    isHalf: true,
                });
                segs.push({
                    originId: idB,
                    destId: idA,
                    x1: midX,
                    y1: midY,
                    x2: nodeA.x,
                    y2: nodeA.y,
                    value: flowBA,
                    route,
                    nodeA,
                    nodeB,
                    isHalf: true,
                });
            } else if (flowAB > 0) {
                segs.push({
                    originId: idA,
                    destId: idB,
                    x1: nodeA.x,
                    y1: nodeA.y,
                    x2: nodeB.x,
                    y2: nodeB.y,
                    value: flowAB,
                    route,
                    nodeA,
                    nodeB,
                });
            } else if (flowBA > 0) {
                segs.push({
                    originId: idB,
                    destId: idA,
                    x1: nodeB.x,
                    y1: nodeB.y,
                    x2: nodeA.x,
                    y2: nodeA.y,
                    value: flowBA,
                    route,
                    nodeA,
                    nodeB,
                });
            }
        }
    } else {
        // --- Single-direction merged flows ---
        const merged = new Map();
        const { links = [] } = out.flowGraph_ || {};
        const nodeMap = out._nodeById;

        for (const link of links) {
            const sid = idFor(link.source);
            const tid = idFor(link.target);
            if (!sid || !tid || sid === tid) continue;

            const key = sid < tid ? `${sid}|${tid}` : `${tid}|${sid}`; // symmetric key
            const value = +link.value || +link.nb || 0;
            if (!(value > 0)) continue;

            const sourceNode =
                nodeMap.get(sid) ||
                (typeof link.source === "object" ? link.source : null);
            const targetNode =
                nodeMap.get(tid) ||
                (typeof link.target === "object" ? link.target : null);

            if (!sourceNode || !targetNode) continue;

            const entry = merged.get(key);
            if (entry) {
                entry.value += value;
            } else {
                merged.set(key, {
                    originId: sid,
                    destId: tid,
                    nodeA: sourceNode,   // 🧩 store live references
                    nodeB: targetNode,
                    value,

                    // 🧠 define getters that always read live node positions
                    get x1() { return this.nodeA.x; },
                    get y1() { return this.nodeA.y; },
                    get x2() { return this.nodeB.x; },
                    get y2() { return this.nodeB.y; },
                });
            }
        }

        segs.push(...merged.values());
    }

    return segs;
}

function assignWidths(out, segments) {
    for (const s of segments) {
        const sw = typeof out.strokeWidthScale === 'function' ? out.strokeWidthScale(s.value) : (s.value || 1);
        s.width = +((sw == null ? 1 : sw)).toFixed(1);
    }
}

// create deduped gradients, return array of gradientId per segment (index aligned)
function prepareGradients(out, container, segments) {
    const usesGradient = out.flowColorGradient_ || out.flowOpacityGradient_;
    if (!usesGradient) return null;

    const svgRoot = out.svg_ || container;
    const defs = (svgRoot.select('defs').empty()) ? svgRoot.append('defs') : svgRoot.select('defs');
    const gradientMap = new Map();
    const gradientIds = new Array(segments.length);


    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        const baseColor = getFlowStroke(out, s.originId, s.destId, s.route, s.value);
        // key: rounded coords + color + opacity flag. Adjust bucketing if necessary.
        const key = `${Math.round(s.x1)}:${Math.round(s.y1)}:${Math.round(s.x2)}:${Math.round(s.y2)}:${baseColor}:${out.flowOpacityGradient_ ? 1 : 0}`;
        let gid = gradientMap.get(key);
        if (!gid) {
            gid = generateUniqueId('flowgrad');
            gradientMap.set(key, gid);

            const g = defs.append('linearGradient')
                .attr('id', gid)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', s.x1).attr('y1', s.y1)
                .attr('x2', s.x2).attr('y2', s.y2);

            const startColor = out.flowColorGradient_ ? (out.flowRegionColors_?.[0] ?? baseColor) : baseColor;
            const startOpacity = out.flowOpacityGradient_ ? 0 : 1;
            const endOpacity = 1;

            g.append('stop').attr('offset', '0%').attr('stop-color', startColor).attr('stop-opacity', startOpacity);
            g.append('stop').attr('offset', '100%').attr('stop-color', baseColor).attr('stop-opacity', endOpacity);
        }
        gradientIds[i] = gid;
    }

    return gradientIds;
}

// draw all segments (one element per segment). avoid extra tip/outline nodes and inline styles
function drawSegments(out, container, segments, gradientIds, arrowIds) {
    const lineGroup = container.select('.em-flow-lines').empty()
        ? container.append('g').attr('class', 'em-flow-lines').attr('id', 'em-flow-lines')
        : container.select('.em-flow-lines');

    const usesGradient = !!gradientIds;

    if (out.flowEdgeBundling_) {
        drawEdgeBundleLines(out,lineGroup)
        return;
    }

    // draw each segment
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        const baseColor = getFlowStroke(out, s.originId, s.destId, s.route, s.value);
        const colorKey = computeColorKey(out, s.originId, s.destId);
        const paint = (usesGradient && gradientIds[i]) ? `url(#${gradientIds[i]})` : baseColor;
        let paths

        if (out.flowWidthGradient_) {
            // tapered polygon path (single element)
            const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
            const L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;

            const startRatio = (out.flowWidthGradientSettings_?.startRatio) ?? 0.25;
            const minStartWidth = (out.flowWidthGradientSettings_?.minStartWidth) ?? (s.width * 0.25);
            const wStart = Math.max(minStartWidth, s.width * startRatio);
            const wEnd = s.width;

            const topStartX = s.x1 + nx * (wStart / 2);
            const topStartY = s.y1 + ny * (wStart / 2);
            const topEndX = s.x2 + nx * (wEnd / 2);
            const topEndY = s.y2 + ny * (wEnd / 2);
            const botEndX = s.x2 - nx * (wEnd / 2);
            const botEndY = s.y2 - ny * (wEnd / 2);
            const botStartX = s.x1 - nx * (wStart / 2);
            const botStartY = s.y1 - ny * (wStart / 2);

            const dPoly = `M${topStartX},${topStartY}L${topEndX},${topEndY}L${botEndX},${botEndY}L${botStartX},${botStartY}Z`;

            paths = lineGroup.append('path')
                .attr('d', dPoly)
                .attr('class', 'em-flow-link em-flow-link-tapered')
                .attr('fill', paint)
                .attr('data-color-key', colorKey)
                .attr('data-color', baseColor)
                .attr('data-nb', s.value)
                .attr('data-origin', s.originId)
                .attr('data-dest', s.destId)
                .attr('opacity', out.flowOpacity_ ?? 1);

            if (out.flowArrows_) applyArrow(paths, arrowIds, 'normal');
            // note: mouse handlers for tapered shapes omitted in original; add if needed
        } else {

            //  original straight line fallback
            const segLen = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 0;
            const backoff = out.flowArrows_ ? arrowBackoffPxForStroke(s.width) : 0;
            const dashVis = Math.max(0, segLen - backoff);
            const dashGap = out.flowArrows_ ? Math.min(backoff, segLen) : null;

            paths = lineGroup.append('line')
                .datum(s) // 🔹 attach the segment itself
                .attr('x1', d => d.x1)
                .attr('y1', d => d.y1)
                .attr('x2', d => d.x2)
                .attr('y2', d => d.y2)
                .attr('class', 'em-flow-link')
                .attr('data-nb', s.value)
                .attr('data-origin', s.originId)
                .attr('data-dest', s.destId)
                .attr('stroke', paint)
                .attr('stroke-width', s.width)
                .attr('stroke-opacity', out.flowOpacity_ ?? 1)
                .attr('stroke-linecap', 'butt')
                .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
                .attr('data-color', baseColor)
                .attr('data-color-key', colorKey);
        }

        //mouse events
        paths.on('mouseover', onFlowLineMouseOver(out, s.originId, s.destId, s.value, arrowIds))
            .on('mousemove', onFlowLineMouseMove(out))
            .on('mouseout', onFlowLineMouseOut(out, baseColor, arrowIds));

        //arrows
        if (out.flowArrows_) applyArrow(paths, arrowIds, 'normal');
    }
}



// estimate arrow length (px) for a given stroke width (px), matched to arrows.js createMarker()
function arrowBackoffPxForStroke(strokePx) {
    // match arrows.js createMarker(): markerWidth = 3 * scale, tip at ~90% of viewBox
    const arrowLenPx = strokePx * (3 * (out.flowArrowScale_ || 1)) * 0.9;
    return arrowLenPx * 0.7; // slightly less so the base tucks under cleanly
}

export function getFlowStroke(out, originId, destId, route, halfValue) {
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


export function computeColorKey(out, originId, destId) {
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
export function onFlowLineMouseOver(out, sourceId, targetId, flow, arrowIds) {
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

export function onFlowLineMouseMove(out) {
    return function (e) {
        if (out._tooltip) out._tooltip.mousemove(e)
    }
}

export function onFlowLineMouseOut(out, baseColor, arrowIds) {
    return function () {
        select(this).attr('stroke', baseColor)   // restore solid base color
        if (out.flowArrows_) setHoverArrow(select(this), arrowIds, false)
        if (out._tooltip) out._tooltip.mouseout()
    }
}