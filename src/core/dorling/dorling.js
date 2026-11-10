import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import { executeForAllInsets } from '../utils'
import { getCentroidsGroup } from '../geo/centroids'
// the code of dorling-worker.js, built separately and embedded as a string (see webpack/dorling-worker.js)
import dorlingWorkerSource from 'eurostat-map-dorling-worker-source'

let dorlingWorkerURL = null

/** A worker running dorling-worker.js from a Blob URL, or null when workers can't run here. */
function createDorlingWorker() {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null
    try {
        if (!dorlingWorkerURL) dorlingWorkerURL = URL.createObjectURL(new Blob([dorlingWorkerSource], { type: 'text/javascript' }))
        return new Worker(dorlingWorkerURL)
    } catch (e) {
        return null
    }
}

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
        // Undefined by default: the worker bundles d3-force itself (see dorling-worker.js), so no
        // network fetch is needed. Only set dorlingSettings({ workerD3URL }) to override this with
        // a full d3 build fetched at runtime (e.g. to pin a different d3 version).
        const d3URL = settings.workerD3URL

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
            // Run synchronously on main thread
            const runOnMainThread = () => {
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
            }

            // === Web Worker branch === (falls back to the main thread when no worker can run)
            const worker = useWorker ? createDorlingWorker() : null
            if (!worker) return runOnMainThread()
            targetLayer.dorlingWorker_ = worker
            const finish = () => {
                worker.terminate()
                if (targetLayer.dorlingWorker_ === worker) targetLayer.dorlingWorker_ = null
            }
            worker.onerror = (e) => {
                // e.g. a Content-Security-Policy without worker-src blob:
                if (e && e.preventDefault) e.preventDefault()
                if (targetLayer.dorlingWorker_ !== worker) return
                finish()
                runOnMainThread()
            }
            worker.onmessage = (e) => {
                if (targetLayer.dorlingWorker_ !== worker) return // superseded by a newer simulation
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
                    finish()
                }
            }
            // only what the simulation reads; same starting positions as on the main thread
            worker.postMessage({
                nodes: nodes.map((n) => ({ x: n.x, y: n.y, properties: { centroid: n.properties.centroid } })),
                radii: nodes.map((n) => Math.max(0, radiusAccessor(n) + effectivePadding)),
                strengthX,
                strengthY,
                iterations,
                d3URL,
            })
            return
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

    // layers_ is only ever assigned as an OWN property on the facade map (see stat-map.js).
    // A layer object's inherited mapServices prototype forwards map[key] lookups for any key
    // it doesn't own itself - so `layer.layers_` would otherwise silently resolve to the
    // facade's own layers_ array (containing sibling layers), and recursing into it here would
    // bounce between siblings forever instead of stopping at the leaf.
    const ownsLayers = Object.prototype.hasOwnProperty.call(map, 'layers_') && Array.isArray(map.layers_)

    if (ownsLayers) {
        map.layers_.forEach((layer) => {
            // In legacy/single-layer maps, layers_ can include the map object itself.
            if (layer && layer !== map) stopDorlingSimulation(layer)
        })
    }

    if (map.dorlingWorker_) {
        map.dorlingWorker_.terminate()
        map.dorlingWorker_ = null
    }

    if (map.simulation) {
        map.simulation.stop()
        map.simulation.on('tick', null)
        map.simulation = null
    }

    // If this is a pure map container, we've already stopped child layers above.
    if (ownsLayers) {
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
