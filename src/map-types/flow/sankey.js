import { generateUniqueId, getRegionsSelector } from '../../core/utils'
import { linkHorizontal } from 'd3-shape'
import { sum } from 'd3-array'
import { select } from 'd3-selection'
import { addDonutsToNodes, computeDonutValues } from './donuts'

// spatial sankey. Adopted from this notebook: https://observablehq.com/@bayre/deconstructed-sankey-diagram
// See https://observablehq.com/@joewdavies/flow-map-of-europe

/**
     * Function to create a map with Sankey diagram and other elements
     * exampleGraph = {
                nodes: [
                    { id: 'FR', x: 681.1851800759263, y: 230.31124763648583 },
                    { id: 'DE', x: 824.5437782154489, y: 123.70302649032199 },
                ],
                links: [
                    { source: 'FR', target: 'DE', value: 82018369.72 },
                ],
            }
     */

export function createSankeyFlowMap(out, sankeyContainer) {
    out = out
    const svg = out.svg_
    const graph = out.flowGraph_

    // if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
    addCoordinatesToGraph(out, graph)

    var { nodes, links } = sankey(out, graph)

    if (!out.flowStack_) {
        // Collapse all links at origin Y (or middle of the node height)
        links.forEach((link) => {
            const midY = (link.source.y0 + link.source.y1) / 2
            link.y0 = midY
        })
    }

    // Define marker and gradient IDs
    const defs = svg.append('defs')
    const arrowId = generateUniqueId('arrow')
    const arrowOutlineId = generateUniqueId('arrow-outline')
    const gradientIds = links.map(() => generateUniqueId('gradient'))

    // Add arrow markers
    if (out.flowArrows_) {
        addArrowMarker(out, defs, arrowId, out.flowColor_)
        addArrowMarker(out, defs, arrowOutlineId, '#ffffff')
    }

    // Add flow gradients
    if (out.flowGradient_) {
        addFlowGradients(out, defs, gradientIds, links)
    }

    // Add geographical layers
    addOverlayPolygons(out, graph)

    // Add Sankey flows
    addSankeyFlows(out, sankeyContainer, links, arrowId, arrowOutlineId, gradientIds)

    // Add additional nodes (fill gaps)
    addFillGaps(out, sankeyContainer, nodes)

    if (out.flowDonuts_) {
        computeDonutValues(nodes)
        addDonutsToNodes(out, sankeyContainer, nodes)
    }

    // Add labels to nodes
    if (out.labels_) addLabels(out, sankeyContainer, nodes)

    return svg.node()
}

/**
 * Adds geographical layers (regions, POI overlay, borders)
 */
function addOverlayPolygons(out, graph) {
    const importerIds = []
    const exporterIds = []
    const features = out.Geometries.getRegionFeatures()
    if (features) {
        graph.nodes.forEach((node) => {
            const overlay = features.find((feature) => {
                if (node.id == feature.properties.id) return feature
            })

            if (overlay) {
                let isImporter = graph.links.some((link) => link.source == node.id)
                if (isImporter) {
                    importerIds.push(node.id)
                } else {
                    exporterIds.push(node.id)
                }
            } else {
                console.error('could not find geometry for', node.id)
            }
        })

        //update existing region fills
        const selector = getRegionsSelector(out)
        const allRegions = out.svg_.selectAll(selector)

        allRegions.each(function () {
            select(this).style('fill', (region) => {
                if (importerIds.includes(region.properties.id)) return out.flowOverlayColors_[0]
                if (exporterIds.includes(region.properties.id)) return out.flowOverlayColors_[1]
            })
        })
    }
}

