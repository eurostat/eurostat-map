// Import required D3 modules
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { linkHorizontal } from 'd3-shape'
import { sum, max } from 'd3-array'
import { scaleLinear } from 'd3'
import * as StatMap from '../core/stat-map'
import * as ChoroplethLegend from '../legend/legend-choropleth'
/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config)
    out.strokeWidthScale = scaleLinear()

    /**
     * flowmap-specific setters/getters
     */
    ;['flowGraph_'].forEach(function (att) {
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
        return ChoroplethLegend.legend
    }

    // get regions that are either 'importers' or 'exporters'
    function getFlowRegions() {
        let regions = allNuts.filter((d) => exporter.value == d.properties.id || importers.has(d.properties.id))

        // merge regions with statistical data
        let merged = out.flowData_.find((e) => e.target === d.properties.id)
        return { ...d, ...data2 }
        return features
    }

    /**
     * Function to create a map with Sankey diagram and other elements
     * @param {Object} config - Configuration options and data for the map
     */
    function createFlowMapSVG(graph) {
        const svg = out.svg_
        var { nodes, links } = sankey(graph)
        console.log('Processed Nodes:', nodes) // Array of processed nodes
        console.log('Processed Links:', links) // Array of processed links

        // Define marker and gradient IDs
        const defs = svg.append('defs')
        const arrowId = generateUniqueId('arrow')
        const arrowOutlineId = generateUniqueId('arrow-outline')
        const gradientIds = links.map(() => generateUniqueId('gradient'))

        // Add arrow markers
        addArrowMarker(defs, arrowId, '#72bb6f')
        addArrowMarker(defs, arrowOutlineId, '#ffffff')

        // Add flow gradients
        addFlowGradients(defs, gradientIds, links)

        // Add geographical layers
        //addGeographicalLayers(svg, geometries, poi, exporters, countryBorders)

        // Add Sankey flows
        addSankeyFlows(svg, links, arrowId, arrowOutlineId, gradientIds)

        // Add additional nodes (fill gaps)
        addFillGaps(svg, nodes)

        // Add labels
        //addLabels(svg)

        return svg.node()
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
            .call((g) => g.append('stop').attr('offset', '5%').attr('stop-color', '#c7e3c6'))
            .call((g) => g.append('stop').attr('offset', '50%').attr('stop-color', '#72bb6f'))
    }

    /**
     * Adds geographical layers (regions, POI overlay, borders)
     * @param {Object} svg - D3 selection of SVG
     * @param {Array} geometries - Geographical shapes for regions
     * @param {Object} poi - Points of interest data
     * @param {Set} exporters - Exporters data
     * @param {Array} countryBorders - Borders data
     */
    function addGeographicalLayers(svg, geometries, poi, exporters, countryBorders) {
        const path = out._pathFunction

        // Regions
        svg.append('g')
            .attr('class', 'regions')
            .selectAll('path')
            .data(geometries)
            .join('path')
            .attr('d', path)
            .attr('fill', '#f4f4f4')
            .attr('stroke', 'none')

        // Overlay for exporters and importers
        svg.append('g')
            .attr('class', 'importers-overlay')
            .selectAll('path')
            .data(poi.features)
            .join('path')
            .attr('d', path)
            .attr('fill', (d) => (exporters.has(d.properties.id) ? '#c7e3c6' : '#bbd7ee'))
            .attr('stroke', 'none')

        // National borders
        svg.append('g')
            .attr('class', 'borders')
            .selectAll('path')
            .data(countryBorders)
            .join('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', 'grey')
            .attr('stroke-width', 0.3)
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
        const flowsGroup = svg.append('g').attr('class', 'flows-group')

        links.forEach((link, i) => {
            // Outline path
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', link.width + 1.5)
                .attr('marker-end', `url(#${arrowOutlineId})`)

            // Main path
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('stroke', `url(#${gradientIds[i]})`)
                .attr('stroke-width', link.width)
                .attr('marker-end', `url(#${arrowId})`)
        })
    }

    /**
     * Adds rectangles to fill gaps left by Sankey links
     * @param {Object} svg - D3 selection of SVG
     * @param {Array} nodes - Sankey nodes data
     */
    function addFillGaps(svg, nodes) {
        svg.append('g')
            .attr('class', 'fill-in-gaps')
            .selectAll('rect')
            .data(nodes)
            .join('rect')
            .filter((d) => d.depth && d.height)
            .attr('x', (d) => d.x0 - 0.5)
            .attr('y', (d) => d.y0)
            .attr('width', 1)
            .attr('height', (d) => d.y1 - d.y0)
            .attr('fill', '#72bb6f')
    }

    /**
     * Add labels for data points.
     * @param {Object} svg - D3 selection of the SVG element.
     */
    function addLabels(svg) {
        const mapMidpointX = svg.node().getBoundingClientRect().width / 2

        svg.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(mergeData)
            .join('text')
            .attr('x', (d) => {
                const [x] = path.centroid(d)
                return x > mapMidpointX ? x + labelOffsetX : x - labelOffsetX
            })
            .attr('y', (d) => path.centroid(d)[1])
            .text((d) => d.label)
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
