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
     * Main function to create the Sankey diagram and map visualization.
     * @param {Object} config - Configuration object containing required data and options.
     */
    function createVisualization(config) {
        const {
            graph,
            geometries,
            poi,
            countryBorders,
            mergeData,
            showArrowTips = true,
            showArrowOutlines = true,
            showLabels = true,
            labelOffsetX = 10,
            width = 960,
            height = 600,
            path,
            exporters,
        } = config

        const svg = out.svg_

        // Sankey diagram data
        const { nodes, links } = sankey().extent([
            [1, 1],
            [width - 1, height - 1],
        ])(graph)

        // Create definitions for markers and gradients
        const defs = svg.append('defs')
        const arrowId = generateUniqueId('arrow')
        const arrowId2 = generateUniqueId('arrow-outline')
        const gradientIds = links.map(() => generateUniqueId('gradient'))

        // Add markers
        addArrowMarker(defs, arrowId, '#72bb6f')
        addArrowMarker(defs, arrowId2, '#ffffff')

        // Add gradients
        addGradients(defs, links, gradientIds)

        // Add graticule
        svg.append('g')
            .attr('class', 'graticule')
            .datum(d3.geoGraticule().step([10, 10]))
            .append('path')
            .attr('d', path)
            .attr('fill', '#fcfdff')

        // Add regions
        svg.append('g')
            .attr('class', 'regions')
            .selectAll('path')
            .data(geometries)
            .join('path')
            .attr('d', path)
            .attr('fill', '#f4f4f4')

        // Overlay for importers and exporters
        svg.append('g')
            .attr('class', 'importers-overlay')
            .selectAll('path')
            .data(poi.features)
            .join('path')
            .attr('d', path)
            .attr('fill', (d) => (exporters.has(d.properties.id) ? '#c7e3c6' : '#bbd7ee'))

        // Add borders
        svg.append('g')
            .attr('class', 'borders')
            .selectAll('path')
            .data(countryBorders)
            .join('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', 'grey')
            .attr('stroke-width', 0.3)

        // Process links and draw flows
        processLinks(links, arrowId, arrowId2, gradientIds, svg, showArrowTips, showArrowOutlines)

        // Fill gaps in node rendering
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

        // Add labels
        if (showLabels) {
            addLabels(svg, mergeData, path, labelOffsetX)
        }

        return svg.node()
    }

    /**
     * Generate a unique identifier for elements like markers or gradients.
     * @param {string} prefix - Prefix for the ID.
     * @returns {string} A unique ID string.
     */
    function generateUniqueId(prefix) {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Add an arrow marker definition.
     * @param {Object} defs - D3 selection of the defs element.
     * @param {string} id - ID of the marker.
     * @param {string} color - Fill color of the arrow.
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
     * Add linear gradient definitions for links.
     * @param {Object} defs - D3 selection of the defs element.
     * @param {Array} links - Array of link data.
     * @param {Array} gradientIds - Array of gradient IDs.
     */
    function addGradients(defs, links, gradientIds) {
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
     * Process and draw links for the Sankey diagram.
     * @param {Array} links - Array of link data.
     * @param {string} arrowId - ID for the main arrow marker.
     * @param {string} arrowId2 - ID for the outline arrow marker.
     * @param {Array} gradientIds - Array of gradient IDs.
     * @param {Object} svg - D3 selection of the SVG element.
     * @param {boolean} showArrowTips - Whether to show arrow tips.
     * @param {boolean} showArrowOutlines - Whether to show arrow outlines.
     */
    function processLinks(links, arrowId, arrowId2, gradientIds, svg, showArrowTips, showArrowOutlines) {
        const flowsGroup = svg.append('g').attr('class', 'flows-group')

        links.forEach((d, i) => {
            if (showArrowOutlines) {
                flowsGroup
                    .append('path')
                    .attr('d', sankeyLinkHorizontal()(d))
                    .attr('fill', 'none')
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', d.width + 1.5)
                    .attr('marker-end', !d.target.height ? `url(#${arrowId2})` : null)
            }

            flowsGroup
                .append('path')
                .attr('d', sankeyLinkHorizontal()(d))
                .attr('fill', 'none')
                .attr('stroke', !d.source.depth ? `url(#${gradientIds[i]})` : '#72bb6f')
                .attr('stroke-width', d.width)
                .attr('marker-end', !d.target.height ? `url(#${arrowId})` : null)
        })
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