// if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
function addCoordinatesToGraph(out, graph) {
    graph.nodes.forEach((node) => {
        if (!node.x && !node.y && out.Geometries.centroidsFeatures) {
            const centroid = out.Geometries.centroidsFeatures.find((feature) => {
                if (node.id == feature.properties.id) return feature
            })

            if (centroid) {
                const screenCoords = out._projection([centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]])
                node.x = screenCoords[0]
                node.y = screenCoords[1]
            } else {
                console.error('could not find coordinates for', node.id)
            }
        } else {
            if (node.x && node.y) {
                // user coords to screen coords
                const screenCoords = out._projection([node.x, node.y])
                node.x = screenCoords[0]
                node.y = screenCoords[1]
                return
            }
            // no centroids data, calculate on the fly
            const features = out.Geometries.getRegionFeatures()
            const feature = features.find((feature) => {
                if (node.id == feature.properties.id) return feature
            })
            const centroid = feature.properties.centroid || out._pathFunction.centroid(feature)
            const screenCoords = out._projection([centroid[0], centroid[1]])
            node.x = screenCoords[0]
            node.y = screenCoords[1]
        }
    })
}

/**
 * Adds an arrow marker to the defs section
 * @param {Object} defs - D3 selection of defs
 * @param {string} id - Marker ID
 * @param {string} color - Fill color of the marker
 */
function addArrowMarker(out, defs, id, color) {
    defs.append('marker')
        .attr('id', id)
        .attr('markerHeight', 7)
        .attr('markerWidth', 7)
        .attr('refX', 0.5)
        .attr('refY', 1.5)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', color)
        .attr('d', 'M0,0 q0,1,0.5,1.5 q-0.5,0.5,-0.5,1.5 q0.75,-0.75,2,-1.5 q-1.25,-0.75,-2,-1.5Z')

    // add a copy for mouseover with hovered color
    defs.append('marker')
        .attr('id', id + 'mouseover')
        .attr('markerHeight', 7)
        .attr('markerWidth', 7)
        .attr('refX', 0.5)
        .attr('refY', 1.5)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', out.hoverColor_)
        .attr('d', 'M0,0 q0,1,0.5,1.5 q-0.5,0.5,-0.5,1.5 q0.75,-0.75,2,-1.5 q-1.25,-0.75,-2,-1.5Z')
}

/**
 * Adds linear gradient definitions for flow links
 * @param {Object} defs - D3 selection of defs
 * @param {Array} gradientIds - Array of gradient IDs
 * @param {Array} links - Sankey links data
 */
function addFlowGradients(out, defs, gradientIds, links) {
    defs.selectAll('linearGradient')
        .data(links)
        .join('linearGradient')
        .attr('id', (_, i) => gradientIds[i])
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', (d) => d.source.x1)
        .attr('x2', (d) => d.target.x0)
        .attr('y1', (d) => d.y0)
        .attr('y2', (d) => d.y1)
        .call((g) => g.append('stop').attr('offset', '5%').attr('stop-color', out.flowOverlayColors_[0]))
        .call((g) => g.append('stop').attr('offset', '50%').attr('stop-color', out.flowColor_))
}

function clone({ nodes, links }) {
    return { nodes: nodes.map((d) => Object.assign({}, d)), links: links.map((d) => Object.assign({}, d)) }
}

function sankey(out, { nodes, links }) {
    const graph = clone({ nodes, links })
    computeNodeLinks(graph)
    computeNodeValues(graph)
    computeNodeDepths(graph)
    computeNodeHeights(graph)
    computeNodeBreadths(out, graph)
    computeLinkBreadths(graph)
    return graph
}

/**
 * Adds Sankey flows (links with markers and gradients)
 * @param {Object} container - D3 selection of SVG
 * @param {Array} links - Sankey links data
 * @param {string} arrowId - Arrow marker ID
 * @param {string} arrowOutlineId - Arrow outline marker ID
 * @param {Array} gradientIds - Gradient IDs
 */
