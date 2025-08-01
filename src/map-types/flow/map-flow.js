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
import { computeDonutLocationStats, computeDonutValues, drawDonuts } from './donuts'
import { scaleOrdinal } from 'd3-scale'

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
    out.flowColor_ = '#848484ff'
    out.flowOverlayColors_ = ['#bbd7ee', '#c7e3c6'] // net exporter, net importers
    out.flowMaxWidth_ = 30
    out.flowMinWidth_ = 1
    out.flowArrows_ = true
    out.flowOutlines_ = true
    out.flowGradient_ = true
    out.flowStack_ = false // Default to no stacking
    out.flowLabelOffsets_ = { x: 3, y: 0 } // Offsets for flow labels
    out.flowOpacity_ = 0.5 // Default opacity for flow lines
    out.flowInternal_ = true // Whether to include internal flows in donuts
    out.flowTopLocations_ = 5 // Number of top locations to colour
    out.flowTopLocationsType_ = 'destination' // 'sum' | 'origin' | 'destination' top locations can be defined by sum of flows or by origin or destination

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
        'flowMapType_',
        'flowDonutSizeScale_',
        'flowOpacity_',
        'flowInternal_',
        'flowTopLocations_',
        'flowTopLocationsType_',
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

        // some pre-calculations
        prepareFlowGraph(out)

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

        // donuts
        if (out.flowDonuts_) {
            computeDonutValues(out)
            computeDonutLocationStats(out, true) // include internal flows
            drawDonuts(out, sankeyContainer)
        }

        // Add labels to nodes
        if (out.labels_?.values) addLabels(out, sankeyContainer)
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

function prepareFlowGraph(out) {
    // if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
    addCoordinatesToGraph(out)
    projectAllNodeCoordinates(out)
    calculateNodeTotals(out)
    computeNodeLinks(out)
    computeTopFlowLocations(out) // compute top locations based on user-selected type
}

/**
 * Compute top N flow locations based on user-selected type:
 *  - 'sum'         => incoming + outgoing
 *  - 'origin'      => outgoing only
 *  - 'destination' => incoming only
 *
 * Updates:
 *   out.topLocationKeys (Set of IDs)
 *   out.locationColorScale (Ordinal scale for coloring)
 */
function computeTopFlowLocations(out) {
    const nodes = out.flowGraph_.nodes
    const topN = out.flowTopLocations_
    const topType = out.flowTopLocationsType_ || 'sum'

    // Calculate score for each node based on selected type
    nodes.forEach((node) => {
        const outgoing = node.sourceLinks.reduce((sum, l) => sum + l.value, 0)
        const incoming = node.targetLinks.reduce((sum, l) => sum + l.value, 0)

        if (topType === 'origin') {
            node.topScore = outgoing
        } else if (topType === 'destination') {
            node.topScore = incoming
        } else {
            node.topScore = outgoing + incoming
        }
    })

    // Sort by score descending and select top N
    const topLocations = [...nodes].sort((a, b) => b.topScore - a.topScore).slice(0, topN)

    // Save results
    out.topLocationKeys = new Set(topLocations.map((loc) => loc.id))

    // Assign colors to top locations
    out.locationColorScale = scaleOrdinal()
        .domain(topLocations.map((d) => d.id))
        .range([
            '#00B3E3', // bright turquoise
            '#FBBA00', // golden yellow
            '#2BA966', // medium green
            '#D23142', // red pink
            '#005289', // deep blue
            '#93397F', // deep mauve
            '#E73E11', // bright red orange
            '#4E4084', // muted purple
            '#056731', // dark green
            '#00667E', // teal blue
            '#B5B900', // light green
        ])
}

// if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
function addCoordinatesToGraph(out) {
    out.flowGraph_.nodes.forEach((node) => {
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
            if (out.Geometries.centroidsFeatures) {
                const centroid = out.Geometries.centroidsFeatures.find((feature) => {
                    return node.id == feature.properties.id
                })
                if (centroid) {
                    const [x, y] = centroid.geometry.coordinates
                    node.x = x
                    node.y = y
                } else {
                    console.error('could not find coordinates for', node.id)
                }
            } else {
                const features = out.Geometries.getRegionFeatures?.()
                const feature = features?.find((f) => f.properties.id === node.id)
                const centroid = feature?.properties?.centroid || out._pathFunction.centroid(feature)
                const [x, y] = centroid
                node.x = x
                node.y = y
            }
        }
    })
}

function projectAllNodeCoordinates(out) {
    const nodes = out.flowGraph_.nodes
    for (const node of nodes) {
        const screenCoords = out._projection([node.x, node.y])
        node.x = screenCoords[0]
        node.y = screenCoords[1]
    }
}

export function computeNodeLinks(out) {
    const nodes = out.flowGraph_.nodes
    const links = out.flowGraph_.links
    const id = (d) => d.id
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
}

function find(nodeById, id) {
    const node = nodeById.get(id)
    if (!node) throw new Error('missing: ' + id)
    return node
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

    if (!features) return

    graph.nodes.forEach((node) => {
        // Compute totals for this node
        const outgoing = node.sourceLinks.reduce((sum, l) => sum + l.value, 0)
        const incoming = node.targetLinks.reduce((sum, l) => sum + l.value, 0)

        // Skip nodes that aren't in the geometry features
        const overlay = features.find((f) => f.properties.id === node.id)
        if (!overlay) {
            console.warn('could not find region geometry for', node.id)
            return
        }

        // Classify based on net flow
        if (incoming > outgoing) {
            importerIds.push(node.id)
        } else if (outgoing > incoming) {
            exporterIds.push(node.id)
        }
        // optional: else neither if incoming == outgoing
    })

    out.importerRegionIds = importerIds
    out.exporterRegionIds = exporterIds

    if (importerIds.length === 0 && exporterIds.length === 0) {
        console.warn('No importer or exporter regions found in the flow graph.')
        return
    }

    // Update region fills and classes
    const selector = getRegionsSelector(out)
    const allRegions = out.svg_.selectAll(selector)

    allRegions.each(function () {
        const id = this.__data__.properties.id
        select(this)
            .style('fill', () => {
                if (importerIds.includes(id)) return out.flowOverlayColors_[1] // net importer color
                if (exporterIds.includes(id)) return out.flowOverlayColors_[0] // net exporter color
                return null
            })
            .attr('class', () => {
                if (importerIds.includes(id)) return 'em-flow-importer'
                if (exporterIds.includes(id)) return 'em-flow-exporter'
                return null
            })
    })
}

/**
 * Add labels for data points.
 * @param {Object} svg - D3 selection of the SVG element.
 */
function addLabels(out, svg) {
    // Filter the nodes
    const nodes = out.flowGraph_.nodes
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
