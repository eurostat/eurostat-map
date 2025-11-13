import { generateUniqueId } from '../../core/utils'
import { sum } from 'd3-array'
import { select } from 'd3-selection'
import { ensureArrowMarkers, applyArrow, setHoverArrow } from './arrows.js';

// spatial sankey. Adopted from this notebook: https://observablehq.com/@bayre/deconstructed-sankey-diagram
// See https://observablehq.com/@joewdavies/flow-map-of-europe

/**
     * Function to create a map with Sankey diagram and other elements
     * exampleGraph = {
                nodes: [
                    { id: 'FR', x: 681.1851800759263, y: 230.31124763648583 },
                    { id: 'DE', x: 824.5437782154489, y: 123.70302649032199 },
                ],
                links: [
                    { source: 'FR', target: 'DE', value: 82018369.72 },
                ],
            }
     */

export function createSankeyFlowMap(out, sankeyContainer) {
    out = out
    const svg = out.svg_
    const graph = out.flowGraph_
    const usesGradient = out.flowColorGradient_ || out.flowOpacityGradient_;

    const { nodes, links } = sankey(out, graph)

    // shared markers (normal/hover/outline)
    const arrowIds = out.flowArrows_
        ? ensureArrowMarkers(svg, {
            cacheKey: 'sankey',
            scale: out.flowArrowScale_ || 1,
            markerUnits: 'strokeWidth',
            hoverColor: out.hoverColor_ || 'black',
            outlineColor: out.flowOutlineColor_ || '#ffffff',
            useContextStroke: true,
        })
        : null;

    // gradients
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    const gradientIds = links.map(() => generateUniqueId('gradient'));
    if (usesGradient) addFlowGradients(out, defs, gradientIds, links);


    // Add Sankey flows
    addSankeyFlows(out, sankeyContainer, nodes, links, arrowIds, gradientIds)

    // Add lines at nodes (stems)
    addNodeStems(out, sankeyContainer, nodes)

    return svg.node()
}

/**
 * Adds linear gradient definitions for flow links
 */
function addFlowGradients(out, defs, gradientIds, links) {
    // one gradient per link (keep indices aligned with `links`)
    defs.selectAll('linearGradient')
        .data(links)
        .join('linearGradient')
        .attr('id', (_, i) => gradientIds[i])
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', d => d?.source?.x1 ?? d?.target?.x0 ?? 0)
        .attr('x2', d => d?.target?.x0 ?? d?.source?.x1 ?? 0)
        .attr('y1', d => d?.y0 ?? d?.y1 ?? 0)
        .attr('y2', d => d?.y1 ?? d?.y0 ?? 0)
        .each(function (d) {
            const g = select(this);
            g.selectAll('stop').remove();

            // Colors: if color gradient is ON, blend from region color → flow color.
            // Otherwise keep a flat color (whatever getFlowStroke returns).
            const startColor = out.flowColorGradient_
                ? (out.flowRegionColors_?.[0] ?? getFlowStroke(out, d))
                : getFlowStroke(out, d);

            const endColor = out.flowColorGradient_
                ? (typeof out.flowColor_ === 'function' ? out.flowColor_(d) : out.flowColor_)
                : getFlowStroke(out, d);

            // Opacity: if opacity gradient is ON, start at 0 → 1; else keep at 1.
            const startOpacity = out.flowOpacityGradient_ ? 0 : 1;
            const endOpacity = 1;

            g.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', startColor)
                .attr('stop-opacity', startOpacity);

            g.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', endColor)
                .attr('stop-opacity', endOpacity);
        });
}

function clone({ nodes, links }) {
    return { nodes: nodes.map((d) => Object.assign({}, d)), links: links.map((d) => Object.assign({}, d)) }
}

function sankey(out) {
    const graph = out.flowGraph_
    computeNodeValues(graph)
    computeNodeDepths(graph)
    computeNodeHeights(graph)
    computeNodeBreadths(out, graph)
    computeLinkBreadths(out, graph)
    return graph
}

