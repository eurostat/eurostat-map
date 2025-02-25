import { format } from 'd3-format'
import { select } from 'd3-selection'
import { max } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //spacing between color & size legends (if applicable)
    out.legendSpacing = 15

    //size legend config (legend illustrating the values of different pie sizes)
    out.sizeLegend = {
        title: null,
        titlePadding: 30, //padding between title and body
        values: null,
    }

    //colour legend config (legend illustrating the values of different pie colours)
    out.colorLegend = {
        title: null,
        labelOffset: 5, //the distance between the legend box elements to the corresponding text label
        shapeWidth: 25, //the width of the legend box elements
        shapeHeight: 20, //the height of the legend box elements
        shapePadding: 5, //the distance between consecutive legend box elements
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

        // legend for sizes
        if (map.sizeClassifier_) {
            buildSizeLegend()
        }

        // legend for ps color values
        buildColorLegend()

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend which illustrates the statistical values of different pie chart sizes
     *
     * @param {*} m map
     * @param {*} lgg parent legend object from core/legend.js
     * @param {*} config size legend config object (sizeLegend object specified as property of legend() config object)
     */
    function buildSizeLegend() {
        const map = out.map
        const config = out.sizeLegend
        const container = out.lgg.append('g').attr('class', 'em-pie-size-legend')

        const domain = map.sizeClassifier_.domain()

        // Assign default circle radii if none specified by user
        if (!config.values) {
            config.values = [Math.floor(domain[1]), Math.floor(domain[0])]
        }

        // Calculate the maximum circle size to be displayed in the legend
        let maxSize = map.sizeClassifier_(max(config.values))

        // Add the title to the container if available
        if (!config.title && out.title) config.title = out.title // Allow root legend title
        let titleHeight = 0 // This will be adjusted based on whether the title exists
        if (config.title) {
            container
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', 0) // Position the title at the left edge
                .attr('y', out.boxPadding + out.titleFontSize) // Title at top, within padding
                .text(config.title)

            // Adjust title height (using the title font size as a proxy)
            titleHeight = out.titleFontSize + out.boxPadding + config.titlePadding
        }

        // Now position the circles **below** the title
        let y = titleHeight + out.boxPadding + maxSize * 2 // Position circles after title height

        // Append the legend circles
        const legendItems = container
            .selectAll('g')
            .data(config.values)
            .join('g')
            .attr('class', 'em-pie-size-legend-item')
            .attr('transform', `translate(${maxSize + out.boxPadding}, ${y})`) // Dynamically move the circles down

        // Append circles to each group
        legendItems
            .append('circle')
            .attr('class', 'em-pie-size-legend-circle')
            .style('fill', 'none')
            .attr('stroke', 'black')
            .attr('cy', (d) => -map.sizeClassifier_(d)) // Position circles based on their size
            .attr('r', map.sizeClassifier_) // Radius is calculated from size classifier

        // Append labels to each group
        legendItems
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('y', (d) => -2 * map.sizeClassifier_(d) - out.labelFontSize - 2) // Position labels relative to circles
            .attr('x', 30) // Set the x-position for the labels
            .attr('dy', '1.2em')
            .attr('xml:space', 'preserve')
            .text((d) => d.toLocaleString('en').replace(/,/gi, ' ')) // Format the label text

        // Add lines pointing to the top of the corresponding circle
        legendItems
            .append('line')
            .attr('class', 'em-pie-size-legend-line')
            .attr('x1', 2)
            .attr('x2', 30)
            .attr('y1', (d) => -2 * map.sizeClassifier_(d)) // Position lines relative to circles
            .attr('y2', (d) => -2 * map.sizeClassifier_(d)) // Same position for the y2 to make a horizontal line

        // Save the height value for positioning the color legend (if needed)
        out._sizeLegendHeight = y
        return out
    }

    /**
     * Builds a legend illustrating the statistical values of the pie charts' different colours
     *
     */
    function buildColorLegend() {
        const map = out.map
        const config = out.colorLegend
        //container
        const container = out.lgg.append('g').attr('class', 'em-pie-color-legend')

        //draw title
        if (config.title) {
            container
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', out.boxPadding)
                .attr('y', out._sizeLegendHeight + out.legendSpacing + out.boxPadding + out.titleFontSize)
                .text(config.title)
        }

        //draw legend elements for classes: rectangle + label
        let i = 0
        const scs = map.catColors()
        for (let code in scs) {
            //the vertical position of the legend element
            const y =
                out._sizeLegendHeight +
                out.legendSpacing +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)
            //the color
            const col = map.catColors()[code] || 'lightgray'

            //rectangle
            container
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', config.shapeWidth)
                .attr('height', config.shapeHeight)
                .style('fill', scs[code])
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5)
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
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + config.shapeWidth + config.labelOffset)
                .attr('y', y + config.shapeHeight * 0.5)
                .attr('dominant-baseline', 'middle')
                .text(map.catLabels()[code] || code)

            i++
        }

        //'no data' legend box
        if (config.noData) {
            const y =
                out._sizeLegendHeight +
                out.legendSpacing +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)

            //rectangle
            container
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', config.shapeWidth)
                .attr('height', config.shapeHeight)
                .style('fill', map.noDataFillStyle())
                .on('mouseover', function () {
                    highlightRegions(out.map, 'nd')
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, 'nd')
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, 'nd')
                    }
                })

            //'no data' label
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + config.shapeWidth + config.labelOffset)
                .attr('y', y + config.shapeHeight * 0.5)
                .text(config.noDataText)
        }
    }

    // Highlight selected segments on mouseover
    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.piechart').selectAll('path[code]')

        // Set all segments to white
        allSegments.style('fill', 'white')

        // Highlight only the selected segments by restoring their original color
        const selectedSegments = allSegments.filter("path[code='" + code + "']")
        selectedSegments.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected segments
        })
    }

    // Reset all segments to their original colors on mouseout
    function unhighlightRegions(map) {
        const allSegments = map.svg_.selectAll('.piechart').selectAll('path[code]')

        // Restore each segments's original color from the fill___ attribute
        allSegments.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
