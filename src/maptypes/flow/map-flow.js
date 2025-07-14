// Import required D3 modules
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

import { max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import * as StatMap from '../../core/stat-map'
import * as FlowLegend from '../../legend/legend-flow'
import { select } from 'd3-selection'
import { format } from 'd3-format'
import { createSankeyFlowMap } from './sankey'
import { spaceAsThousandSeparator } from '../../core/utils'

/**
 * Returns a flow map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, true, 'flow')
    out.strokeWidthScale = scaleLinear()
    out.labelOffsetX = 15
    out.labelOffsetY = 5
    out.labelFormatter = (d) => format('.2s')(d)
    out.tooltip_.textFunction = flowMapTooltipFunction

    out.flowMapType_ = 'sankey' // type of flow map values: sankey, multiDirectional,

    //add proportional donuts to nodes
    out.flowDonuts_ = true // whether to add donuts to nodes

    // sankey settings
    out.flowColor_ = '#72bb6f'
    out.flowOverlayColors_ = ['#bbd7ee', '#c7e3c6'] // exporter, importers
    out.flowMaxWidth_ = 30
    out.flowMinWidth_ = 1
    out.flowArrows_ = true
    out.flowOutlines_ = true
    out.flowGradient_ = true
    out.flowStack_ = false // Default to no stacking

    /**
     * flowmap-specific setters/getters
     */
    ;['flowGraph_', 'flowColor_', 'flowOverlayColors_', 'flowArrows_', 'flowMaxWidth_', 'flowMinWidth_', 'flowOutlines_', 'flowGradient_'].forEach(
        function (att) {
            out[att.substring(0, att.length - 1)] = function (v) {
                if (!arguments.length) return out[att]
                out[att] = v
                return out
            }
        }
    )

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
            .range([out.flowMinWidth_, out.flowMaxWidth_])

        // Define our container SVG
        const zoomGroup = select('#em-zoom-group-' + out.svgId_)
        const sankeyContainer = zoomGroup.append('g').attr('class', 'em-flow-container')

        if (out.flowMapType_ === 'sankey') {
            // Create the sankey layout
            createSankeyFlowMap(out, sankeyContainer)
        }
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

const flowMapTooltipFunction = function (link, map) {
    const buf = []
    const statData = map.statData()
    const unit = statData.unitText() || ''

    // Header with region name and ID
    const title = `${link.source.name || link.source.id} to ${link.target.name || link.target.id}`
    buf.push(`
        <div class="estat-vis-tooltip-bar">
            <b>${title}</b>
        </div>
    `)

    // Value
    buf.push(`<div class='estat-vis-tooltip-text'>
                <table class="nuts-table">
                    <tbody>
                        <tr><td>${spaceAsThousandSeparator(link.value)} ${unit}</td></tr>
                    </tbody>
                </table> 
            </div>`)

    return buf.join('')
}