function addSankeyFlows(out, container, nodes, links, arrowIds, gradientIds) {
    const usesGradient = out.flowColorGradient_ || out.flowOpacityGradient_;
    const flowsGroup = buildFlowsGroup(container, out);
    const linkPath = sankeyLinkAvoidingNodes(nodes, out.flowCurvatureSettings_);

    links.forEach((link, i) => {
        const dCenter = linkPath(link);
        const colorKey = computeColorKey(out, link);
        const paint = usesGradient ? `url(#${gradientIds[i]})` : getFlowStroke(out, link);

        // Outline behind the main symbol (only for simple stroke variant)
        if (out.flowOutlines_ && !out.flowWidthGradient_) {
            buildOutlinePath(out, flowsGroup, dCenter, link, arrowIds);
        }

        // Main symbol
        const mainSel = out.flowWidthGradient_
            ? buildTaperedMain(out, flowsGroup, dCenter, link, paint, colorKey)
            : buildSimpleMain(out, flowsGroup, dCenter, link, paint, colorKey, arrowIds);

        // Mouse/tooltip/arrow hover
        addMouseEvents(out, mainSel, {
            usesGradient,
            paint,
            link,
            arrowIds
        });
    });
}

/* ----------------- helpers ----------------- */

function buildFlowsGroup(container, out) {
    return container.append('g')
        .attr('class', 'em-flow-lines')
        .attr('id', 'em-flow-lines')
        .style('opacity', out.flowOpacity_);
}

function computeColorKey(out, link) {
    // Stable key used by legend hover
    if (out.topLocationKeys && out.topLocationKeys.has?.(link?.target?.id)) return link.target.id;
    return link?.target?.id ?? link?.source?.id ?? 'Other';
}

function getBackoffAndDash(out, strokePx, dCenter) {
    const backoff = out.flowArrows_ ? arrowBackoffPxForStroke(strokePx, out.flowArrowScale_) : 0;
    const [dashVis, dashGap] = pathDashForBackoff(dCenter, backoff);
    return { backoff, dashVis, dashGap };
}

function buildOutlinePath(out, flowsGroup, dCenter, link, arrowIds) {
    const outlineW = link.width + out.flowOutlineWidth_;
    const { dashVis, dashGap } = getBackoffAndDash(out, outlineW, dCenter);

    const outline = flowsGroup.append('path')
        .attr('d', dCenter)
        .attr('fill', 'none')
        .attr('class', 'em-flow-link-outline')
        .attr('stroke', out.flowOutlineColor_)
        .attr('stroke-width', outlineW)
        .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
        .style('pointer-events', 'none');

    if (out.flowArrows_) applyArrow(outline, arrowIds, 'outline');
    return outline;
}

function buildTaperedMain(out, flowsGroup, dCenter, link, paint, colorKey) {
    // Build the tapered polygon
    const dPoly = taperedPolygonForLink(
        link, () => dCenter,
        {
            startRatio: out.flowWidthGradientSettings_.startRatio,
            samples: out.flowWidthGradientSettings_.samples,
            minStartWidth: out.flowWidthGradientSettings_.minStartWidth,
            capEnd: out.flowArrows_,  // cap so the arrow marker (if any) has a clean tip
        },
        0
    );

    // Optional halo polygon around the tapered main
    if (out.flowOutlines_) {
        const dPolyOutline = taperedPolygonForLink(
            link, () => dCenter,
            {
                startRatio: out.flowWidthGradientSettings_.startRatio,
                samples: out.flowWidthGradientSettings_.samples,
                minStartWidth: out.flowWidthGradientSettings_.minStartWidth,
                capEnd: out.flowArrows_,
            },
            out.flowOutlineWidth_
        );
        flowsGroup.append('path')
            .attr('d', dPolyOutline)
            .attr('fill', out.flowOutlineColor_)
            .attr('class', 'em-flow-link-outline');
    }

    // The main tapered symbol uses FILL (so it stays curved on hover)
    const mainSel = flowsGroup.append('path')
        .attr('d', dPoly)
        .attr('fill', paint)
        .attr('class', 'em-flow-link em-flow-link-tapered')
        .attr('data-color-key', colorKey)
        .attr('data-color', paint.startsWith('url(') ? null : paint);

    // Note: we skip arrow carriers for tapered; markers can be applied to centerline if needed
    return mainSel;
}

