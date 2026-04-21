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
export function buildBidirectionalRouteMap(nodes: any, links: any): Map<any, any>;
/**
 * For sankey.js:
 *  - One-way route: keep a normal link A→B or B→A.
 *  - Two-way route: create a hidden midpoint node M and two half-links:
 *        M → B  (value = A→B)
 *        M → A  (value = B→A)
 *    so visually you get two half-ribbons meeting in the middle.
 */
export function expandRoutesToSankeyMidpointGraph(nodes: any, links: any): {
    nodes: any;
    links: any[];
};
//# sourceMappingURL=flow-bidirectional.d.ts.map