import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'

onmessage = (event) => {
    const { nodes: inputNodes, radii, strengthX, strengthY, iterations, d3URL } = event.data

    // d3-force is bundled directly by default (fast, no network dependency) - importScripts a
    // full runtime d3 build only if the caller explicitly opted into a custom build via
    // dorlingSettings({ workerD3URL }). Previously this always fetched the full d3 v7 bundle from
    // an external CDN on every single Dorling toggle, even though only these 4 named exports are
    // used - the network round-trip (worker spin-up + fetch + cache revalidation each time) was
    // the actual cause of the "cartogram mode is slow now" regression, not the simulation itself.
    let d3Force = { forceSimulation, forceX, forceY, forceCollide }
    if (d3URL) {
        importScripts(d3URL)
        d3Force = self.d3
    }

    const nodes = inputNodes.map((n, i) => {
        n.x = n.properties.centroid[0]
        n.y = n.properties.centroid[1]
        n.r = radii[i]
        return n
    })

    const sim = d3Force
        .forceSimulation(nodes)
        .force('x', d3Force.forceX((d) => d.properties.centroid[0]).strength(strengthX))
        .force('y', d3Force.forceY((d) => d.properties.centroid[1]).strength(strengthY))
        .force('collide', d3Force.forceCollide((d) => d.r).iterations(iterations))
        .stop()

    const nTicks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))

    for (let i = 0; i < nTicks; i++) {
        sim.tick()
        if (i % 10 === 0) {
            postMessage({ type: 'progress', progress: i, total: nTicks })
        }
    }

    postMessage({ type: 'end', nodes })
    self.close()
}