function addSankeyFlows(out, container, links, arrowId, arrowOutlineId, gradientIds) {
    const flowsGroup = container.append('g').attr('class', 'em-flows-group')

    links.forEach((link, i) => {
        // Outline path
        if (out.flowOutlines_) {
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('stroke', '#ffffff')
                .attr('class', 'em-flow-link-outline')
                .attr('stroke-width', link.width + 1.5)
                .attr('marker-end', `url(#${arrowOutlineId})`)
        }

        // Main path
        flowsGroup
            .append('path')
            .attr('d', sankeyLinkHorizontal()(link))
            .attr('fill', 'none')
            .attr('class', 'em-flow-link')
            .attr('stroke', out.flowGradient_ ? `url(#${gradientIds[i]})` : out.flowColor_)
            .attr('stroke-width', link.width)
            .attr('marker-end', out.flowArrows_ ? `url(#${arrowId})` : '')
            // add hover effect
            .on('mouseover', function (e) {
                const hoveredColor = out.hoverColor_

                // Change the stroke color
                select(this).attr('stroke', hoveredColor)

                // Update the marker-end dynamically
                if (out.flowArrows_) select(this).attr('marker-end', `url(#${arrowId + 'mouseover'})`)

                // Tooltip handling
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(link, out))
            })
            .on('mousemove', function (e) {
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function () {
                // Revert the stroke color
                if (out.flowGradient_) {
                    select(this).attr('stroke', `url(#${gradientIds[i]})`)
                } else {
                    select(this).attr('stroke', out.flowColor_)
                }

                // Revert the marker-end to the original
                if (out.flowArrows_) select(this).attr('marker-end', `url(#${arrowId})`)

                // Tooltip handling
                if (out._tooltip) out._tooltip.mouseout()
            })
    })
}

/**
 * Adds rectangles to fill gaps left by Sankey links
 * @param {Object} container - D3 selection of SVG
 * @param {Array} nodes - Sankey nodes data
 */
function addFillGaps(out, container, nodes) {
    container
        .append('g')
        .attr('class', 'em-flow-fill-in-gaps')
        .selectAll('rect')
        .data(nodes)
        .join('rect')
        .filter((d) => d.depth && d.height)
        .attr('x', (d) => d.x0 - 0.5)
        .attr('y', (d) => d.y0)
        .attr('width', 1)
        .attr('height', (d) => d.y1 - d.y0)
        .attr('fill', out.flowColor_)
}

function computeNodeLinks({ nodes, links }) {
    for (const [i, node] of nodes.entries()) {
        node.index = i
        node.sourceLinks = []
        node.targetLinks = []
    }
    const nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d]))
    for (const [i, link] of links.entries()) {
        link.index = i
        let { source, target } = link
        if (typeof source !== 'object') source = link.source = find(nodeById, source)
        if (typeof target !== 'object') target = link.target = find(nodeById, target)
        source.sourceLinks.push(link)
        target.targetLinks.push(link)
    }
    // if (linkSort != null) {
    //     for (const { sourceLinks, targetLinks } of nodes) {
    //         sourceLinks.sort(linkSort)
    //         targetLinks.sort(linkSort)
    //     }
    // }
}

function find(nodeById, id) {
    const node = nodeById.get(id)
    if (!node) throw new Error('missing: ' + id)
    return node
}

function computeNodeDepths({ nodes }) {
    const n = nodes.length
    let current = new Set(nodes)
    let next = new Set()
    let x = 0
    while (current.size) {
        for (const node of current) {
            node.depth = x
            for (const { target } of node.sourceLinks) {
                next.add(target)
            }
        }
        if (++x > n) throw new Error('circular link')
        current = next
        next = new Set()
    }
}

function computeNodeHeights({ nodes }) {
    const n = nodes.length
    let current = new Set(nodes)
    let next = new Set()
    let x = 0
    while (current.size) {
        for (const node of current) {
            node.height = x
            for (const { source } of node.targetLinks) {
                next.add(source)
            }
        }
        if (++x > n) throw new Error('circular link')
        current = next
        next = new Set()
    }
}

function computeNodeBreadths(out, { nodes }) {
    for (const node of nodes) {
        // Compute link widths
        node.sourceLinks.forEach((link) => (link.width = out.strokeWidthScale(link.value)))
        node.targetLinks.forEach((link) => (link.width = out.strokeWidthScale(link.value)))

        // Use total space needed by links
        const totalLinkWidth = Math.max(
            sum(node.sourceLinks, (d) => d.width),
            sum(node.targetLinks, (d) => d.width)
        )

        node.x0 = node.x1 = node.x
        node.y0 = node.y - totalLinkWidth / 2
        node.y1 = node.y + totalLinkWidth / 2
    }

    reorderLinks(nodes)
}

