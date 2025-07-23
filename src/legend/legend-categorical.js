import { create, select } from 'd3-selection'
import * as Legend from './legend'
import { executeForAllInsets, getLegendRegionsSelector } from '../core/utils'
import { appendPatternFillLegend } from './legend-pattern-fill'

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
                const legendHeight = out.lgg.node().getBBox().height
                const map = out.map
                const domain = map.classToFillStyle() ? Object.keys(map.classToFillStyle()) : map.classifier_.domain()
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
        for (let i = 0; i < ecls.length; i++) {
            //the class
            const ecl_ = ecls[i]
            const ecl = map.classifier_(ecl_)
            const fillColor = map.classToFillStyle_[ecl_]

            //the vertical position of the legend element
            const y = out.titlePadding + i * (out.shapeHeight + out.shapePadding)

            //rectangle
            container
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', fillColor)
                .on('mouseover', function () {
                    highlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.svgId_, highlightRegions, ecl)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.svgId_, unhighlightRegions, ecl)
                    }
                })

            //label
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.shapeWidth + out.labelOffsets.x)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dy', '0.35em') // ~vertical centering
                .text(map.classToText() ? map.classToText()[ecl_] : ecl_)
        }
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')
        allRegions.style('fill', 'white')
        const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
