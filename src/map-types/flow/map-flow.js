// Import required D3 modules
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

import { min, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import * as StatMap from '../../core/stat-map'
import * as FlowLegend from '../../legend/flow/legend-flow'
import { select } from 'd3-selection'
import { createSankeyFlowMap } from './sankey'
import { getRegionsSelector, spaceAsThousandSeparator } from '../../core/utils'
import { createFlowMap } from './straight'
import { drawNodeDonuts } from './donuts'
import { drawNodeCircles } from './circles'
import { scaleOrdinal } from 'd3-scale'
import { addFlowValueLabels } from '../../core/labels'


/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'flow')
    out.strokeWidthScale = scaleLinear()
    out.tooltip_.textFunction = flowMapTooltipFunction

    // flow type settings
    out.flowLineType_ = 'curved' // type of flow map values: curved || straight
    out.flowBidirectional_ = true // whether flows are bidirectional (true) or unidirectional (false)
    out.flowStack_ = true // stack flows at origin/destination for sankeys (set to false for flows to be drawn on top of each other at origin/destination)
    out.flowEdgeBundling_ = false // whether to use edge bundling for curved flow lines
    out.flowCurvatureSettings_ = {
        gapX: 10,        // how far before/after node to begin/end curve
        padX: 2,         // horizontal clearance near node stems
        padY: 2,         // vertical collision detection padding
        bumpY: 1,        // extra height for hop
        curvature: 0.5   // 0..1; default sankey smoothness
    };

    //out.flowThicknessType_ = 'linear' // gradual?
    out.flowColor_ = '#848484ff'
    out.flowRegionColors_ = ['#bbd7ee', '#c7e3c6'] // net exporter, net importers
    out.flowRegionLabels_ = ['Exporter', 'Importer']
    out.flowMaxWidth_ = 30
    out.flowMinWidth_ = 1
    out.flowArrows_ = true
    out.flowArrowScale_ = 0.7 // scale of arrow markers
    out.flowOutlines_ = true
    out.flowOutlineWidth_ = 1.2 // width of outline around flow lines
    out.flowOutlineColor_ = '#ffffff' // color of outline around flow lines
    out.flowLabelOffsets_ = { x: 3, y: 0 } // Offsets for flow labels
    out.flowOpacity_ = 0.5 // Default opacity for flow lines


    out.flowOrder_ = (a, b) => {
        const dy = a.otherY - b.otherY;          // primary: other end vertical position
        if (dy) return dy;
        if (a.at !== b.at) return a.at === "out" ? -1 : 1;  // outgoing above incoming on ties
        const dv = (b.link.value ?? 0) - (a.link.value ?? 0); // larger value above
        if (dv) return dv;
        return String(a.link.id ?? '').localeCompare(String(b.link.id ?? '')); // stable
    }; //use a custom order function for the flows at nodes

    //add proportional symbols to nodes
    out.flowNodes_ = true // whether to draw proportional symbols at flow nodes
    out.flowNodeType_ = 'circle' // 'circle' || 'donut' (total count only vs inbound/outbound)
    out.flowNodeSizeScale_ = null // custom size scale for nodes

    // include internal flow
    out.flowInternal_ = true // Whether to include internal flows in donuts

    // top N coloring
    out.flowTopLocations_ = 5 // Number of top locations to colour categorically. currently only for flowLineType_ 'straight'. Set to 0 to disable.
    out.flowTopLocationsType_ = 'destination' // 'sum' | 'origin' | 'destination' top locations can be defined by sum of flows or by origin or destination

    // gradients
    out.flowColorGradient_ = false // color at origin to color at destination
    out.flowOpacityGradient_ = false // 0 origin to 1 at destination
    out.flowWidthGradient_ = false // thin at origin to thick at destination
    out.flowWidthGradientSettings_ = {
        startRatio: 0.25,   // starting thickness (as a fraction of final width)
        samples: 48,        // number of resampled points along path (smoothness)
        minStartWidth: 1.5, // ensures very thin flows don't taper to zero
        capEnd: true,       // closes the end cleanly (flat tail)
        curvatureFollow: true // keeps offset normal perpendicular to local tangent
    };

    /**
     * flowmap-specific setters/getters
     */
    const paramNames = [
        'flowGraph_',
        'flowColor_',
        'flowRegionColors_',
        'flowRegionLabels_',
        'flowArrows_',
        'flowArrowScale_',
        'flowMaxWidth_',
        'flowMinWidth_',
        'flowOutlines_',
        'flowOutlineWidth_',
        'flowOutlineColor_',
        'flowColorGradient_',
        'flowStack_',
        'flowNodes_',
        'flowNodeType_',
        'flowLabelOffsets_',
        'flowLineType_',
        'flowNodeSizeScale_',
        'flowOpacity_',
        'flowInternal_',
        'flowTopLocations_',
        'flowTopLocationsType_',
        'flowCurvatureSettings_',
        'flowOrder_',
        'flowWidthGradient_',
        'flowOpacityGradient_',
        'flowWidthGradientSettings_',
        'flowBidirectional_',
        'flowEdgeBundling_',
    ]
    paramNames.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[k](config[k])
        })
    }

    //@override
    out.updateStyle = function () {
        // type: "Feature"
        // properties: Object {id: "ES", na: "España"}
        // geometry: Object {type: "MultiPolygon", coordinates: Array(7)}
        // source: "FR"
        // target: "ES"
        // value: 45422327.56



        // if donuts are enabled, flows must have categorical colors
        if (out.flowNodes_ && out.flowNodeType_ === 'donut' && out.flowTopLocations_ == 0) {
            out.flowTopLocations_ = 4 // force top locations to enable categorical coloring
        }

        // some pre-calculations
        prepareFlowGraph(out)

        // update stroke width function
        defineWidthScale(out)

        // Define our container SVG
        const zoomGroup = select('#em-zoom-group-' + out.svgId_);

        // Try to select existing container
        let flowContainer = zoomGroup.select('#em-flow-container');

        // If it doesn't exist, create it
        if (flowContainer.empty()) {
            flowContainer = zoomGroup
                .append('g')
                .attr('id', 'em-flow-container')
                .attr('class', 'em-flow-container');
        } else {
            // If it exists, clear existing contents
            flowContainer.selectAll('*').remove();
        }

        //hacky: move it up one so that it is above the regions but below the labels
        const node = flowContainer.node();
        if (node && node.previousSibling) {
            node.parentNode?.insertBefore(node, node.previousSibling);
        }

        // Show importer/exporter regions by coloring them
        addOverlayPolygons(out)

        if (out.flowLineType_ === 'curved' || out.flowLineType_ === 'sankey') {
            // Create the sankey layout
            createSankeyFlowMap(out, flowContainer)
        } else {
            // Draw straight lines by flow
            createFlowMap(out, flowContainer)
        }

        // draw nodes
        if (out.flowNodes_) {
            if (out.flowNodeType_ === 'donut') {
                drawNodeDonuts(out, flowContainer)
            } else {
                drawNodeCircles(out, flowContainer)
            }
        }

        // Add labels to nodes
        if (out.labels_?.values) {
            const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
            addFlowValueLabels(out, zoomGroup)
        }
    }

    //@override
    out.updateClassification = function () { }

    //@override
    out.getLegendConstructor = function () {
        //TODO: define legend
        return FlowLegend.legend
    }

    return out
}

