// Import required D3 modules
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
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
        const sk = sankey()
            .nodeId((d) => d.id) // Match your node IDs
            .nodeWidth(15)
            .nodePadding(10)
            .extent([
                [1, 1],
                [out.width_ - 1, out.height_ - 1],
            ])

        // Process Sankey data
        const processedGraph = sk(exampleGraph) // Processes `exampleGraph`
        const { nodes, links } = processedGraph // Now `nodes` and `links` are arrays
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

    return out
}
