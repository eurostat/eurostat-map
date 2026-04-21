/**
 * Function to create a flow map with straight lines.
 * exampleGraph = {
 *   nodes:[{id:'FR',x:681.18,y:230.31},{id:'DE',x:824.54,y:123.70}],
 *   links:[{source:'FR',target:'DE',value:82018369.72}],
 * }
 */
export function createFlowMap(out: any, flowMapContainer: any): void;
export function getFlowStroke(out: any, originId: any, destId: any, route: any, halfValue: any): any;
export function computeColorKey(out: any, originId: any, destId: any): any;
export function onFlowLineMouseOver(out: any, sourceId: any, targetId: any, flow: any, arrowIds: any): (e: any) => void;
export function onFlowLineMouseMove(out: any): (e: any) => void;
export function onFlowLineMouseOut(out: any, baseColor: any, arrowIds: any): () => void;
//# sourceMappingURL=straight.d.ts.map