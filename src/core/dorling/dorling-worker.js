onmessage = (event) => {
    const { nodes: inputNodes, radii, strengthX, strengthY, iterations, d3URL } = event.data

    // Load D3 dynamically into the worker
    importScripts(d3URL || 'https://unpkg.com/d3@7/dist/d3.min.js')

    const nodes = inputNodes.map((n, i) => {
        n.x = n.properties.centroid[0]
        n.y = n.properties.centroid[1]
        n.r = radii[i]
        return n
    })

    const sim = d3
        .forceSimulation(nodes)
        .force('x', d3.forceX((d) => d.properties.centroid[0]).strength(strengthX))
        .force('y', d3.forceY((d) => d.properties.centroid[1]).strength(strengthY))
        .force('collide', d3.forceCollide((d) => d.r).iterations(iterations))
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
