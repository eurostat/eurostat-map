import * as d3 from "d3";

/**
 * Bundles edges slightly to make the flow map more visually cohesive.
 * Uses scales.airports and scales.segments to tune distances and forces.
 */
export function applyEdgeBundling(out, bundle, nodeMap, scales) {
  if (!bundle?.nodes?.length || !bundle?.links?.length || !scales) return;

  const nodes = bundle.nodes.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
  }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const links = bundle.links
    .map((l) => {
      const sid = typeof l.source === "object" ? l.source.id : l.source;
      const tid = typeof l.target === "object" ? l.target.id : l.target;
      const s = nodeById.get(sid);
      const t = nodeById.get(tid);
      if (!s || !t) return null;

      const dx = s.x - t.x;
      const dy = s.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Segment scaling controls link stiffness & distance
      const segFactor = Math.max(1, Math.min(10, scales.segments(dist)));
      const distance = dist / segFactor;

      return { source: s, target: t, distance };
    })
    .filter(Boolean);

  const simulation = d3
    .forceSimulation(nodes)
    .alphaDecay(0.12)
    .force(
      "charge",
      d3
        .forceManyBody()
        .strength(5)
        .distanceMax(scales.airports.range()[1] * 4)
    )
    .force(
      "link",
      d3
        .forceLink(links)
        .distance((d) => d.distance)
        .strength(0.1)
    )
    // keep general spatial locality
    .force("x", d3.forceX((d) => d.x).strength(0.1))
    .force("y", d3.forceY((d) => d.y).strength(0.1))
    .stop();

  for (let i = 0; i < 60; ++i) simulation.tick();

  // Update main node positions gently (blend)
  for (const n of nodes) {
    const orig = nodeMap.get(n.id);
    if (orig) {
      orig.x = orig.x * 0.8 + n.x * 0.2;
      orig.y = orig.y * 0.8 + n.y * 0.2;
    }
  }

  if (out?.debugBundling) {
    console.log(
      `[EdgeBundling] completed with ${nodes.length} nodes / ${links.length} links`
    );
  }
}