function buildSimpleMain(out, flowsGroup, dCenter, link, paint, colorKey, arrowIds) {
    const { dashVis, dashGap } = getBackoffAndDash(out, link.width, dCenter);

    const mainSel = flowsGroup.append('path')
        .attr('d', dCenter)
        .attr('fill', 'none')
        .attr('class', 'em-flow-link')
        .attr('stroke', paint)
        .attr('stroke-width', link.width)
        .attr('stroke-linecap', 'butt')
        .attr('stroke-dasharray', out.flowArrows_ ? `${dashVis} ${dashGap}` : null)
        .attr('data-color-key', colorKey)
        .attr('data-color', paint.startsWith('url(') ? null : paint);

    if (out.flowArrows_) applyArrow(mainSel, arrowIds, 'normal');
    return mainSel;
}

function addMouseEvents(out, mainSel, ctx) {
    const { usesGradient, paint, link, arrowIds } = ctx;

    mainSel
        .on('mouseover', function () {
            if (out.flowWidthGradient_) {
                // Tapered uses fill
                select(this).attr('fill', out.hoverColor_);
            } else {
                // Simple uses stroke
                select(this).attr('stroke', out.hoverColor_);
                if (out.flowArrows_) setHoverArrow(select(this), arrowIds, true);
            }
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(link, out));
        })
        .on('mousemove', e => {
            if (out._tooltip) out._tooltip.mousemove(e);
        })
        .on('mouseout', function () {
            if (out.flowWidthGradient_) {
                select(this).attr('fill', paint);   // restore polygon fill
            } else {
                select(this).attr('stroke', paint); // restore stroke
                if (out.flowArrows_) setHoverArrow(select(this), arrowIds, false);
            }
            if (out._tooltip) out._tooltip.mouseout();
        });
}

// Sample an SVG path string into points using DOM path length
function samplePathByLength(d, samples = 48) {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('d', d);
    const L = tmp.getTotalLength();
    const pts = [];
    for (let i = 0; i <= samples; i++) {
        const p = tmp.getPointAtLength((L * i) / samples);
        pts.push([p.x, p.y]);
    }
    return pts;
}

