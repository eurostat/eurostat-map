import { select } from 'd3-selection'
import { ensureArrowMarkers, applyArrow, setHoverArrow } from './arrows.js'
import { buildBidirectionalRouteMap } from './flow-bidirectional.js'

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

// straight lines that can be bidirectional. If flow is bidirectional, draw two half-lines from midpoint to each node.
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

    // Step 2: Draw each route
    for (const route of routeMap.values()) {
        const { idA, idB, nodeA, nodeB, flowAB, flowBA } = route
        const coordsA = [nodeA.x, nodeA.y]
        const coordsB = [nodeB.x, nodeB.y]
        const midX = (coordsA[0] + coordsB[0]) / 2
        const midY = (coordsA[1] + coordsB[1]) / 2
        const abStroke = () => getFlowStroke(out, idA, idB, route, flowAB)
        const baStroke = () => getFlowStroke(out, idB, idA, route, flowBA)

        // helper to draw one segment (with optional outline + arrows)
        const drawSegment = (x1, y1, x2, y2, originId, destId, value, strokeFn) => {
            const innerWidth = +out.strokeWidthScale(value).toFixed(1);
            const segLen = Math.hypot(x2 - x1, y2 - y1) || 1;

            // Solid base color, used both for painting and legend matching
            const baseColor = strokeFn();                // getFlowStroke(...) result
            const colorKey = computeColorKey(out, originId, destId); // stable key for top-N case

            // backoff in px so the last px of the line is invisible under the arrow,
            // but the marker is still anchored at the true endpoint (x2,y2).
            const backoffMain = out.flowArrows_ ? arrowBackoffPxForStroke(innerWidth) : 0;

            // --- OUTLINE (behind) ---
            if (out.flowOutlines_) {
                const outlineColor = getFlowOutlineColor(out, originId, destId, route, value, strokeFn);
                const outlinePad = getFlowOutlineWidth(out, originId, destId, route, value);
                const outlineWidth = Math.max(0, innerWidth + 2 * outlinePad);
                const backoffOutline = out.flowArrows_ ? arrowBackoffPxForStroke(outlineWidth) : 0;

                const dashVis = Math.max(0, segLen - backoffOutline);
                const dashGap = Math.min(backoffOutline, segLen); // cap

                const outline = lineGroup.append('line')
                    .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                    .attr('stroke', outlineColor)
                    .attr('stroke-width', outlineWidth)
                    .attr('stroke-opacity', out.flowOutlineOpacity_ ?? out.flowOpacity_ ?? 1)
                    .attr('stroke-linecap', 'butt')
                    .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
                    .style('pointer-events', 'none');

                // if (out.flowArrows_) applyArrow(outline, arrowIds, 'outline');
            }

            // --- MAIN STROKE (on top) ---
            const dashVis = Math.max(0, segLen - backoffMain);
            const dashGap = Math.min(backoffMain, segLen);

            const main = lineGroup.append('line')
                .attr('data-nb', value)
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('data-origin', originId)
                .attr('data-dest', destId)
                .attr('stroke', baseColor)         // use solid base color
                .attr('stroke-width', innerWidth)
                .attr('stroke-opacity', out.flowOpacity_)
                .attr('stroke-linecap', 'butt')
                .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
                .attr('data-color', baseColor)     // 👈 for legend hover by color
                .attr('data-color-key', colorKey)  // 👈 for legend hover by key (top-N)
                .style('cursor', 'pointer')
                .on('mouseover', onFlowLineMouseOver(out, originId, destId, value, arrowIds))
                .on('mousemove', onFlowLineMouseMove(out))
                .on('mouseout', onFlowLineMouseOut(out, baseColor, arrowIds)); // use baseColor

            if (out.flowArrows_) applyArrow(main, arrowIds, 'normal');
        };


        // --- CASES ---
        if (flowAB > 0 && flowBA > 0) {
            // A → B half
            drawSegment(midX, midY, coordsB[0], coordsB[1], idA, idB, flowAB, abStroke)
            // B → A half
            drawSegment(midX, midY, coordsA[0], coordsA[1], idB, idA, flowBA, baStroke)
        } else if (flowAB > 0) {
            drawSegment(coordsA[0], coordsA[1], coordsB[0], coordsB[1], idA, idB, flowAB, abStroke)
        } else if (flowBA > 0) {
            drawSegment(coordsB[0], coordsB[1], coordsA[0], coordsA[1], idB, idA, flowBA, baStroke)
        }
    }

    // ----------  outline helpers ----------
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

    // estimate arrow length (px) for a given stroke width (px), matched to arrows.js createMarker()
    function arrowBackoffPxForStroke(strokePx) {
        // match arrows.js createMarker(): markerWidth = 3 * scale, tip at ~90% of viewBox
        const arrowLenPx = strokePx * (3 * (out.flowArrowScale_ || 1)) * 0.9;
        return arrowLenPx * 0.7; // slightly less so the base tucks under cleanly
    }
}


