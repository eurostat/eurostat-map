import { select, selectAll } from 'd3-selection'
import * as Legend from './legend'
import { line } from 'd3-shape'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'

/**
 * A legend for choropleth-bivariate maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //size
    out.squareSize = 100

    //orientation
    out.rotation = 0

    //labels
    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'

    //get the font size of the texts
    out.axisTitleFontSize = getFontSizeFromClass('em-bivariate-axis-title')

    //breaks
    out.breaks1 = undefined
    out.breaks2 = undefined
    out.showBreaks = false // if set to true and breaks1 and breaks2 are undefined then breaks are automatically defined

    //axis
    out.yAxisLabelsOffset = { x: 7, y: 0 }
    out.xAxisLabelsOffset = { x: 0, y: 0 }

    //show no data
    out.noData = true
    //show no data
    out.noDataShapeHeight = 20
    out.noDataShapeWidth = 25

    //no data text label
    out.noDataText = 'No data'

    //override padding
    out.boxPadding = out.labelFontSize

    //add extra distance between legend and no data item
    out.noDataYOffset = 20

    //arrows
    out.arrowHeight = 15
    out.arrowWidth = 14
    out.arrowPadding = 10 // padding between arrow and axis label

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()
        const lgg = out.lgg
        const numberOfClasses = out.map.numberOfClasses()
        const sz = out.squareSize / numberOfClasses
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding

        // Horizontal shift to move everything right (adjust this value as needed)
        const horizontalOffset = out.axisTitleFontSize + out.arrowPadding // Adjust this value to move the whole legend to the right

        // Remove previous content
        lgg.selectAll('*').remove()

        // Draw background box
        out.makeBackgroundBox()

        // Draw title
        if (out.title) {
            lgg.append('text')
                .attr('class', 'em-legend-title')
                .attr('x', xc + horizontalOffset)
                .attr('y', out.boxPadding + out.titleFontSize)
                .text(out.title)
        }

        // The vertical position of the legend element
        let y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0)

        // Square group with horizontal offset
        const square = lgg
            .append('g')
            .attr('class', 'bivariate-squares-chart')
            .attr('transform', `translate(${out.boxPadding + horizontalOffset},${xc + y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`)

        const initialX = out.yAxisLabelsOffset.x

        // Draw rectangles
        for (let i = 0; i < numberOfClasses; i++) {
            for (let j = 0; j < numberOfClasses; j++) {
                const ecl1 = numberOfClasses - i - 1
                const ecl2 = numberOfClasses - j - 1
                const fill = out.map.classToFillStyle()(ecl1, ecl2)

                square
                    .append('rect')
                    .attr('class', 'em-bivariate-square')
                    .attr('x', initialX + (numberOfClasses - 1 - i) * sz)
                    .attr('y', j * sz)
                    .attr('width', sz)
                    .attr('height', sz)
                    .style('fill', fill)
                    .on('mouseover', function () {
                        highlightRegions(out.map, ecl1, ecl2)
                        if (out.map.insetTemplates_) {
                            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl1, ecl2)
                        }
                        select(this).raise() // raise legend square to avoid stroke issue
                    })
                    .on('mouseout', function () {
                        unhighlightRegions(out.map)
                        if (out.map.insetTemplates_) {
                            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, ecl1, ecl2)
                        }
                    })
            }
        }

        // set breaks if user hasnt defined them but has enabled them
        if (!out.breaks1 && !out.breaks2 && out.showBreaks) {
            // Get quantiles for the first variable (X axis) and truncate to one decimal place
            out.breaks1 = map.classifier1_.quantiles().map((value) => parseFloat(value.toFixed(0)))

            // Get quantiles for the second variable (Y axis) and truncate to one decimal place
            out.breaks2 = map.classifier2_.quantiles().map((value) => parseFloat(value.toFixed(0)))
        }

        // Draw breaks labels 1 (X axis)
        if (out.breaks1) {
            for (let i = 0; i < out.breaks1.length; i++) {
                const x = initialX + sz * (i + 1)
                const y = out.squareSize + getFontSizeFromClass('em-bivariate-tick-label')

                square
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.xAxisLabelsOffset.x)
                    .attr('y', y + out.xAxisLabelsOffset.y)
                    .text(out.breaks1[i])

                square
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x + out.xAxisLabelsOffset.x)
                    .attr('x2', x + out.xAxisLabelsOffset.x)
                    .attr('y1', out.squareSize)
                    .attr('y2', out.squareSize + 5)
            }
        }

        // Draw breaks labels 2 (Y axis)
        if (out.breaks2) {
            for (let i = 0; i < out.breaks2.length; i++) {
                const x = initialX
                const y = sz * (i + 2) - sz

                square
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.yAxisLabelsOffset.y)
                    .attr('y', y - out.yAxisLabelsOffset.x)
                    .text([...out.breaks2].reverse()[i])
                    .attr('text-anchor', 'middle')
                    .attr('transform', `rotate(-90, ${x}, ${y})`)

                square
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x)
                    .attr('x2', x - 5)
                    .attr('y1', y)
                    .attr('y2', y)
            }
        }

        // Append X axis arrow
        let xAxisArrowY = out.squareSize + out.arrowHeight + out.xAxisLabelsOffset.y
        if (out.showBreaks || (out.breaks1 && out.breaks2)) xAxisArrowY += getFontSizeFromClass('em-bivariate-tick-label') / 1.5 // move over for tick labels

        square
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [initialX, xAxisArrowY],
                    [initialX + out.squareSize, xAxisArrowY],
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')

        // Append Y axis arrow
        let yAxisArrowX = -out.arrowHeight + out.yAxisLabelsOffset.x
        if (out.showBreaks || (out.breaks1 && out.breaks2)) yAxisArrowX -= out.labelFontSize / 2 // move over for tick labels

        square
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [yAxisArrowX, out.squareSize],
                    [yAxisArrowX, 0],
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')

        // X axis title
        square
            .append('text')
            .attr('class', 'em-bivariate-axis-title')
            .attr('x', initialX + out.xAxisLabelsOffset.x)
            .attr('y', xAxisArrowY + out.arrowPadding)
            .text(out.label1)
            .attr('dominant-baseline', 'hanging')
            .attr('alignment-baseline', 'hanging')

        // Y axis title
        square
            .append('text')
            .attr('class', 'em-bivariate-axis-title')
            .attr('x', -out.squareSize)
            .attr('y', yAxisArrowX - out.arrowPadding + (out.rotation == -45 ? -4 : -1))
            .text(out.label2)
            .style('transform', out.rotation < 0 ? 'translate(-51px, 95px) rotate(90deg)' : 'rotate(-90deg)')

        // Frame
        square
            .append('rect')
            .attr('class', 'em-bivariate-frame')
            .attr('x', initialX)
            .attr('y', 0)
            .attr('width', out.squareSize)
            .attr('height', out.squareSize)
            .attr('stroke-width', 0.7)

        // Arrow defs
        square
            .append('defs')
            .append('marker')
            .attr('viewBox', `0 0 ${out.arrowWidth} ${out.arrowHeight}`)
            .attr('id', 'arrowhead')
            .attr('refX', 0)
            .attr('refY', 5)
            .attr('markerWidth', out.arrowWidth)
            .attr('markerHeight', out.arrowHeight)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 5 5 L 0 10')
            .attr('marker-units', 'strokeWidth')

        // 'No data' legend box
        if (out.noData) {
            const noDataYOffset =
                out.rotation === 0 ? out.noDataYOffset + out.squareSize / out.map.numberOfClasses_ + out.arrowHeight / 2 : out.noDataYOffset

            y = out.rotation === 0 ? y + out.squareSize + noDataYOffset : y + 1.4142 * out.squareSize + out.boxPadding * 2 + noDataYOffset

            lgg.append('rect')
                .attr('class', 'em-bivariate-nodata')
                .attr('x', out.boxPadding + out.noDataShapeWidth / 2)
                .attr('y', y + (out.rotation == 0 ? 0 : -10))
                .attr('width', out.noDataShapeWidth)
                .attr('height', out.noDataShapeHeight)
                .style('fill', out.map.noDataFillStyle())
                .on('mouseover', function () {
                    const regions = out.map.nutsLevel_ == 'mixed' ? selectAll('#em-nutsrg') : select('#em-nutsrg')
                    const sel = regions.selectAll("[nd='nd']")
                    sel.style('fill', 'red')
                })
                .on('mouseout', function () {
                    const nRg = out.map.nutsLevel_ == 'mixed' ? selectAll('#em-nutsrg') : select('#em-nutsrg')
                    const sel = nRg.selectAll("[nd='nd']")
                    sel.style('fill', function () {
                        return select(this).attr('fill___')
                    })
                    select(this).style('fill', out.map.noDataFillStyle())
                })
            lgg.append('text')
                .attr('class', 'em-bivariate-nodata-label')
                .attr('x', out.boxPadding + out.noDataShapeWidth + (out.noDataShapeWidth / 2 + 5))
                .attr('y', y + out.noDataShapeHeight * 0.5 + 1 + (out.rotation == 0 ? 0 : -10))
                .text(out.noDataText)
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl1, ecl2) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll(`[ecl1]`)

        // Set all regions to white
        allRegions.style('fill', 'white')

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = allRegions.filter(`[ecl1='${ecl1}']`).filter(`[ecl2='${ecl2}']`)
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll(`[ecl1]`)

        // Restore each region's original color from the fill___ attribute
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
