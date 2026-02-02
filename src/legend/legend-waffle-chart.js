import { format } from 'd3-format'
import { select } from 'd3-selection'
import * as Legend from './legend'
import { executeForAllInsets } from '../core/utils'

/**
 * A legend for waffle chart maps.
 * Shows category colors and optionally a size legend.
 *
 * @param {*} map
 * @param {*} config
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //size legend config (legend illustrating the values of different waffle sizes)
    out.sizeLegend = {
        title: null,
        titlePadding: 10, //padding between title and body
        values: null,
        labelFormatter: undefined, // user-defined format function
        gridSize: 5, // simplified grid for size legend (5x5 = 25 cells)
        cellPadding: 0.5, // padding between cells in size legend
        noData: false, // show no data legend item
        noDataText: 'No data', //no data text label
    }

    //colour legend config (legend illustrating the values of different waffle colours)
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
        if (map.classifierSize_ && out.sizeLegend) {
            //waffle size legend
            out._sizeLegendContainer = lgg.append('g').attr('class', 'em-waffle-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)
            drawWaffleSizeLegend(
                out,
                out._sizeLegendContainer,
                out.sizeLegend.values,
                map.classifierSize_,
                out.sizeLegend.title,
                out.sizeLegend.titlePadding,
                out.sizeLegend.gridSize,
                out.sizeLegend.cellPadding
            )
        }

        // legend for waffle color values
        buildColorLegend(out, baseX, baseY)

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend illustrating the statistical values of the waffle charts' different colours
     */
    function buildColorLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.colorLegend

        //container
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-waffle-color-legend')

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
        const scs = map.catColors() // get the category colors

        Object.keys(scs)
            .reverse()
            .forEach((code) => {
                const y = out.colorLegend.titlePadding + (config.title ? out.titleFontSize : 0) + i * (config.shapeHeight + config.shapePadding)

                // rectangle
                out._colorLegendContainer
                    .append('rect')
                    .attr('class', 'em-legend-rect')
                    .attr('x', 0)
                    .attr('y', y)
                    .attr('width', config.shapeWidth)
                    .attr('height', config.shapeHeight)
                    .attr('rx', 2)
                    .attr('ry', 2)
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

                // label
                out._colorLegendContainer
                    .append('text')
                    .attr('class', 'em-legend-label')
                    .attr('x', config.shapeWidth + config.labelOffsets.x)
                    .attr('y', y + config.shapeHeight * 0.5)
                    .attr('dy', '0.35em')
                    .text(map.catLabels()[code] || code)

                i++
            })

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

    // Highlight selected cells on mouseover
    function highlightRegions(map, code) {
        const allCells = map.svg_.selectAll('.wafflechart').selectAll('rect[code]')

        // Set all cells to transparent
        allCells.style('opacity', 0.2)

        // Highlight only the selected cells by restoring their original opacity
        const selectedCells = allCells.filter("rect[code='" + code + "']")
        selectedCells.each(function () {
            select(this).style('opacity', 1)
        })
    }

    // Reset all cells to their original opacity on mouseout
    function unhighlightRegions(map) {
        const allCells = map.svg_.selectAll('.wafflechart').selectAll('rect[code]')

        // Restore each cell's original opacity
        allCells.each(function () {
            select(this).style('opacity', 1)
        })
    }

    /**
     * Draws a waffle size legend showing example waffles at different sizes
     *
     * @param {Object} legend - The legend object
     * @param {Object} container - The SVG container group to draw into
     * @param {Array} values - Custom values to show, or null to auto-compute
     * @param {Function} classifierSize - The d3 scale for sizing waffles
     * @param {string} title - Optional title for the size legend
     * @param {number} titlePadding - Padding below title
     * @param {number} gridSize - Number of cells per row/column in example waffles
     * @param {number} cellPadding - Padding between cells
     */
    function drawWaffleSizeLegend(legend, container, values, classifierSize, title, titlePadding, gridSize = 5, cellPadding = 0.5) {
        const domain = classifierSize.domain()

        // Compute values if not provided (min, mid, max)
        const legendValues = values || [domain[0], Math.round((domain[0] + domain[1]) / 2), domain[1]]

        // Sort descending so largest is drawn first (at top)
        const sortedValues = [...legendValues].sort((a, b) => b - a)

        let y = 0

        // Draw title if provided
        if (title) {
            container.append('text').attr('class', 'em-legend-title').attr('x', 0).attr('y', y).attr('dominant-baseline', 'hanging').text(title)
            y += legend.titleFontSize + titlePadding
        }

        // Track max waffle size for label positioning
        const maxWaffleSize = classifierSize(sortedValues[0])

        // Draw each waffle example
        for (const val of sortedValues) {
            const waffleSize = classifierSize(val)
            const cellSize = (waffleSize - cellPadding * (gridSize - 1)) / gridSize

            // Draw mini waffle (monochrome for size legend)
            const g = container.append('g').attr('transform', `translate(0, ${y})`)

            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    g.append('rect')
                        .attr('x', col * (cellSize + cellPadding))
                        .attr('y', row * (cellSize + cellPadding))
                        .attr('width', cellSize)
                        .attr('height', cellSize)
                        .attr('fill', '#7f7f7f')
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 0.3)
                        .attr('rx', Math.min(1, cellSize * 0.1))
                        .attr('ry', Math.min(1, cellSize * 0.1))
                }
            }

            // Value label - positioned to the right of the largest waffle
            const labelX = maxWaffleSize + 10
            const labelY = waffleSize / 2

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', labelX)
                .attr('y', y + labelY)
                .attr('dominant-baseline', 'middle')
                .text(formatValue(val, legend.sizeLegend?.labelFormatter))

            y += waffleSize + 8
        }
    }

    /**
     * Format large numbers for legend labels
     */
    function formatValue(val, customFormatter) {
        if (customFormatter) {
            return customFormatter(val)
        }

        if (val >= 1000000) {
            return format('.1f')(val / 1000000) + 'M'
        } else if (val >= 1000) {
            return format('.1f')(val / 1000) + 'K'
        }
        return format('.0f')(val)
    }

    return out
}
