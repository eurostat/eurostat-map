// Import required D3 modules
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { linkHorizontal } from 'd3-shape'
import { sum, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import * as StatMap from '../core/stat-map'
import * as FlowLegend from '../legend/legend-flow'
import { select, selectAll } from 'd3-selection'
import { format } from 'd3-format'

/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true)
    out.strokeWidthScale = scaleLinear()
    out.labelOffsetX = 15
    out.labelOffsetY = 5
    out.labelFormatter = (d) => format('.2s')(d)
    out.tooltip_.textFunction = flowMapTooltipFunction
    out.flowColor_ = '#72bb6f'
    out.overlayColors_ = ['#bbd7ee', '#c7e3c6'] // exporter, importers

    /**
     * flowmap-specific setters/getters
     */
    ;['flowGraph_', 'flowColor_', 'overlayColors_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //@override
    out.updateStyle = function () {
        // type: "Feature"
        // properties: Object {id: "ES", na: "España"}
        // geometry: Object {type: "MultiPolygon", coordinates: Array(7)}
        // source: "FR"
        // target: "ES"
        // value: 45422327.56

        // update stroke width function
        const data = out.flowGraph_.links
        out.strokeWidthScale = scaleLinear()
            .domain([0, max(data, (d) => d.value)])
            .range([2, 10])

        createFlowMapSVG(out.flowGraph_)
    }

    //@override
    out.updateClassification = function () {}

    //@override
    out.getLegendConstructor = function () {
        //TODO: define legend
        return FlowLegend.legend
    }
    /**
     * Function to create a map with Sankey diagram and other elements
     * @param {Object} graph - Configuration options and data for the map
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
    function createFlowMapSVG(graph) {
        const svg = out.svg_

        // if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
        addCoordinatesToGraph(graph)

        var { nodes, links } = sankey(graph)
        // console.log('Processed Nodes:', nodes) // Array of processed nodes
        // console.log('Processed Links:', links) // Array of processed links

        // Define marker and gradient IDs
        const defs = svg.append('defs')
        const arrowId = generateUniqueId('arrow')
        const arrowOutlineId = generateUniqueId('arrow-outline')
        const gradientIds = links.map(() => generateUniqueId('gradient'))

        // Add arrow markers
        addArrowMarker(defs, arrowId, out.flowColor_)
        addArrowMarker(defs, arrowOutlineId, '#ffffff')

        // Add flow gradients
        addFlowGradients(defs, gradientIds, links)

        // Define our container SVG
        const zoomGroup = select('#em-zoom-group-' + out.svgId_)
        const sankeyContainer = zoomGroup.append('g').attr('class', 'em-flow-container')

        // Add geographical layers
        addOverlayPolygons(sankeyContainer, graph)

        // Add Sankey flows
        addSankeyFlows(sankeyContainer, links, arrowId, arrowOutlineId, gradientIds)

        // Add additional nodes (fill gaps)
        addFillGaps(sankeyContainer, nodes)

        // Add labels to nodes
        if (out.labels_) addLabels(sankeyContainer, nodes)

        return svg.node()
    }

    /**
     * Adds geographical layers (regions, POI overlay, borders)
     * @param {Object} svg - D3 selection of SVG container
     */
    function addOverlayPolygons(svg, graph) {
        const importerIds = []
        const exporterIds = []

        const features = out.Geometries.geoJSONs.nutsrg.concat(out.Geometries.geoJSONs.cntrg)
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
            let selector = out.geo_ === 'WORLD' ? '#em-worldrg path' : '#em-nutsrg path'
            if (out.Geometries.userGeometries) selector = '#em-user-regions path' // for user-defined geometries
            const allRegions = out.svg_.selectAll(selector)

            allRegions.each(function () {
                select(this).style('fill', (region) => {
                    if (importerIds.includes(region.properties.id)) return out.overlayColors_[0]
                    if (exporterIds.includes(region.properties.id)) return out.overlayColors_[1]
                })
            })
        }
    }

    // if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
    function addCoordinatesToGraph(graph) {
        graph.nodes.forEach((node) => {
            if (!node.x && !node.y && out.Geometries.centroidsData) {
                const centroid = out.Geometries.centroidsData.features.find((feature) => {
                    if (node.id == feature.properties.id) return feature
                })

                if (centroid) {
                    let screenCoords = out._projection([centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]])
                    node.x = screenCoords[0]
                    node.y = screenCoords[1]
                } else {
                    console.error('could not find coordinates for', node.id)
                }
            }
        })
    }

    /**
     * Generates a unique DOM ID
     * @param {string} prefix - Prefix for the ID
     * @returns {string} Unique ID
     */
    function generateUniqueId(prefix) {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Adds an arrow marker to the defs section
     * @param {Object} defs - D3 selection of defs
     * @param {string} id - Marker ID
     * @param {string} color - Fill color of the marker
     */
    function addArrowMarker(defs, id, color) {
        defs.append('marker')
            .attr('id', id)
            .attr('markerHeight', 7)
            .attr('markerWidth', 7)
            .attr('refX', 1)
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
            .attr('refX', 1)
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
    function addFlowGradients(defs, gradientIds, links) {
        defs.selectAll('linearGradient')
            .data(links)
            .join('linearGradient')
            .attr('id', (_, i) => gradientIds[i])
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', (d) => d.source.x1)
            .attr('x2', (d) => d.target.x0)
            .attr('y1', (d) => d.y0)
            .attr('y2', (d) => d.y1)
            .call((g) => g.append('stop').attr('offset', '5%').attr('stop-color', out.overlayColors_[0]))
            .call((g) => g.append('stop').attr('offset', '50%').attr('stop-color', out.flowColor_))
    }

    /**
     * Adds Sankey flows (links with markers and gradients)
     * @param {Object} svg - D3 selection of SVG
     * @param {Array} links - Sankey links data
     * @param {string} arrowId - Arrow marker ID
     * @param {string} arrowOutlineId - Arrow outline marker ID
     * @param {Array} gradientIds - Gradient IDs
     */
    function addSankeyFlows(svg, links, arrowId, arrowOutlineId, gradientIds) {
        const flowsGroup = svg.append('g').attr('class', 'em-flows-group')

        links.forEach((link, i) => {
            // Outline path
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('stroke', '#ffffff')
                .attr('class', 'em-flow-link-outline')
                .attr('stroke-width', link.width + 1.5)
                .attr('marker-end', `url(#${arrowOutlineId})`)

            // Main path
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('class', 'em-flow-link')
                .attr('stroke', `url(#${gradientIds[i]})`)
                .attr('stroke-width', link.width)
                .attr('marker-end', `url(#${arrowId})`)
                // add hover effect
                .on('mouseover', function (e) {
                    const hoveredColor = out.hoverColor_

                    // Change the stroke color
                    select(this).attr('stroke', hoveredColor)

                    // Update the marker-end dynamically
                    select(this).attr('marker-end', `url(#${arrowId + 'mouseover'})`)

                    // Tooltip handling
                    if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(link, out))
                })
                .on('mousemove', function (e) {
                    if (out._tooltip) out._tooltip.mousemove(e)
                })
                .on('mouseout', function () {
                    // Revert the stroke color
                    select(this).attr('stroke', `url(#${gradientIds[i]})`)

                    // Revert the marker-end to the original
                    select(this).attr('marker-end', `url(#${arrowId})`)

                    // Tooltip handling
                    if (out._tooltip) out._tooltip.mouseout()
                })
        })
    }

    /**
     * Adds rectangles to fill gaps left by Sankey links
     * @param {Object} svg - D3 selection of SVG
     * @param {Array} nodes - Sankey nodes data
     */
    function addFillGaps(svg, nodes) {
        svg.append('g')
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

    /**
     * Add labels for data points.
     * @param {Object} svg - D3 selection of the SVG element.
     */
    function addLabels(svg, nodes) {
        // Filter the nodes
        const filteredNodes = nodes.filter((node) => node.targetLinks && node.sourceLinks.length === 0)
        const container = svg.append('g').attr('class', 'em-flow-labels')

        // Add halo effect
        if (out.labels_.shadows) {
            const labelsShadowGroup = container.append('g').attr('class', 'em-flow-label-shadow')
            labelsShadowGroup
                .selectAll('text')
                .data(filteredNodes)
                .join('text')
                .attr('text-anchor', (d) => (d.x > d.targetLinks[0].source.x ? 'start' : 'end'))
                .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? d.x + out.labelOffsetX : d.x - out.labelOffsetX))
                .attr('y', (d) => d.y + out.labelOffsetY)
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
            .attr('x', (d) => (d.x > d.targetLinks[0].source.x ? out.labelOffsetX : -out.labelOffsetX))
            .attr('y', out.labelOffsetY)
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

    // Function to append a rectangle behind the label
    function appendLabelRect(labelText, container) {
        const paddingX = 5 // Add some padding around the text
        const paddingY = 2 // Add some padding around the text

        // Create a temporary text element to get the size
        const bbox = container
            .append('text')
            .attr('visibility', 'hidden') // Make the temporary text invisible
            .text(labelText) // Set the label text to get its bounding box
            .node()
            .getBBox() // Get the bounding box of the text

        const labelWidth = bbox.width
        const labelHeight = bbox.height

        // Remove the temporary text element after getting the bounding box
        container.select('text[visibility="hidden"]').remove()

        // Calculate the position of the rectangle to be centered on the text
        const x = -labelWidth / 2 - paddingX // Center the rect horizontally
        const y = -labelHeight / 2 - paddingY // Center the rect vertically

        // Append rectangle with padding
        container
            .append('rect')
            .attr('x', x) // Position rect horizontally
            .attr('y', y) // Position rect vertically
            .attr('width', labelWidth + 2 * paddingX) // Width of the rect with padding
            .attr('height', labelHeight + 2 * paddingY) // Height of the rect with padding
            .attr('class', 'em-label-background')
    }

    // From this point on all code is related with spatial sankey. Adopted from this notebook: https://observablehq.com/@bayre/deconstructed-sankey-diagram
    // See https://observablehq.com/@joewdavies/flow-map-of-europe
    function clone({ nodes, links }) {
        return { nodes: nodes.map((d) => Object.assign({}, d)), links: links.map((d) => Object.assign({}, d)) }
    }

    function sankey({ nodes, links }) {
        const graph = clone({ nodes, links })
        computeNodeLinks(graph)
        computeNodeValues(graph)
        computeNodeDepths(graph)
        computeNodeHeights(graph)
        computeNodeBreadths(graph)
        computeLinkBreadths(graph)
        console.log('Sankey Graph:', graph)
        return graph
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

    function computeLinkBreadths({ nodes }) {
        for (const node of nodes) {
            let y0 = node.y0
            let y1 = y0
            for (const link of node.sourceLinks) {
                link.y0 = y0 + link.width / 2
                y0 += link.width
            }
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

    function computeNodeBreadths({ nodes }) {
        for (const node of nodes) {
            const height = out.strokeWidthScale(node.value)
            node.x0 = node.x1 = node.x
            node.y0 = node.y - height / 2
            node.y1 = node.y0 + height
            for (const link of node.sourceLinks) {
                link.width = out.strokeWidthScale(link.value)
            }
        }
        reorderLinks(nodes)
    }

    const id = (d) => d.id // used in sankey import

    const sankeyLinkHorizontal = function () {
        return linkHorizontal().source(horizontalSource).target(horizontalTarget)
    }

    return out
}

const flowMapTooltipFunction = function (link, map) {
    const buf = []

    // Header with region name and ID
    const title = `${link.source.id} > ${link.target.id}`
    buf.push(`
        <div class="estat-vis-tooltip-bar">
            <b>${title}</b>
        </div>
    `)

    // Value
    buf.push(`<div class='estat-vis-tooltip-text'>
        ${link.target.value}
        </div>`)

    return buf.join('')
}
