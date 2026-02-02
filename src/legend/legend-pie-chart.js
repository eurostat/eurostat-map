import { format } from 'd3-format'
import { select } from 'd3-selection'
import { max } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'
import { drawCircleSizeLegend } from './legend-circle-size'

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //size legend config (legend illustrating the values of different pie sizes)
    out.sizeLegend = {
        title: null,
        titlePadding: 10, //padding between title and body
        values: null,
        labelFormatter: undefined, // user-defined format function
        noData: false, // show no data legend item
        noDataText: 'No data', //no data text label
    }

    //colour legend config (legend illustrating the values of different pie colours)
    out.colorLegend = {
        title: null,
        titlePadding: 10, //padding between title and body
        marginTop: 33, // margin top (distance between color and size legend)
        labelOffsets: { x: 5, y: 5 }, //the distance between the legend box elements to the corresponding text label
        shapeWidth: 25, //the width of the legend box elements
        shapeHeight: 20, //the height of the legend box elements
        shapePadding: 1, //the distance between consecutive legend box elements
        noData: true, //show no data
        noDataText: 'No data', //no data label text
    }

    out._sizeLegendHeight = 0

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (key == 'colorLegend' || key == 'sizeLegend') {
                for (let p in out[key]) {
                    //override each property in size and color legend configs
                    if (config[key][p] !== undefined) {
                        out[key][p] = config[key][p]
                    }
                }
                if (config.colorLegend == false) out.colorLegend = false
            } else {
                out[key] = config[key]
            }
        }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const map = out.map
        const lgg = out.lgg

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // initial x and y positions for the internal legend elements
        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        // legend for sizes
        if (map.classifierSize_) {
            //circle size legend
            out._sizeLegendContainer = lgg.append('g').attr('class', 'em-pie-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)
            drawCircleSizeLegend(
                out,
                out._sizeLegendContainer,
                out.sizeLegend.values,
                map.classifierSize_,
                out.sizeLegend.title,
                out.sizeLegend.titlePadding
            )
        }

        // legend for ps color values
        buildColorLegend(out, baseX, baseY)

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend illustrating the statistical values of the pie charts' different colours
     *
     */
    function buildColorLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.colorLegend
        //container
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-pie-color-legend')

        //container position
        if (out._sizeLegendContainer) {
            // position it below size legend
            const sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            out._colorLegendContainer.attr('transform', `translate(${baseX},${sizeLegendHeight + out.colorLegend.marginTop})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
        }

        //draw title
        if (config.title) {
            out._colorLegendContainer
                .append('text')
                .attr('id', 'em-color-legend-title')
                .attr('class', 'em-color-legend-title')
                .attr('x', 0)
                .attr('y', out.titleFontSize)
                .text(config.title)
        }

        //draw legend elements for classes: rectangle + label
        let i = 0
        const scs = map.catColors()
        for (let code in scs) {
            //the vertical position of the legend element
            const y = out.colorLegend.titlePadding + (config.title ? out.titleFontSize : 0) + i * (config.shapeHeight + config.shapePadding)
            //the color
            const col = map.catColors()[code] || 'lightgray'

            //rectangle
            out._colorLegendContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', config.shapeWidth)
                .attr('height', config.shapeHeight)
                .style('fill', scs[code])

                .on('mouseover', function () {
                    highlightRegions(out.map, code)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, code)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, code)
                    }
                })

            //label
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', config.shapeWidth + config.labelOffsets.x)
                .attr('y', y + config.shapeHeight * 0.5)
                .attr('dy', '0.35em') // ~vertical centering
                .text(map.catLabels()[code] || code)

            i++
        }

        //'no data' legend box
        if (config.noData) {
            let sizeLegendHeight = 0
            if (out._sizeLegendContainer) {
                sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            }
            const y =
                sizeLegendHeight +
                out.colorLegend.marginTop +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)

            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding},${y})`)
            out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
        }
    }

    // Highlight selected segments on mouseover
    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.piechart').selectAll('path[code]')

        // Set all segments to transparent
        allSegments.style('opacity', 0)

        // Highlight only the selected segments by restoring their original color
        const selectedSegments = allSegments.filter("path[code='" + code + "']")
        selectedSegments.each(function () {
            select(this).style('opacity', 1) // Restore original color for selected segments
        })
    }

    // Reset all segments to their original colors on mouseout
    function unhighlightRegions(map) {
        const allSegments = map.svg_.selectAll('.piechart').selectAll('path[code]')

        // Restore each segments's original color from the fill___ attribute
        allSegments.each(function () {
            select(this).style('opacity', 1)
        })
    }

    return out
}
