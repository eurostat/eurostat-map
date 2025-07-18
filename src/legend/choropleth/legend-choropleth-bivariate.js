import { select, selectAll } from 'd3-selection'
import * as Legend from '../legend'
import { line } from 'd3-shape'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../../core/utils'

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
    out.tickLength = 5 // length of the ticks

    //axis
    out.yAxisLabelsOffset = { x: 0, y: 0 }
    out.xAxisLabelsOffset = { x: 0, y: 0 }

    //axis titles
    out.yAxisTitleOffset = { x: 0, y: 0 }
    out.xAxisTitleOffset = { x: 0, y: 0 }

    //override padding
    out.boxPadding = out.labelFontSize

    //add extra distance between legend and no data item
    out.noDataYOffset = 30

    //arrows
    out.axisArrows = true // if set to true, arrows are drawn at the end of the axes
    out.arrowHeight = 15
    out.arrowWidth = 14
    out.arrowPadding = 10 // padding between arrow and axis label

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        // Horizontal shift to move everything right (adjust this value as needed)
        out._horizontalOffset = out.axisTitleFontSize + out.arrowPadding // Adjust this value to move the whole legend to the right

        // Remove previous content
        out.lgg.selectAll('*').remove()

        // Draw background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // The vertical position of the legend element
        out._y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0)

        // Square group with horizontal offset
        addSquares()

        // set breaks if user hasnt defined them but has enabled them
        // set breaks if user hasn't defined them but has enabled them
        if (!out.breaks1 && !out.breaks2 && out.showBreaks) {
            // Extract breaks from classifier1_
            const c1 = map.classifier1_
            if (typeof c1.quantiles === 'function') {
                out.breaks1 = c1.quantiles().map((d) => parseFloat(d.toFixed(0)))
            } else if (c1.domain) {
                out.breaks1 = c1.domain().map((d) => parseFloat(d.toFixed(0)))
            }

            // Extract breaks from classifier2_
            const c2 = map.classifier2_
            if (typeof c2.quantiles === 'function') {
                out.breaks2 = c2.quantiles().map((d) => parseFloat(d.toFixed(0)))
            } else if (c2.domain) {
                out.breaks2 = c2.domain().map((d) => parseFloat(d.toFixed(0)))
            }
        }

        // Draw breaks labels 1 (X axis)
        addBreakLabels()

        out._xAxisArrowY = 0
        out._yAxisArrowX = 0
        if (out.axisArrows) {
            addAxisArrows()
        }

        addAxisTitles()

        // Arrow defs
        out.lgg
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
            addNoDataElement()
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    function addNoDataElement() {
        const noDataYOffset =
            out.rotation === 0 ? out.noDataYOffset + out.squareSize / out.map.numberOfClasses_ + out.arrowHeight / 2 : out.noDataYOffset

        let noDataY =
            out.rotation === 0 ? out._y + out.squareSize + noDataYOffset : out._y + 1.4142 * out.squareSize + out.boxPadding * 2 + noDataYOffset

        out.lgg
            .append('rect')
            .attr('class', 'em-bivariate-nodata')
            .attr('x', out.boxPadding + out.noDataShapeWidth / 2)
            .attr('y', noDataY + (out.rotation == 0 ? 0 : -10))
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
        out.lgg
            .append('text')
            .attr('class', 'em-bivariate-nodata-label')
            .attr('x', out.boxPadding + out.noDataShapeWidth + (out.noDataShapeWidth / 2 + 5))
            .attr('y', noDataY + out.noDataShapeHeight * 0.5 + 1 + (out.rotation == 0 ? 0 : -10))
            .text(out.noDataText)
    }

    function addSquares() {
        const lgg = out.lgg
        const numberOfClasses = out.map.numberOfClasses()
        const sz = out.squareSize / numberOfClasses
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        const square = lgg
            .append('g')
            .attr('class', 'bivariate-squares-chart')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

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

        // Frame
        square
            .append('rect')
            .attr('class', 'em-bivariate-frame')
            .attr('x', initialX)
            .attr('y', 0)
            .attr('width', out.squareSize)
            .attr('height', out.squareSize)
            .attr('stroke-width', 0.7)
    }

    function addBreakLabels() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0
        const numberOfClasses = out.map.numberOfClasses()
        const sz = out.squareSize / numberOfClasses

        // group with horizontal offset
        const breakLabels = out.lgg
            .append('g')
            .attr('class', 'bivariate-break-labels')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )
        if (out.breaks1) {
            for (let i = 0; i < out.breaks1.length; i++) {
                const x = initialX + sz * (i + 1)
                const y = out.squareSize + getFontSizeFromClass('em-bivariate-tick-label')

                breakLabels
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.xAxisLabelsOffset.x)
                    .attr('y', y + out.xAxisLabelsOffset.y)
                    .text(out.breaks1[i])

                breakLabels
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', out.squareSize)
                    .attr('y2', out.squareSize + out.tickLength)
            }
        }

        // Draw breaks labels 2 (Y axis)
        if (out.breaks2) {
            for (let i = 0; i < out.breaks2.length; i++) {
                const x = initialX
                const y = sz * (i + 2) - sz

                breakLabels
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.yAxisLabelsOffset.x)
                    .attr('y', y - out.yAxisLabelsOffset.y - (out.tickLength + 2))
                    .text([...out.breaks2].reverse()[i])
                    .attr('text-anchor', 'middle')
                    .attr('transform', `rotate(-90, ${x}, ${y})`)

                breakLabels
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x)
                    .attr('x2', x - out.tickLength)
                    .attr('y1', y)
                    .attr('y2', y)
            }
        }
    }

    function addAxisTitles() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        const axisTitles = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-titles')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        // X axis title
        let xAxisTitleY = out.squareSize + out.xAxisLabelsOffset.y + (out.axisArrows ? out.arrowPadding + out.arrowHeight : 7)
        let xAxisTitleX = initialX
        if (out.showBreaks || (out.breaks1 && out.breaks2)) xAxisTitleY += getFontSizeFromClass('em-bivariate-tick-label') // move over for tick labels
        if (out.xAxisTitleOffset) xAxisTitleY += out.xAxisTitleOffset.y
        if (out.xAxisTitleOffset) xAxisTitleX += out.xAxisTitleOffset.x
        axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-x')
            .attr('x', xAxisTitleX)
            .attr('y', xAxisTitleY)
            .text(out.label1)
            .attr('dominant-baseline', 'hanging')
            .attr('alignment-baseline', 'hanging')

        // Y axis title
        let yAxisTitleY = (out.axisArrows ? out._yAxisArrowX - out.arrowPadding : 7) + (out.rotation == -45 ? -4 : -10) // adjust for rotation
        if (out.showBreaks || (out.breaks1 && out.breaks2)) xAxisTitleY += getFontSizeFromClass('em-bivariate-tick-label') // move over for tick labels
        let yAxisTitleX = -out.squareSize
        //manual offsets
        if (out.yAxisTitleOffset) yAxisTitleY += out.yAxisTitleOffset.y
        if (out.yAxisTitleOffset) yAxisTitleX += out.yAxisTitleOffset.x
        axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-y')
            .attr('x', yAxisTitleX)
            .attr('y', yAxisTitleY)
            .text(out.label2)
            .style('transform', out.rotation < 0 ? `translate(${out.axisArrows ? -51 : -15}px, 95px) rotate(90deg)` : 'rotate(-90deg)')
    }

    function addAxisArrows() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        // group with horizontal offset
        const axisArrows = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-arrows')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        // Append X axis arrow
        out._xAxisArrowY = out.squareSize + out.tickLength + out.arrowPadding
        if (out.showBreaks || (out.breaks1 && out.breaks2)) out._xAxisArrowY += getFontSizeFromClass('em-bivariate-tick-label') / 1.5 // move over for tick labels

        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [initialX, out._xAxisArrowY],
                    [initialX + out.squareSize, out._xAxisArrowY],
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')

        // Append Y axis arrow
        out._yAxisArrowX = -out.tickLength - out.arrowPadding
        if (out.showBreaks || (out.breaks1 && out.breaks2)) out._yAxisArrowX -= out.labelFontSize / 2 // move over for tick labels

        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [out._yAxisArrowX, out.squareSize],
                    [out._yAxisArrowX, 0],
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')
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
