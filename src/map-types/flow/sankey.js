import { generateUniqueId, getRegionsSelector } from '../../core/utils'
import { linkHorizontal } from 'd3-shape'
import { sum } from 'd3-array'
import { select } from 'd3-selection'

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

    const { nodes, links } = sankey(out, graph)

    // Define marker and gradient IDs
    const defs = svg.append('defs')
    const arrowId = generateUniqueId('arrow')
    const arrowOutlineId = generateUniqueId('arrow-outline')
    const gradientIds = links.map(() => generateUniqueId('gradient'))

    // Add arrow markers
    if (out.flowArrows_) {
        addArrowMarker(out, defs, arrowId, out.flowColor_)
        addArrowMarker(out, defs, arrowOutlineId, '#ffffff')
    }

    // Add flow gradients
    if (out.flowGradient_) {
        addFlowGradients(out, defs, gradientIds, links)
    }

    // Add Sankey flows
    addSankeyFlows(out, sankeyContainer, links, arrowId, arrowOutlineId, gradientIds)

    // Add additional nodes (fill gaps)
    addFillGaps(out, sankeyContainer, nodes)

    return svg.node()
}

/**
 * Adds an arrow marker to the defs section
 * @param {Object} defs - D3 selection of defs
 * @param {string} id - Marker ID
 * @param {string} color - Fill color of the marker
 */
function addArrowMarker(out, defs, id, color) {
    defs.append('marker')
        .attr('id', id)
        .attr('markerHeight', 7)
        .attr('markerWidth', 7)
        .attr('refX', 0.5)
        .attr('refY', 1.5)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', color)
        .attr('d', 'M0,0 q0,1,0.5,1.5 q-0.5,0.5,-0.5,1.5 q0.75,-0.75,2,-1.5 q-1.25,-0.75,-2,-1.5Z')

    // add a copy for mouseover with hovered color
    defs.append('marker')
        .attr('id', id + 'mouseover')
        .attr('markerHeight', 7)
        .attr('markerWidth', 7)
        .attr('refX', 0.5)
        .attr('refY', 1.5)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', out.hoverColor_)
        .attr('d', 'M0,0 q0,1,0.5,1.5 q-0.5,0.5,-0.5,1.5 q0.75,-0.75,2,-1.5 q-1.25,-0.75,-2,-1.5Z')
}

/**
 * Adds linear gradient definitions for flow links
 * @param {Object} defs - D3 selection of defs
 * @param {Array} gradientIds - Array of gradient IDs
 * @param {Array} links - Sankey links data
 */
function addFlowGradients(out, defs, gradientIds, links) {
    const safeLinks = links.filter((d) => d.source?.x1 != null && d.target?.x0 != null && d.y0 != null && d.y1 != null)
    defs.selectAll('linearGradient')
        .data(safeLinks)
        .join('linearGradient')
        .attr('id', (_, i) => gradientIds[i])
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', (d) => d.source.x1)
        .attr('x2', (d) => d.target.x0)
        .attr('y1', (d) => d.y0)
        .attr('y2', (d) => d.y1)
        .call((g) => g.append('stop').attr('offset', '5%').attr('stop-color', out.flowOverlayColors_[0]))
        .call((g) => g.append('stop').attr('offset', '50%').attr('stop-color', out.flowColor_))
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

/**
 * Adds Sankey flows (links with markers and gradients)
 * @param {Object} container - D3 selection of SVG
 * @param {Array} links - Sankey links data
 * @param {string} arrowId - Arrow marker ID
 * @param {string} arrowOutlineId - Arrow outline marker ID
 * @param {Array} gradientIds - Gradient IDs
 */
function addSankeyFlows(out, container, links, arrowId, arrowOutlineId, gradientIds) {
    const flowsGroup = container.append('g').attr('class', 'em-flow-lines').attr('id', 'em-flow-lines').style('opacity', out.flowOpacity_)

    links.forEach((link, i) => {
        // Outline path
        if (out.flowOutlines_) {
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal(out.flowCurvature_ || 0.5)(link))
                .attr('fill', 'none')
                .attr('stroke', '#ffffff')
                .attr('class', 'em-flow-link-outline')
                .attr('stroke-width', link.width + 1.5)
                .attr('marker-end', `url(#${arrowOutlineId})`)
        }

        // Main path
        flowsGroup
            .append('path')
            .attr('d', sankeyLinkHorizontal(out.flowCurvature_ || 0.5)(link))
            .attr('fill', 'none')
            .attr('class', 'em-flow-link')
            .attr('stroke', out.flowGradient_ ? `url(#${gradientIds[i]})` : getFlowStroke(out, link))
            .attr('stroke-width', link.width)
            .attr('marker-end', out.flowArrows_ ? `url(#${arrowId})` : '')
            // add hover effect
            .on('mouseover', function (e, d) {
                const hoveredColor = out.hoverColor_

                // Change the stroke color
                select(this).attr('stroke', hoveredColor)

                // Update the marker-end dynamically
                if (out.flowArrows_) select(this).attr('marker-end', `url(#${arrowId + 'mouseover'})`)

                // Tooltip handling
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(link, out))
            })
            .on('mousemove', function (e) {
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function (e, d) {
                // Revert the stroke color
                if (out.flowGradient_) {
                    select(this).attr('stroke', `url(#${gradientIds[i]})`)
                } else {
                    select(this).attr('stroke', getFlowStroke(out, link))
                }

                // Revert the marker-end to the original
                if (out.flowArrows_) select(this).attr('marker-end', `url(#${arrowId})`)

                // Tooltip handling
                if (out._tooltip) out._tooltip.mouseout()
            })
    })
}

function getFlowStroke(out, d) {
    if (typeof out.flowColor_ === 'function') {
        return out.flowColor_(d)
    }

    return out.flowColor_
}

/**
 * Adds rectangles to fill gaps left by Sankey links
 * @param {Object} container - D3 selection of SVG
 * @param {Array} nodes - Sankey nodes data
 */
function addFillGaps(out, container, nodes) {
    container
        .append('g')
        .attr('class', 'em-flow-fill-in-gaps')
        .selectAll('rect')
        .data(nodes, d => d.id)
        .join('rect')
        .attr('x', d => d.x0 - 0.5)
        .attr('y', d => (out.flowStack_ ? d.y0 : d.y))
        .attr('width', 1)
        .attr('height', d => (out.flowStack_ ? Math.max(0, d.y1 - d.y0) : 0))
        .attr('fill', out.flowColor_);
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
        left.sort((a, b) => a.otherY - b.otherY);
        right.sort((a, b) => a.otherY - b.otherY);

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


function horizontalSource(d) {
    return [d.source.x1, d.y0]
}

function horizontalTarget(d) {
    return [d.target.x0, d.y1]
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

const sankeyLinkHorizontal = function (curvature = 0.5) {
  return function(link) {
    const x0 = link.source.x1,
          x1 = link.target.x0,
          y0 = link.y0,
          y1 = link.y1;

    // interpolate x between source and target
    const xi = d3.interpolateNumber(x0, x1);

    // compute control points based on curvature factor (0–1)
    const x2 = xi(curvature);
    const x3 = xi(1 - curvature);

    return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
  };
};