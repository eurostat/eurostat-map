// flow-bidirectional.js
// Shared helpers for bidirectional flow aggregation.

/**
 * Build a Map of unordered A–B routes with directional volumes.
 *
 * Each entry has:
 *   {
 *     idA, idB,        // canonical ordering (A < B)
 *     nodeA, nodeB,    // node objects (must contain id, x, y, ...)
 *     flowAB, flowBA   // totals A→B and B→A
 *   }
 *
 * @param {Array} nodes - array of node objects with .id
 * @param {Array} links - array of links with .source, .target, .value
 * @returns {Map<string, {idA,idB,nodeA,nodeB,flowAB,flowBA}>}
 */
export function buildBidirectionalRouteMap(nodes, links) {
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const routeMap = new Map();

    for (const link of links || []) {
        if (!link) continue;

        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;

        if (!nodeById.has(sId) || !nodeById.has(tId)) continue;

        // Canonical unordered key
        const key = sId < tId ? `${sId}|${tId}` : `${tId}|${sId}`;

        let route = routeMap.get(key);
        if (!route) {
            const idA = sId < tId ? sId : tId;
            const idB = sId < tId ? tId : sId;
            const nodeA = nodeById.get(idA);
            const nodeB = nodeById.get(idB);

            route = {
                idA,
                idB,
                nodeA,
                nodeB,
                flowAB: 0,
                flowBA: 0
            };
            routeMap.set(key, route);
        }

        const v = +link.value || 0;
        if (sId === route.idA) route.flowAB += v;
        else route.flowBA += v;
    }

    return routeMap;
}

/**
 * Expand a bidirectional routeMap into directional links
 * with node references as .source/.target, for Sankey layout.
 *
 * @param {Map} routeMap - from buildBidirectionalRouteMap
 * @returns {Array} links [{source, target, value}]
 */
export function expandRoutesToDirectionalLinks(routeMap) {
    const links = [];

    for (const route of routeMap.values()) {
        const { nodeA, nodeB, flowAB, flowBA } = route;

        if (flowAB > 0) {
            links.push({
                source: nodeA,
                target: nodeB,
                value: flowAB
            });
        }
        if (flowBA > 0) {
            links.push({
                source: nodeB,
                target: nodeA,
                value: flowBA
            });
        }
    }

    return links;
}
