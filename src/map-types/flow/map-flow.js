// Import required D3 modules
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

import { min, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import * as StatMap from '../../core/stat-map'
import * as FlowLegend from '../../legend/legend-flow'
import { select } from 'd3-selection'
import { format } from 'd3-format'
import { createSankeyFlowMap } from './sankey'
import { getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import { createFlowMap } from './straight'

/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'flow')
    out.strokeWidthScale = scaleLinear()
    out.labelFormatter = (d) => format('.2s')(d)
    out.tooltip_.textFunction = flowMapTooltipFunction

    out.flowMapType_ = 'sankey' // type of flow map values: sankey, multiDirectional,

    //add proportional donuts to nodes
    out.flowDonuts_ = true // whether to add donuts to nodes

    // sankey settings
    out.flowColor_ = '#72bb6f'
    out.flowOverlayColors_ = ['#bbd7ee', '#c7e3c6'] // net exporter, net importers
    out.flowMaxWidth_ = 30
    out.flowMinWidth_ = 1
    out.flowArrows_ = true
    out.flowOutlines_ = true
    out.flowGradient_ = true
    out.flowStack_ = false // Default to no stacking
    out.flowLabelOffsets_ = { x: 3, y: 0 } // Offsets for flow labels
    out.flowOpacity_ = 0.5 // Default opacity for flow lines

    //donuts
    out.flowDonutColors_ = {
        incoming: '#2ca02c',
        outgoing: '#d62728',
        internal: '#9467bd',
    }

    /**
     * flowmap-specific setters/getters
     */
    ;[
        'flowGraph_',
        'flowColor_',
        'flowOverlayColors_',
        'flowArrows_',
        'flowMaxWidth_',
        'flowMinWidth_',
        'flowOutlines_',
        'flowGradient_',
        'flowStack_',
        'flowDonuts_',
        'flowLabelOffsets_',
        'flowDonutColors_',
        'flowMapType_',
        'flowDonutSizeScale_',
        'flowOpacity_',
    ].forEach(function (att) {
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
            .domain([min(data, (d) => d.value), max(data, (d) => d.value)])
            .range([out.flowMinWidth_, out.flowMaxWidth_])

        calculateNodeTotals(out)

        // Define our container SVG
        const zoomGroup = select('#em-zoom-group-' + out.svgId_)
        const sankeyContainer = zoomGroup.append('g').attr('class', 'em-flow-container')

        // Add geographical layers
        addOverlayPolygons(out)

        if (out.flowMapType_ === 'sankey') {
            // Create the sankey layout
            createSankeyFlowMap(out, sankeyContainer)
        } else {
            // Draw straight lines by flow
            createFlowMap(out, sankeyContainer)
        }

        // Add labels to nodes
        if (out.labels_?.values) addLabels(out, sankeyContainer, nodes)
    }

    //@override
    out.updateClassification = function () {}

    //@override
    out.getLegendConstructor = function () {
        //TODO: define legend
        return FlowLegend.legend
    }

    return out
}

function calculateNodeTotals(out) {
    // Sum values for each node
    const { nodes, links } = out.flowGraph_
    const nodeTotals = new Map()
    links.forEach((link) => {
        nodeTotals.set(link.source, (nodeTotals.get(link.source) || 0) + link.value)
        nodeTotals.set(link.target, (nodeTotals.get(link.target) || 0) + link.value)
    })

    // Add the totals to nodes
    nodes.forEach((node) => {
        node.value = nodeTotals.get(node.id) || 0
    })
}

/**
 * Adds geographical layers (regions, POI overlay, borders)
 */
function addOverlayPolygons(out) {
    const graph = out.flowGraph_
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
                console.warn('could not find region geometry for', node.id)
            }
        })

        out.importerRegionIds = importerIds
        out.exporterRegionIds = exporterIds

        if (importerIds.length === 0 && exporterIds.length === 0) {
            return console.warn('No importer or exporter regions found in the flow graph.')
        }

        //update existing region fills
        const selector = getRegionsSelector(out)
        const allRegions = out.svg_.selectAll(selector)

        allRegions.each(function () {
            select(this)
                .style('fill', (region) => {
                    if (importerIds.includes(region.properties.id)) return out.flowOverlayColors_[0]
                    if (exporterIds.includes(region.properties.id)) return out.flowOverlayColors_[1]
                })
                .attr('class', (region) => {
                    if (importerIds.includes(region.properties.id)) return 'em-flow-importer'
                    if (exporterIds.includes(region.properties.id)) return 'em-flow-exporter'
                })
        })
    }
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

const flowMapTooltipFunction = function (link, map) {
    const buf = []
    const statData = map.statData()
    const unit = statData.unitText() || ''

    // Header with region name and ID
    const title = `${link.source.name || link.source.id} to ${link.target.name || link.target.id}`
    buf.push(`
        <div class="em-tooltip-bar">
            <b>${title}</b>
        </div>
    `)

    // Value
    buf.push(`<div class='em-tooltip-text'>
                <table class="em-tooltip-table">
                    <tbody>
                        <tr><td>${spaceAsThousandSeparator(link.value)} ${unit}</td></tr>
                    </tbody>
                </table> 
            </div>`)

    return buf.join('')
}
