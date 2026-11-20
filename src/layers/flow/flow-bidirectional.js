// flow-bidirectional.js
// Shared helpers for bidirectional flow aggregation.

// Draw each direction to the same side of its own heading, so the reverse direction
// occupies the opposite side of the shared corridor.
export function parallelFlowPath({ x1, y1, x2, y2, width }, arrowLength) {
    const length = Math.hypot(x2 - x1, y2 - y1)
    if (!(length > 0 && width > 0)) return null

    const dx = (x2 - x1) / length
    const dy = (y2 - y1) / length
    const gap = 0.75
    const point = (along, across) => `${x1 + dx * along - dy * across},${y1 + dy * along + dx * across}`
    const outer = gap + width
    if (!(arrowLength > 0)) {
        return `M${point(0, gap)}L${point(length, gap)}L${point(length, outer)}L${point(0, outer)}Z`
    }

    const shoulder = length - Math.min(arrowLength, length * 0.45)
    return `M${point(0, gap)}L${point(length, gap)}L${point(shoulder, gap + width * 1.65)}L${point(shoulder, outer)}L${point(0, outer)}Z`
}

/**
 * Build a bidirectional route map:
 *   key = unordered "A|B"
 *   route = {
 *      idA, idB,
 *      nodeA, nodeB,
 *      coordsA: [xA, yA],
 *      coordsB: [xB, yB],
 *      flowAB, flowBA
 *   }
 */
export function buildBidirectionalRouteMap(nodes, links) {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const routeMap = new Map();

    for (const link of links) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        const sourceNode = nodeById.get(sourceId);
        const targetNode = nodeById.get(targetId);
        if (!sourceNode || !targetNode) continue;

        const key = sourceId < targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`;

        if (!routeMap.has(key)) {
            const nodeA = sourceId < targetId ? sourceNode : targetNode;
            const nodeB = sourceId < targetId ? targetNode : sourceNode;

            routeMap.set(key, {
                key,
                idA: nodeA.id,
                idB: nodeB.id,
                nodeA,
                nodeB,
                coordsA: [nodeA.x, nodeA.y],
                coordsB: [nodeB.x, nodeB.y],
                flowAB: 0,
                flowBA: 0,
                // NEW: keep a representative link for each direction
                sampleAB: null,
                sampleBA: null,
            });
        }

        const route = routeMap.get(key);
        const v = +link.value || 0;

        if (sourceId === route.idA && targetId === route.idB) {
            route.flowAB += v;
            if (!route.sampleAB) route.sampleAB = link;
        } else {
            route.flowBA += v;
            if (!route.sampleBA) route.sampleBA = link;
        }
    }

    return routeMap;
}

/**
 * For sankey.js:
 *  - One-way route: keep a normal link A→B or B→A.
 *  - Two-way route: create a hidden midpoint node M and two half-links:
 *        M → B  (value = A→B)
 *        M → A  (value = B→A)
 *    so visually you get two half-ribbons meeting in the middle.
 */
export function expandRoutesToSankeyMidpointGraph(nodes, links) {
    const routeMap = buildBidirectionalRouteMap(nodes, links);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const newNodes = nodes.map((n) => ({ ...n }));
    const newLinks = [];
    let midIndex = 0;

    for (const route of routeMap.values()) {
        const { idA, idB, coordsA, coordsB, flowAB, flowBA, sampleAB, sampleBA } = route;
        const nodeA = nodeById.get(idA);
        const nodeB = nodeById.get(idB);
        if (!nodeA || !nodeB) continue;

        // helper: shallow-copy extras from a sample link
        const extraAB = sampleAB ? { ...sampleAB } : {};
        const extraBA = sampleBA ? { ...sampleBA } : {};
        // remove structural bits we’re going to overwrite
        delete extraAB.source; delete extraAB.target; delete extraAB.value;
        delete extraBA.source; delete extraBA.target; delete extraBA.value;

        if (flowAB > 0 && flowBA > 0) {
            const midId = `__mid__${idA}__${idB}__${midIndex++}`;
            const midNode = {
                id: midId,
                x: (coordsA[0] + coordsB[0]) / 2,
                y: (coordsA[1] + coordsB[1]) / 2,
                isMidpoint: true,
            };
            newNodes.push(midNode);

            // A→B half (midpoint -> B)
            newLinks.push({
                ...extraAB,
                source: midId,
                target: idB,
                value: flowAB,
                route,
                originId: idA,
                destId: idB,
                dir: 'AtoB',
            });

            // B→A half (midpoint -> A)
            newLinks.push({
                ...extraBA,
                source: midId,
                target: idA,
                value: flowBA,
                route,
                originId: idB,
                destId: idA,
                dir: 'BtoA',
            });
        } else if (flowAB > 0) {
            newLinks.push({
                ...extraAB,
                source: idA,
                target: idB,
                value: flowAB,
                route,
                originId: idA,
                destId: idB,
                dir: 'AtoB',
            });
        } else if (flowBA > 0) {
            newLinks.push({
                ...extraBA,
                source: idB,
                target: idA,
                value: flowBA,
                route,
                originId: idB,
                destId: idA,
                dir: 'BtoA',
            });
        }
    }

    return { nodes: newNodes, links: newLinks };
}