function defineWidthScale(out) {
    const data = out.flowGraph_.links
    // data: array of links with .value
    const positives = data.map(d => d.value).filter(v => v > 0);
    const upper = max(positives);
    const smallestPositive = min(positives);

    // visual params
    const minW = Math.max(0, out.flowMinWidth_ || 0); // visible floor (px)
    const maxW = out.flowMaxWidth_;                   // max stroke width (px)

    // Base linear scale for positives only
    const base = scaleLinear()
        .domain([0, upper])
        .range([0, maxW])
        .clamp(true);


    // Final classifier, force min width
    const strokeWidthScale = (v) => {
        const x = +v;
        if (!Number.isFinite(x) || x <= 0) return 0;
        return Math.max(minW, base(x));
    };

    // Optional: expose domain method to be compatible with legacy code
    strokeWidthScale.domain = (...args) => {
        if (args.length) { base.domain(...args); return strokeWidthScale; }
        return base.domain();
    };

    out.strokeWidthScale = strokeWidthScale;
}

function prepareFlowGraph(out) {
    // if nodes in the graph dont have coordinates specified by the user then use nuts2json centroids instead
    addCoordinatesToGraph(out)
    projectAllNodeCoordinates(out)
    calculateNodeTotals(out)
    computeNodeLinks(out)
    if (out.flowTopLocations_) computeTopFlowLocations(out) // compute top locations based on user-selected type
    computeMaxMinFlowCounts(out)

    out.nodeNameMap = new Map(out.flowGraph_.nodes.map((n) => [n.id, n.name || n.id]))
}

function computeMaxMinFlowCounts(out) {
    const values = out.flowGraph_.links.map((l) => l.value).filter((v) => v > 0)
    out.maxFlowCount = values.length ? max(values) : 0
    out.minFlowCount = values.length ? min(values) : 0
}

/**
 * Compute top N flow locations based on user-selected type:
 *  - 'sum'         => incoming + outgoing
 *  - 'origin'      => outgoing only
 *  - 'destination' => incoming only
 *
 * Updates:
 *   out.topLocationKeys (Set of IDs)
 *   out.topLocationColorScale (Ordinal scale for coloring)
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
    out.topLocationColorScale = scaleOrdinal()
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
                if (importerIds.includes(id)) return out.flowRegionColors_[1] // net importer color
                if (exporterIds.includes(id)) return out.flowRegionColors_[0] // net exporter color
                return null
            })
            .attr('class', () => {
                if (importerIds.includes(id)) return 'em-flow-importer'
                if (exporterIds.includes(id)) return 'em-flow-exporter'
                return null
            })
    })
}



const flowMapTooltipFunction = function (link, map) {
    const buf = [];
    const statData = map.statData();
    const unit = statData.unitText() || '';

    // ---- FIX: determine true origin/destination for split flows ----
    const originId =
        link.originId ??
        (link.source.isMidpoint ? null : link.source.id);

    const destId =
        link.destId ??
        (link.target.isMidpoint ? null : link.target.id);

    const nodeById = map._nodeById || new Map();

    const originNode = nodeById.get(originId) || { id: originId, name: originId };
    const destNode = nodeById.get(destId) || { id: destId, name: destId };

    const originName = originNode.name || originNode.id;
    const destName = destNode.name || destNode.id;

    // Header
    const title = `${originName} to ${destName}`;
    buf.push(`
        <div class="em-tooltip-bar">
            <b>${title}</b>
        </div>
    `);

    // Value
    buf.push(`
        <div class='em-tooltip-text'>
            <table class="em-tooltip-table">
                <tbody>
                    <tr><td>${spaceAsThousandSeparator(link.value)} ${unit}</td></tr>
                </tbody>
            </table>
        </div>
    `);

    return buf.join('');
};
