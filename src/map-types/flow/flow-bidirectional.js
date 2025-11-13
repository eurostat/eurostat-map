// flow-bidirectional.js
// Shared helpers for bidirectional flow aggregation.

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

        // Unordered key: A|B
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
            });
        }

        const route = routeMap.get(key);
        // flowAB = A→B, flowBA = B→A in the (idA,idB) ordering
        if (sourceId === route.idA && targetId === route.idB) {
            route.flowAB += link.value;
        } else {
            route.flowBA += link.value;
        }
    }

    return routeMap;
}

/**
 * Simple directional expansion used by straight.js:
 *  - A↔B route becomes up to two full-length links: A→B and B→A.
 */
export function expandRoutesToDirectionalLinks(nodes, links) {
    const routeMap = buildBidirectionalRouteMap(nodes, links);
    const outLinks = [];

    for (const route of routeMap.values()) {
        const { idA, idB, flowAB, flowBA } = route;
        if (flowAB > 0) outLinks.push({ source: idA, target: idB, value: flowAB, route });
        if (flowBA > 0) outLinks.push({ source: idB, target: idA, value: flowBA, route });
    }

    return { nodes, links: outLinks };
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

  const newNodes = nodes.map((n) => ({ ...n })); // clone
  const newLinks = [];
  let midIndex = 0;

  for (const route of routeMap.values()) {
    const { idA, idB, coordsA, coordsB, flowAB, flowBA } = route;
    const nodeA = nodeById.get(idA);
    const nodeB = nodeById.get(idB);
    if (!nodeA || !nodeB) continue;

    if (flowAB > 0 && flowBA > 0) {
      // Bi-directional: split at midpoint
      const midId = `__mid__${idA}__${idB}__${midIndex++}`;
      const midNode = {
        id: midId,
        x: (coordsA[0] + coordsB[0]) / 2,
        y: (coordsA[1] + coordsB[1]) / 2,
        isMidpoint: true,
      };
      newNodes.push(midNode);

      // A→B half
      newLinks.push({
        source: midId,
        target: idB,
        value: flowAB,
        route,
        originId: idA,
        destId: idB,
        dir: 'AtoB',
      });

      // B→A half
      newLinks.push({
        source: midId,
        target: idA,
        value: flowBA,
        route,
        originId: idB,
        destId: idA,
        dir: 'BtoA',
      });
    } else if (flowAB > 0) {
      // Only A→B
      newLinks.push({
        source: idA,
        target: idB,
        value: flowAB,
        route,
        originId: idA,
        destId: idB,
        dir: 'AtoB',
      });
    } else if (flowBA > 0) {
      // Only B→A
      newLinks.push({
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

