import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as lg from '../core/legend'
import { executeForAllInsets } from '../core/utils'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = lg.legend(map)

    //the order of the legend elements. Set to false to invert.
    out.ascending = true

    //the width of the legend box elements
    out.shapeWidth = 25
    //the height of the legend box elements
    out.shapeHeight = 20

    //the separation line length
    out.sepLineLength = 27
    //the separation line color
    out.sepLineStroke = 'black'
    //the separation line width
    out.sepLineStrokeWidth = 1

    //the font size of the legend label
    out.labelFontSize = 12
    //the number of decimal for the legend labels
    out.labelDecNb = 2
    //the distance between the legend box elements to the corresponding text label
    out.labelOffset = 3
    //labelFormatter function
    out.labelFormatter = null
    // manually define labels
    out.labels = null

    //show no data
    out.noData = true
    //no data text label
    out.noDataText = 'No data'

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        const m = out.map
        const svgMap = m.svg()
        const lgg = out.lgg

        // Update legend parameters if necessary
        if (m.legend_) {
            Object.assign(out, m.legend_)
        }

        // Helper functions
        const appendLegendText = (y, text, fontSize, fontWeight = null) => {
            let legendText = lgg
                .append('text')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .text(text)
                .style('font-size', `${fontSize}px`)
                .style('font-family', m.fontFamily_)
                .style('fill', out.fontFill)
            if (fontWeight) legendText.style('font-weight', fontWeight)
        }

        const appendLegendRect = (x, y, fill, ecl, svgId) => {
            return lgg
                .append('rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .attr('fill', fill)
                .on('mouseover', function () {
                    select(this).style('fill', m.nutsrgSelFillSty())
                    highlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, svgId, highlightRegions, ecl)
                    }
                })
                .on('mouseout', function () {
                    select(this).style('fill', fill)
                    unhighlightRegions(out.map, ecl)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, svgId, unhighlightRegions, ecl)
                    }
                })
        }

        // Remove previous content
        lgg.selectAll('*').remove()

        // Draw legend background box and title if provided
        out.makeBackgroundBox()
        if (out.title) {
            appendLegendText(out.boxPadding + out.titleFontSize, out.title, out.titleFontSize, out.titleFontWeight)
        }

        // Set font family for legend
        lgg.style('font-family', m.fontFamily_)

        // Label formatter
        const formatLabel = out.labelFormatter || format(`.${out.labelDecNb}f`)

        // Draw legend elements for each class
        const baseY = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0)
        for (let i = 0; i < m.clnb(); i++) {
            const y = baseY + i * out.shapeHeight
            const ecl = out.ascending ? m.clnb() - i - 1 : i
            const fillColor = m.classToFillStyle()(ecl, m.clnb())

            // Append rectangle for each class
            appendLegendRect(out.boxPadding, y, fillColor, ecl, out.svgId_ || 'defaultSvgId')

            // Append separation line if necessary
            if (i > 0) {
                lgg.append('line')
                    .attr('x1', out.boxPadding)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength)
                    .attr('y2', y)
                    .attr('stroke', out.sepLineStroke)
                    .attr('stroke-width', out.sepLineStrokeWidth)
            }

            // Append label
            if (i < m.clnb() - 1) {
                lgg.append('text')
                    .attr('x', out.boxPadding + Math.max(out.shapeWidth, out.sepLineLength) + out.labelOffset)
                    .attr('y', y + out.shapeHeight)
                    .attr('dominant-baseline', 'middle')
                    .text(out.labels ? out.labels[i] : formatLabel(m.classifier().invertExtent(ecl)[out.ascending ? 0 : 1]))
                    .style('font-size', `${out.labelFontSize}px`)
                    .style('fill', out.fontFill)
            }
        }

        // 'No data' box and label if applicable
        if (out.noData) {
            const y = baseY + m.clnb() * out.shapeHeight + out.boxPadding
            appendLegendRect(out.boxPadding, y, m.noDataFillStyle(), 'nd', out.svgId_ || 'defaultSvgId')
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5)

            lgg.append('text')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dominant-baseline', 'middle')
                .text(out.noDataText)
                .style('font-size', `${out.labelFontSize}px`)
                .style('fill', out.fontFill)
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl) {
        const selector = out.map.geo_ === 'WORLD' ? '#g_worldrg' : '#g_nutsrg'
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Set all regions to white
        allRegions.style('fill', 'white')

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        const selector = out.map.geo_ === 'WORLD' ? '#g_worldrg' : '#g_nutsrg'
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Restore each region's original color from the fill___ attribute
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
