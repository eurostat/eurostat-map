import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import { executeForAllInsets } from '../utils'
import { getCentroidsGroup } from '../geo/centroids'

const getLayerAndMap = function (layerOrMap) {
    if (layerOrMap?.map) {
        return { layer: layerOrMap, map: layerOrMap.map }
    }
    return { layer: layerOrMap, map: layerOrMap }
}

export function runDorlingSimulation(layerOrMap, radiusAccessor, padding = 0) {
    // Common function to start a simulation on a single map (main or inset)
    const runSim = (singleLayerOrMap) => {
        const { layer, map } = getLayerAndMap(singleLayerOrMap)
        const activeLayer = typeof map?.activeLayer === 'function' ? map.activeLayer() : null
        const targetLayer = layer?.centroidsFeatures_ ? layer : activeLayer || layer
        const nodes = targetLayer?.centroidsFeatures_ || map?.Geometries?.centroidsFeatures || []
        if (!nodes.length) return

        stopDorlingSimulation(targetLayer)

        const settings = targetLayer?.dorlingSettings_ || map?.dorlingSettings_ || {}
        const effectivePadding = settings.padding ?? padding
        const strengthX = settings.strength?.x ?? 1
        const strengthY = settings.strength?.y ?? 1
        const iterations = settings.iterations ?? 1
        const useWorker = settings.worker !== false
        const d3URL = settings.workerD3URL || 'https://unpkg.com/d3@7/dist/d3.min.js'

        // Compute initial projected coordinates
        for (const n of nodes) {
            const projected = map?._projection?.(n.geometry.coordinates)
            if (projected) {
                n.x = projected[0]
                n.y = projected[1]
            } else {
                n.x = NaN
                n.y = NaN
            }
        }

        const containers = getCentroidsGroup(targetLayer)?.selectAll('g.em-centroid')
        if (!containers || containers.empty()) return

        const tickTransform = (sel) => {
            sel.attr('transform', (d) => {
                if (!d || isNaN(d.x) || isNaN(d.y)) return null
                return `translate(${d.x},${d.y})`
            })
        }

        // === Non-animated branch ===
        if (settings.animate === false) {
            if (!useWorker) {
                // Run synchronously on main thread
                const sim = forceSimulation(nodes)
                    .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
                    .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
                    .force('collide', forceCollide((d) => Math.max(0, radiusAccessor(d) + effectivePadding)).iterations(iterations))
                    .stop()

                const nTicks = Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay()))
                for (let i = 0; i < nTicks; i++) {
                    sim.tick()
                    if (i % 10 === 0) tickTransform(containers)
                }
                tickTransform(containers)
                updateDorlingProgress(1, targetLayer)
                return sim
            } else {
                // === Web Worker branch ===
                console.log('Running Dorling simulation asynchronously in a Web Worker')
                const worker = new Worker(new URL('./dorling-worker.js', import.meta.url), { type: 'module' })
                worker.postMessage({
                    nodes: nodes.map((n) => ({ ...n })), // shallow clone
                    radii: nodes.map((n) => Math.max(0, radiusAccessor(n) + effectivePadding)),
                    strengthX,
                    strengthY,
                    iterations,
                    d3URL,
                })

                worker.onmessage = (e) => {
                    const { type, nodes: finalNodes, progress, total } = e.data
                    if (type === 'progress') {
                        updateDorlingProgress(progress / total, targetLayer)
                        return
                    }
                    if (type === 'end' && finalNodes) {
                        nodes.forEach((node, i) => {
                            node.x = finalNodes[i].x
                            node.y = finalNodes[i].y
                        })
                        tickTransform(containers)
                        updateDorlingProgress(1, targetLayer)
                        worker.terminate()
                    }
                }
                return
            }
        }

        // === Animated branch ===
        targetLayer.simulation = forceSimulation(nodes)
            .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
            .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
            .force('collide', forceCollide((d) => Math.max(0, radiusAccessor(d) + effectivePadding)).iterations(iterations))
            .on('tick', () => tickTransform(containers))

        return targetLayer.simulation
    }

    const { map } = getLayerAndMap(layerOrMap)

    // Run on main map
    runSim(layerOrMap)

    // Run on all insets
    if (map?.insetTemplates_) {
        executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => {
            runSim(inset)
        })
    }
}

function updateDorlingProgress(progress, map) {
    if (map.dorlingSettings_?.onProgress) {
        map.dorlingSettings_.onProgress(progress, map)
    }
}

export function stopDorlingSimulation(map) {
    if (!map) return

    if (map.layers_ && Array.isArray(map.layers_)) {
        map.layers_.forEach((layer) => {
            // In legacy/single-layer maps, layers_ can include the map object itself.
            if (layer && layer !== map) stopDorlingSimulation(layer)
        })
    }

    if (map.simulation) {
        map.simulation.stop()
        map.simulation.on('tick', null)
        map.simulation = null
    }

    // If this is a pure map container, we've already stopped child layers above.
    if (map.layers_ && Array.isArray(map.layers_)) {
        return
    }
}

// Optional API setters
export function dorlingWorker(flag) {
    this.dorlingSettings(Object.assign({}, this.dorlingSettings(), { worker: flag }))
    return this
}

export function dorlingWorkerD3URL(url) {
    this.dorlingSettings(Object.assign({}, this.dorlingSettings(), { workerD3URL: url }))
    return this
}
