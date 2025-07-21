import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'

export function runDorlingSimulation(map, radiusAccessor) {
    const nodes = map.Geometries.centroidsFeatures || []
    if (!nodes.length) return

    stopDorlingSimulation(map)

    const containers = map.svg().selectAll('g.em-centroid')

    const strengthX = map.dorlingStrength_?.x ?? 1
    const strengthY = map.dorlingStrength_?.y ?? 1
    const iterations = map.dorlingIterations_ ?? 1

    const useWorker = map.dorlingWorker_ !== false
    const d3URL = map.dorlingWorkerD3URL_ || 'https://unpkg.com/d3@7/dist/d3.min.js'

    if (map.animateDorling_ === false) {
        if (!useWorker) {
            // Run synchronously on main thread
            const sim = forceSimulation(nodes)
                .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
                .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
                .force('collide', forceCollide((d) => radiusAccessor(d)).iterations(iterations))
                .stop()

            const nTicks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))

            for (let i = 0; i < nTicks; i++) {
                sim.tick()
                if (i % 10 === 0) updateDorlingProgress(i / nTicks, map)
            }

            containers.attr('transform', (d) => `translate(${d.x},${d.y})`)
            updateDorlingProgress(1, map)
            return sim
        } else {
            // Use a web worker (with D3 loaded via importScripts)
            const worker = new Worker(new URL('./dorling-worker.js', import.meta.url), { type: 'module' })
            worker.postMessage({
                nodes: nodes.map((n) => ({ ...n })),
                radii: nodes.map((n) => radiusAccessor(n)),
                strengthX,
                strengthY,
                iterations,
                d3URL,
            })

            worker.onmessage = (e) => {
                const { type, nodes: finalNodes, progress, total } = e.data
                if (type === 'progress') {
                    updateDorlingProgress(progress / total, map)
                    return
                }
                if (type === 'end' && finalNodes) {
                    nodes.forEach((node, i) => {
                        node.x = finalNodes[i].x
                        node.y = finalNodes[i].y
                    })
                    containers.attr('transform', (d) => `translate(${d.x},${d.y})`)
                    updateDorlingProgress(1, map)
                    worker.terminate()
                }
            }
            return
        }
    }

    // Animated branch (unchanged)
    map.simulation = forceSimulation(nodes)
        .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
        .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
        .force('collide', forceCollide((d) => radiusAccessor(d)).iterations(iterations))
        .on('tick', () => {
            containers.attr('transform', (d) => `translate(${d.x},${d.y})`)
        })

    return map.simulation
}

function updateDorlingProgress(progress, map) {
    if (map.onDorlingProgress_) {
        map.onDorlingProgress_(progress, map)
    }
}

export function stopDorlingSimulation(map) {
    if (!map.simulation) return
    map.simulation.stop()
    map.simulation.on('tick', null)
    map.simulation = null
}

// Add setters for API
export function dorlingWorker(flag) {
    this.dorlingWorker_ = flag
    return this
}

export function dorlingWorkerD3URL(url) {
    this.dorlingWorkerD3URL_ = url
    return this
}