// Build a tapered polygon by offsetting along normals of the centerline.
// `extraPad` makes the polygon uniformly thicker (used for outlines).
function taperedPolygonForLink(
    link,
    pathFn,
    {
        startRatio = 0.25,
        samples = 48,
        minStartWidth = 1.5,
        capEnd = !out.flowArrows_
    } = {},
    extraPad = 0 // for outlines
) {
    const center = samplePathByLength(pathFn(link), samples);

    // tangents → unit normals
    const normals = [];
    for (let i = 0; i < center.length; i++) {
        const a = center[Math.max(0, i - 1)];
        const b = center[Math.min(center.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        normals.push([-dy / len, dx / len]);
    }

    const wStart = Math.max(minStartWidth, link.width * startRatio);
    const wEnd = link.width;

    const top = [], bot = [];
    const n = center.length - 1;

    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const width = wStart + (wEnd - wStart) * t;
        const half = width / 2 + extraPad;  // <<< apply pad here
        const nx = normals[i][0] * half;
        const ny = normals[i][1] * half;
        top.push([center[i][0] + nx, center[i][1] + ny]);
        bot.push([center[i][0] - nx, center[i][1] - ny]);
    }
    bot.reverse();

    // Optional: flatten tail instead of a point
    if (capEnd) {
        top[n][1] = bot[0][1] = (top[n][1] + bot[0][1]) / 2;
    }

    let d = `M${top[0][0]},${top[0][1]}`;
    for (let i = 1; i < top.length; i++) d += `L${top[i][0]},${top[i][1]}`;
    for (let i = 0; i < bot.length; i++) d += `L${bot[i][0]},${bot[i][1]}`;
    d += 'Z';
    return d;
}


function getFlowStroke(out, d) {
    if (typeof out.flowColor_ === 'function') {
        return out.flowColor_(d)
    }

    return out.flowColor_
}

/**
 * Adds rectangles (lines) for node stems
 * @param {Object} container - D3 selection of SVG
 * @param {Array} nodes - Sankey nodes data
 */
function addNodeStems(out, container, nodes) {
    container
        .append('g')
        .attr('class', 'em-flow-node-stems')
        .selectAll('rect')
        .data(nodes, d => d.id)
        .join('rect')
        .attr('x', d => d.x0 - 0.5)
        .attr('y', d => (out.flowStack_ ? d.y0 : d.y))
        .attr('width', 1)
        .attr('height', d => (out.flowStack_ ? Math.max(0, d.y1 - d.y0) : 0))
        .attr('fill', '#000');
}

function computeNodeDepths({ nodes }) {
    const n = nodes.length
    let current = new Set(nodes)
    let next = new Set()
    let x = 0
    while (current.size) {
        for (const node of current) {
            node.depth = x
            for (const { target } of node.sourceLinks) {
                next.add(target)
            }
        }
        if (++x > n) {
            console.warn('Detected circular link(s); continuing layout.');
            break; // Don’t throw, just stop further propagation
        }
        current = next
        next = new Set()
    }
}

function computeNodeHeights({ nodes }) {
    const visited = new Set();
    const stack = [];

    // Helper: recursive traversal with circular protection
    function visit(node, depth = 0) {
        if (visited.has(node)) return node.height ?? 0; // already computed
        visited.add(node);
        stack.push(node);

        // Determine height from the deepest incoming chain
        let maxHeight = 0;
        for (const { source } of node.targetLinks) {
            if (stack.includes(source)) {
                // Circular reference detected — stop recursion, don't loop forever
                console.warn(`Circular link detected between ${source.id} and ${node.id}`);
                continue;
            }
            const h = visit(source, depth + 1);
            if (h + 1 > maxHeight) maxHeight = h + 1;
        }

        node.height = maxHeight;
        stack.pop();
        return maxHeight;
    }

    // Run the traversal for all nodes
    for (const node of nodes) visit(node);

    // Normalize heights so the smallest is 0
    const minH = Math.min(...nodes.map(n => n.height ?? 0));
    for (const node of nodes) node.height = (node.height ?? 0) - minH;
}


function computeNodeBreadths(out, { nodes }) {
    for (const node of nodes) {
        // Compute link widths
        node.sourceLinks.forEach((link) => (link.width = out.strokeWidthScale(link.value)))
        node.targetLinks.forEach((link) => (link.width = out.strokeWidthScale(link.value)))

        // Use total space needed by links
        const totalLinkWidth = Math.max(
            sum(node.sourceLinks, (d) => d.width),
            sum(node.targetLinks, (d) => d.width)
        )

        node.x0 = node.x1 = node.x
        node.y0 = node.y - totalLinkWidth / 2
        node.y1 = node.y + totalLinkWidth / 2
    }

    reorderLinks(nodes)
}

function computeLinkBreadths(out, { nodes }) {
    for (const node of nodes) {
        const mid = node.y;

        // Collapse mode: both ends meet at the node center
        if (!out.flowStack_) {
            for (const l of node.sourceLinks) l.y0 = mid;
            for (const l of node.targetLinks) l.y1 = mid;
            node.y0 = mid;
            node.y1 = mid;
            continue;
        }

        // --- STACK MODE: two independent stacks, one per side of the node ---
        // Classify links by which SIDE (left/right) they attach to at THIS node.
        // For a link where this node is the source, "other end" is target.
        // For a link where this node is the target, "other end" is source.
        const left = [];
        const right = [];

        // Outgoing links (this node is the source)
        for (const l of node.sourceLinks) {
            const other = l.target;
            const item = { link: l, width: l.width, otherY: other.y, at: "out" };
            (other.x < node.x ? left : right).push(item);
        }

        // Incoming links (this node is the target)
        for (const l of node.targetLinks) {
            const other = l.source;
            const item = { link: l, width: l.width, otherY: other.y, at: "in" };
            (other.x < node.x ? left : right).push(item);
        }

        // Totals per side
        const totalLeft = left.reduce((s, d) => s + d.width, 0);
        const totalRight = right.reduce((s, d) => s + d.width, 0);

        // Each side is centered on node.y, but stacked independently.
        // Order by the other end's y so stacks look "pulled" toward destinations/sources.
        left.sort(out.flowOrder_);
        right.sort(out.flowOrder_);

        // Assign y positions on the LEFT side
        let yL = mid - totalLeft / 2;
        for (const d of left) {
            const yMid = yL + d.width / 2;
            if (d.at === "out") d.link.y0 = yMid; else d.link.y1 = yMid;
            yL += d.width;
        }

        // Assign y positions on the RIGHT side
        let yR = mid - totalRight / 2;
        for (const d of right) {
            const yMid = yR + d.width / 2;
            if (d.at === "out") d.link.y0 = yMid; else d.link.y1 = yMid;
            yR += d.width;
        }

        // The node stem should span the larger side only (NOT sum of both).
        const span = Math.max(totalLeft, totalRight);
        node.y0 = mid - span / 2;
        node.y1 = mid + span / 2;
    }
}

function computeNodeValues({ nodes }) {
    for (const node of nodes) {
        node.value = Math.max(
            sum(node.sourceLinks, (d) => d.value),
            sum(node.targetLinks, (d) => d.value)
        )
    }
}

function reorderLinks(nodes) {
    for (const { sourceLinks, targetLinks } of nodes) {
        sourceLinks.sort((a, b) => a.target.y - b.target.y)
        targetLinks.sort((a, b) => a.source.y - b.source.y)
    }
}

// Smooth cubic segment builder with curvature
function cubicSegment(p0, p1, curvature = 0.5) {
    const [x0, y0] = p0, [x1, y1] = p1;
    const xi = (t) => x0 + (x1 - x0) * t;
    const c1x = xi(curvature), c2x = xi(1 - curvature);
    return `C${c1x},${y0} ${c2x},${y1} ${x1},${y1}`;
}

// 
// Returns a function(link) -> path string, avoiding node stems.
// obstacles: array of nodes with x0, y0, y1(your stacked extents)
// opts:
//   gapX: how far to go left / right of the node before / after the bypass
//   padX: horizontal "no-go" half - width around the stem(usually small)
//   padY: vertical clearance outside[y0, y1]
//   curvature: 0..1; 0.5 ≈ default d3 - sankey feel
//                 
function sankeyLinkAvoidingNodes(obstacles, {
    gapX = 10,
    padX = 2,
    padY = 2,
    bumpY = 0,
    curvature = 0.5
} = {}) {
    return function (link) {
        const sx = link.source.x1, sy = link.y0;
        const tx = link.target.x0, ty = link.y1;

        const rev = sx > tx;
        const xA = rev ? tx : sx;
        const yA = rev ? ty : sy;
        const xB = rev ? sx : tx;
        const yB = rev ? sy : ty;

        const pts = [[xA, yA]];
        const yAt = (x) => yA + (yB - yA) * ((x - xA) / (xB - xA));

        for (const n of obstacles) {
            if (n === link.source || n === link.target) continue;

            const ox = n.x0;
            if (ox <= xA || ox >= xB) continue;

            const top = (n.y0 ?? n.y) - padY;
            const bot = (n.y1 ?? n.y) + padY;
            const leftX = ox - padX, rightX = ox + padX;

            const yline = yAt(ox);

            if (yline >= top && yline <= bot) {
                // apply bumpY to lift above/below the band without increasing padY
                const goAbove = (yline - top) <= (bot - yline);
                const bypassY = goAbove ? (top - bumpY) : (bot + bumpY);

                pts.push([Math.max(xA, leftX - gapX), bypassY]);
                pts.push([Math.min(xB, rightX + gapX), bypassY]);
            }
        }

        pts.push([xB, yB]);
        if (rev) pts.reverse();

        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) d += cubicSegment(pts[i - 1], pts[i], curvature);
        return d;
    };
}

function pathLength(d) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    return p.getTotalLength();
}

function pathDashForBackoff(d, backoffPx) {
    const L = Math.max(0, pathLength(d));
    const vis = Math.max(0, L - Math.min(backoffPx, L));
    const gap = Math.min(backoffPx, L);
    return [vis, gap];
}

// matches arrows.js defaults: markerWidth = 3 * scale (in strokeWidth units),
// and the usable length ~ 0.9 of the marker viewBox
function arrowBackoffPxForStroke(strokePx, arrowScale = 1) {
    const arrowLenPx = strokePx * (3 * arrowScale) * 0.9;
    return arrowLenPx * 0.85;
}