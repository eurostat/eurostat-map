import { select } from 'd3-selection'
import * as Legend from './legend'
import { executeForAllInsets, getLegendRegionsSelector } from '../core/utils'
import { appendPatternFillLegend } from './legend-pattern-fill'
import { highlightRegions, unhighlightRegions } from './legend'
import { appendLegendSwatchRows, swatchStackStart } from './legend-swatch'
//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */



/**
 * A legend for categorical maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)
    // allow the user to define the order of the legend elements manually as an array
    out.order = undefined

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node() && out.map.classifier_) {
            // Draw legend background box and title if provided
            out.makeBackgroundBox()
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            const baseY = out.getBaseY()
            const baseX = out.getBaseX()

            out._categoricalContainer = out.lgg.append('g').attr('class', 'em-legend-categorical').attr('transform', `translate(${baseX}, ${baseY})`)
            createCategoricalLegend(out)

            // Append pattern fill legend items BELOW the main legend
            if (out.map.patternFill_) {
                const legendHeight = out.lgg.node().getBBox().height
                const patternContainer = out.lgg
                    .append('g')
                    .attr('class', 'pattern-fill-legend')
                    .attr('transform', `translate(${baseX}, ${legendHeight + 15})`)
                appendPatternFillLegend(out, patternContainer)
            }

            // Optionally add no-data
            if (out.noData) {
                const legendHeight = out.lgg.node().getBBox().height + 10 // Add some space below the legend
                const x = baseX
                const container = out.lgg
                    .append('g')
                    .attr('class', 'em-no-data-legend')
                    .attr('transform', `translate(${x},${legendHeight + 15})`)
                out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
            }

            //set legend box dimensions
            out.setBoxDimension()
        }
    }

    function createCategoricalLegend(out) {
        const container = out._categoricalContainer
        const map = out.map

        //get category codes
        const domain = map.classToFillStyle() ? Object.keys(map.classToFillStyle()) : map.classifier_.domain()
        const ecls = out.order ? out.order : domain

        //draw legend elements for classes: rectangle + label
        const items = ecls.map((ecl_) => {
            const ecl = map.classifier_(ecl_)
            return {
                color: map.classToFillStyle_[ecl_],
                label: map.classToText() ? map.classToText()[ecl_] : ecl_,
                onEnter: () => {
                    highlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.svgId_, highlightRegions, ecl)
                    }
                },
                onLeave: () => {
                    unhighlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.svgId_, unhighlightRegions, ecl)
                    }
                },
            }
        })
        appendLegendSwatchRows(container, items, {
            shapeWidth: out.shapeWidth,
            shapeHeight: out.shapeHeight,
            startY: swatchStackStart({ titlePadding: out.titlePadding }),
            gap: out.shapePadding,
            labelX: out.shapeWidth + out.labelOffsets.x,
            labelDy: '0.35em',
        })
    }

    return out
}