function computeLinkBreadths({ nodes }) {
    for (const node of nodes) {
        let y0 = node.y0
        for (const link of node.sourceLinks) {
            link.y0 = y0 + link.width / 2
            y0 += link.width
        }

        let y1 = node.y0
        for (const link of node.targetLinks) {
            link.y1 = y1 + link.width / 2
            y1 += link.width
        }
    }
}

function horizontalSource(d) {
    return [d.source.x1, d.y0]
}

function horizontalTarget(d) {
    return [d.target.x0, d.y1]
}

function computeNodeValues({ nodes }) {
    for (const node of nodes) {
        node.value = Math.max(
            sum(node.sourceLinks, (d) => d.value),
            sum(node.targetLinks, (d) => d.value)
        )
    }
}

function reorderLinks(nodes) {
    for (const { sourceLinks, targetLinks } of nodes) {
        sourceLinks.sort(ascendingTargetY)
        targetLinks.sort(ascendingSourceY)
    }
}

const ascendingTargetY = (a, b) => a.target.y - b.target.y
const ascendingSourceY = (a, b) => a.source.y - b.source.y

const id = (d) => d.id // used in sankey import

const sankeyLinkHorizontal = function () {
    return linkHorizontal().source(horizontalSource).target(horizontalTarget)
}

/**
 * Add labels for data points.
 * @param {Object} svg - D3 selection of the SVG element.
 */
function addLabels(out, svg, nodes) {
    // Filter the nodes
    const filteredNodes = nodes.filter((node) => node.targetLinks && node.sourceLinks.length === 0)
    const container = svg.append('g').attr('class', 'em-flow-labels')

    // Add halo effect
    if (out.labels_?.shadows) {
        const labelsShadowGroup = container.append('g').attr('class', 'em-flow-label-shadow')
        labelsShadowGroup
            .selectAll('text')
            .data(filteredNodes)
            .join('text')
            .attr('text-anchor', (d) => (d.x > d.targetLinks[0].source.x ? 'start' : 'end'))
            .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? d.x + out.flowLabelOffsets_.x : d.x - out.flowLabelOffsets_.x))
            .attr('y', (d) => d.y + out.flowLabelOffsets_.y)
            .text((d) => out.labelFormatter(d.value))
    }

    // Add labels
    const labelsGroup = container.append('g').attr('class', 'em-flow-label')
    //add background
    // Add background rectangles and text
    const labelElements = labelsGroup
        .selectAll('g') // Use a group for each label to combine rect and text
        .data(filteredNodes)
        .join('g') // Append a group for each label
        .attr('transform', (d) => `translate(${d.x}, ${d.y})`) // Position group at the node

    // Add text first to calculate its size
    labelElements
        .append('text')
        .attr('class', 'em-label-text')
        .attr('text-anchor', (d) => (d.x > d.targetLinks[0].source.x ? 'start' : 'end'))
        .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? out.flowLabelOffsets_.x : -out.flowLabelOffsets_.x))
        .attr('y', out.flowLabelOffsets_.y)
        .text((d) => out.labelFormatter(d.value))

    // Add background rectangles after text is rendered

    if (out.labels_.backgrounds) {
        labelElements.each(function () {
            const textElement = select(this).select('text')
            const bbox = textElement.node().getBBox() // Get bounding box of the text

            const paddingX = 5 // Horizontal padding
            const paddingY = 2 // Vertical padding

            // Add rectangle centered behind the text
            select(this)
                .insert('rect', 'text') // Insert rect before text in DOM
                .attr('class', 'em-label-background')
                .attr('x', bbox.x - paddingX)
                .attr('y', bbox.y - paddingY)
                .attr('width', bbox.width + 2 * paddingX)
                .attr('height', bbox.height + 2 * paddingY)
        })
    }
}
