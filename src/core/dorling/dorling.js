import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import { executeForAllInsets } from '../utils'

export function runDorlingSimulation(map, radiusAccessor) {
    // Common function to start a simulation on a single map (main or inset)
    const runSim = (singleMap) => {
        const nodes = singleMap.Geometries.centroidsFeatures || []
        if (!nodes.length) return

        stopDorlingSimulation(singleMap)

        const strengthX = singleMap.dorlingStrength_?.x ?? 1
        const strengthY = singleMap.dorlingStrength_?.y ?? 1
        const iterations = singleMap.dorlingIterations_ ?? 1
        const useWorker = singleMap.dorlingWorker_ !== false
        const d3URL = singleMap.dorlingWorkerD3URL_ || 'https://unpkg.com/d3@7/dist/d3.min.js'

        // Compute initial projected coordinates
        for (const n of nodes) {
            const projected = singleMap._projection?.(n.geometry.coordinates)
            if (projected) {
                n.x = projected[0]
                n.y = projected[1]
            } else {
                n.x = NaN
                n.y = NaN
            }
        }

        const containers = map.getCentroidsGroup(singleMap).selectAll('g.em-centroid')

        const tickTransform = (sel) => {
            sel.attr('transform', (d) => {
                if (!d || isNaN(d.x) || isNaN(d.y)) return null
                return `translate(${d.x},${d.y})`
            })
        }

        // === Non-animated branch ===
        if (singleMap.animateDorling_ === false) {
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
                    if (i % 10 === 0) tickTransform(containers)
                }
                tickTransform(containers)
                updateDorlingProgress(1, singleMap)
                return sim
            } else {
                // === Web Worker branch ===
                console.log('Running Dorling simulation asynchronously in a Web Worker')
                const worker = new Worker(new URL('./dorling-worker.js', import.meta.url), { type: 'module' })
                worker.postMessage({
                    nodes: nodes.map((n) => ({ ...n })), // shallow clone
                    radii: nodes.map((n) => radiusAccessor(n)),
                    strengthX,
                    strengthY,
                    iterations,
                    d3URL,
                })

                worker.onmessage = (e) => {
                    const { type, nodes: finalNodes, progress, total } = e.data
                    if (type === 'progress') {
                        updateDorlingProgress(progress / total, singleMap)
                        return
                    }
                    if (type === 'end' && finalNodes) {
                        nodes.forEach((node, i) => {
                            node.x = finalNodes[i].x
                            node.y = finalNodes[i].y
                        })
                        tickTransform(containers)
                        updateDorlingProgress(1, singleMap)
                        worker.terminate()
                    }
                }
                return
            }
        }

        // === Animated branch ===
        singleMap.simulation = forceSimulation(nodes)
            .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
            .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
            .force('collide', forceCollide((d) => radiusAccessor(d)).iterations(iterations))
            .on('tick', () => tickTransform(containers))

        return singleMap.simulation
    }

    // Run on main map
    runSim(map)

    // Run on all insets
    if (map.insetTemplates_) {
        executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => {
            runSim(inset)
        })
    }
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

// Optional API setters
export function dorlingWorker(flag) {
    this.dorlingWorker_ = flag
    return this
}

export function dorlingWorkerD3URL(url) {
    this.dorlingWorkerD3URL_ = url
    return this
}
