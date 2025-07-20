// dorling.js
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'

/**
 * Runs a Dorling cartogram force simulation for any map type.
 *
 * @param {Object} map - The map object (ps or pie)
 * @param {Function} radiusAccessor - Function to get radius per node
 * @param {Object} options - { strengthX, strengthY, iterations }
 */
export function runDorlingSimulation(map, radiusAccessor, options = {}) {
    const { strengthX = 1, strengthY = 1, iterations = 1 } = options

    const nodes = map.Geometries.centroidsFeatures || []

    if (!nodes.length) return

    // Stop any existing simulation
    stopDorlingSimulation(map)

    const containers = map.svg().selectAll('g.em-centroid')

    map.simulation = forceSimulation(nodes)
        .force('x', forceX((d) => d.properties.centroid[0]).strength(strengthX))
        .force('y', forceY((d) => d.properties.centroid[1]).strength(strengthY))
        .force('collide', forceCollide((d) => radiusAccessor(d)).iterations(iterations))
        .on('tick', () => {
            containers.attr('transform', (d) => `translate(${d.x},${d.y})`)
        })

    console.log('New dorling simulation')
    return map.simulation
}

/**
 * Stops any ongoing Dorling simulation.
 */
export function stopDorlingSimulation(map) {
    if (!map.simulation) return
    map.simulation.stop()
    map.simulation.on('tick', null)
    map.simulation = null
}
