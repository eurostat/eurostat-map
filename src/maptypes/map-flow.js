// Import required D3 modules
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

const exampleGraph = {
    nodes: [
        { id: 'FR', x: 681.1851800759263, y: 230.31124763648583 },
        { id: 'DE', x: 824.5437782154489, y: 123.70302649032199 },
        { id: 'IT', x: 852.4825697391176, y: 341.2769489380059 },
        { id: 'ES', x: 542.0535296122652, y: 369.06544910331417 },
        { id: 'BE', x: 730.0123797336544, y: 127.74905244343536 },
        { id: 'NL', x: 749.175863493742, y: 87.27354778987966 },
        { id: 'CH', x: 782.4178994989912, y: 232.5359911477708 },
        { id: 'PL', x: 970.7849882008576, y: 92.61718744265188 },
        { id: 'PT', x: 445.73965176651086, y: 366.90829704399636 },
        { id: 'AT', x: 887.5898207349595, y: 214.2378085459197 },
        { id: 'CZ', x: 907.1965357417834, y: 157.97566911120774 },
    ],
    links: [
        { source: 'FR', target: 'DE', value: 82018369.72 },
        { source: 'FR', target: 'IT', value: 49697198.92 },
        { source: 'FR', target: 'ES', value: 45422327.56 },
        { source: 'FR', target: 'BE', value: 43038180.93 },
        { source: 'FR', target: 'NL', value: 34453478.99 },
        { source: 'FR', target: 'CH', value: 16164188.98 },
        { source: 'FR', target: 'PL', value: 12673336.04 },
        { source: 'FR', target: 'PT', value: 7178656.08 },
        { source: 'FR', target: 'AT', value: 6305366.1 },
        { source: 'FR', target: 'CZ', value: 5883790.49 },
    ],
}

import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

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
    ;['flowMapConfig_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //@override
    out.updateStyle = function () {
        let config = out.flowMapConfig_
        createVisualization()
    }

    //@override
    out.updateClassification = function () {}

    //@override
    out.getLegendConstructor = function () {
        return ChoroplethLegend.legend
    }

    /**
     * Function to create a map with Sankey diagram and other elements
     * @param {Object} config - Configuration options and data for the map
     */
    function createMap(config) {
        const {
            graph, // Sankey data (nodes and links)
            width,
            height, // SVG dimensions
            geometries, // Geographical shapes for regions
            poi, // Points of interest
            exporters, // Exporters data
            countryBorders, // Borders data
            mergeData, // Data for labels
            labelOffsetX, // Label offset
            showArrowOutlines, // Show arrow outlines flag
            showArrowTips, // Show arrow tips flag
            showLabels, // Show labels flag
        } = config

        // Create the SVG container
        const svg = out.svg_

        // Process Sankey data
        const { nodes, links } = sankey(graph)

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
        addGeographicalLayers(svg, geometries, poi, exporters, countryBorders)

        // Add Sankey flows
        addSankeyFlows(svg, links, arrowId, arrowOutlineId, gradientIds, showArrowOutlines, showArrowTips)

        // Add additional nodes (fill gaps)
        addFillGaps(svg, nodes)

        // Add labels
        if (showLabels) {
            addLabels(svg, mergeData, labelOffsetX)
        }

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
     * @param {boolean} showArrowOutlines - Flag to show arrow outlines
     * @param {boolean} showArrowTips - Flag to show arrow tips
     */
    function addSankeyFlows(svg, links, arrowId, arrowOutlineId, gradientIds, showArrowOutlines, showArrowTips) {
        const flowsGroup = svg.append('g').attr('class', 'flows-group')

        links.forEach((link, i) => {
            // Outline path
            if (showArrowOutlines) {
                flowsGroup
                    .append('path')
                    .attr('d', sankeyLinkHorizontal()(link))
                    .attr('fill', 'none')
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', link.width + 1.5)
                    .attr('marker-end', showArrowTips ? `url(#${arrowOutlineId})` : null)
            }

            // Main path
            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(link))
                .attr('fill', 'none')
                .attr('stroke', `url(#${gradientIds[i]})`)
                .attr('stroke-width', link.width)
                .attr('marker-end', showArrowTips ? `url(#${arrowId})` : null)
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
     * @param {Array} mergeData - Array of data for labels.
     * @param {Function} path - D3 geo path generator.
     * @param {number} labelOffsetX - Horizontal offset for labels.
     */
    function addLabels(svg, mergeData, path, labelOffsetX) {
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
