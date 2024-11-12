import { select, selectAll } from 'd3-selection'
import * as lg from '../core/legend'
import { line } from 'd3-shape'

/**
 * A legend for choropleth-bivariate maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = lg.legend(map)

    //size
    out.squareSize = 100

    //orientation
    out.rotation = 0

    //labels
    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'
    //the font size of the legend label
    out.labelFontSize = 12

    //breaks
    out.breaks1 = undefined
    out.breaks2 = undefined

    //axis
    out.yAxisLabelsOffset = { x: 5, y: 0 }
    out.xAxisLabelsOffset = { x: 0, y: 5 }

    //show no data
    out.noData = true
    //show no data
    out.noDataShapeHeight = 15
    out.noDataShapeWidth = 15

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

    //distance between axis and axis title / arrow
    out.axisPadding = { x: 0, y: 0 }

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        const m = out.map
        const lgg = out.lgg
        const clnb = m.clnb()
        const sz = out.squareSize / clnb
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //draw title
        if (out.title)
            lgg.append('text')
                .attr('class', 'eurostat-map-legend-title')
                .attr('x', xc)
                .attr('y', out.boxPadding + out.titleFontSize)
                .text(out.title)
                .style('text-anchor', 'middle')
                .style('font-size', out.titleFontSize + 'px')
                .style('font-weight', out.titleFontWeight)
                .style('font-family', m.fontFamily_)
                .style('fill', out.fontFill)

        //set font family
        lgg.style('font-family', m.fontFamily_)

        //the vertical position of the legend element
        let y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0)

        //square group
        const square = lgg
            .append('g')
            .attr('class', 'bivariate-squares-chart')
            .attr(
                'transform',
                'translate(' +
                    out.boxPadding +
                    ',' +
                    (xc + y) +
                    ') rotate(' +
                    out.rotation +
                    ') translate(' +
                    out.boxPadding +
                    ',' +
                    0 +
                    ')'
            )

        const initialX = out.yAxisLabelsOffset.x

        for (let i = 0; i < clnb; i++) {
            for (let j = 0; j < clnb; j++) {
                //the class numbers, depending on order
                const ecl1 = clnb - i - 1
                const ecl2 = clnb - j - 1
                const fill = m.classToFillStyle()(ecl1, ecl2)

                //draw rectangle
                square
                    .append('rect')
                    .attr('class', 'bivariate-square')
                    .attr('x', initialX + (clnb - 1 - i) * sz)
                    .attr('y', j * sz)
                    .attr('width', sz)
                    .attr('height', sz)
                    .attr('fill', fill)
                    .on('mouseover', function () {
                        const regions = out.map.nutsLvl_ == 'mixed' ? selectAll('#g_nutsrg') : select('#g_nutsrg')
                        const sel = regions.selectAll("[ecl1='" + ecl1 + "']").filter("[ecl2='" + ecl2 + "']")
                        sel.style('fill', 'red') //transparent
                        sel.attr('fill___', function () {
                            select(this).attr('fill')
                        })
                    })
                    .on('mouseout', function () {
                        const nRg = out.map.nutsLvl_ == 'mixed' ? selectAll('#g_nutsrg') : select('#g_nutsrg')
                        const sel = nRg.selectAll("[ecl1='" + ecl1 + "']").filter("[ecl2='" + ecl2 + "']")
                        sel.style('fill', function () {
                            select(this).attr('fill___')
                        })
                        select(this).style('fill', fill)
                    })
            }
        }

        //breaks labels 1 (x axis)
        if (out.breaks1) {
            for (let i = 0; i < out.breaks1.length; i++) {
                let x = initialX + sz * (i + 1)
                let y = out.squareSize + out.labelFontSize
                // Append labels
                square
                    .append('text')
                    .attr('class', 'bivariate-break1-label')
                    .attr('x', x + out.xAxisLabelsOffset.x)
                    .attr('y', y + out.xAxisLabelsOffset.y)
                    .text(out.breaks1[i])
                    .attr('text-anchor', 'middle')
                    .style('font-size', out.labelFontSize + 'px')
                    .style('font-family', m.fontFamily_)
                    .style('fill', out.fontFill)

                // Append ticks
                square
                    .append('line')
                    .attr('class', 'bivariate-break1-tick')
                    .attr('x1', x + out.xAxisLabelsOffset.x)
                    .attr('x2', x + out.xAxisLabelsOffset.x)
                    .attr('y1', out.squareSize) // Starting point of the tick
                    .attr('y2', out.squareSize + 5) // Ending point of the tick (5 pixels above the starting point)
                    .attr('stroke', out.fontFill) // Same color as the labels
                    .attr('stroke-width', 1) // Width of the tick line
            }
        }

        //breaks labels 2 (y axis)
        if (out.breaks2) {
            for (let i = 0; i < out.breaks2.length; i++) {
                let x = initialX
                let y = sz * (i + 2) - sz

                // Append labels
                square
                    .append('text')
                    .attr('class', 'bivariate-break2-label')
                    .attr('x', x + out.yAxisLabelsOffset.y)
                    .attr('y', y - out.yAxisLabelsOffset.x - 2)
                    .text([...out.breaks2].reverse()[i])
                    .attr('text-anchor', 'middle')
                    .style('font-size', out.labelFontSize + 'px')
                    .style('font-family', m.fontFamily_)
                    .style('fill', out.fontFill)
                    .attr('transform', `rotate(-90, ${x}, ${y})`) // Apply rotation

                // Append ticks
                square
                    .append('line')
                    .attr('class', 'bivariate-break2-tick')
                    .attr('x1', x) // Starting point of the tick (5 pixels to the left)
                    .attr('x2', x - 5) // Ending point of the tick (aligned with label x position)
                    .attr('y1', y) // Same y position as the label
                    .attr('y2', y) // Same y position as the label
                    .attr('stroke', out.fontFill) // Same color as the labels
                    .attr('stroke-width', 1) // Width of the tick line
            }
        }

        // append X axis arrow
        let xAxisArrowY = out.squareSize + out.arrowHeight + out.xAxisLabelsOffset.y + out.axisPadding.y
        square
            .append('path')
            .attr('class', 'bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [initialX, xAxisArrowY], // origin
                    [initialX + out.squareSize, xAxisArrowY], // destination
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')

        // X axis title
        square
            .append('text')
            .attr('class', 'bivariate-axis-title')
            .attr('x', initialX + out.xAxisLabelsOffset.x)
            .attr('y', xAxisArrowY + out.arrowPadding)
            .text(out.label1)
            .attr('dominant-baseline', 'hanging')
            .attr('alignment-baseline', 'hanging')
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)

        // append Y axis arrow
        let yAxisArrowX = -out.labelFontSize + 5
        square
            .append('path')
            .attr('class', 'bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [yAxisArrowX, out.squareSize],
                    [yAxisArrowX, 0],
                ])
            )
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrowhead)')

        // y axis title
        square
            .append('text')
            .attr('class', 'bivariate-axis-title')
            .attr('x', -out.squareSize)
            .attr('y', -out.labelFontSize)
            .attr('x', out.rotation == 0 ? -out.squareSize : -out.labelFontSize + out.arrowWidth / 2) //with roation 0, acts as Y axis
            .attr('y', out.rotation == 0 ? -out.labelFontSize : out.labelFontSize + out.arrowHeight / 2)
            .attr(
                'transform',
                out.rotation == 0 ? 'rotate(-90) translate(0,0)' : 'rotate(90) translate(' + out.labelFontSize / 2 + ',0)'
            )
            .text(out.label2)
            .style('font-size', out.labelFontSize + 'px')
            .style('font-family', m.fontFamily_)
            .style('fill', out.fontFill)

        //frame
        square
            .append('rect')
            .attr('class', 'bivariate-frame')
            .attr('x', initialX)
            .attr('y', 0)
            .attr('width', out.squareSize)
            .attr('height', out.squareSize)
            .attr('fill', 'none')
            .style('stroke', 'black')
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
            .attr('d', 'M 0 0 L 5 5 L 0 10') //M2,2 L10,6 L2,10 L6,6 L2,2
            .attr('marker-units', 'strokeWidth')

        //'no data' legend box
        if (out.noData) {
            // add extra padding when rotation is 0
            let noDataYOffset =
                out.rotation == 0 ? out.noDataYOffset + out.squareSize / out.map.clnb_ + out.arrowHeight / 2 : out.noDataYOffset

            y =
                out.rotation == 0
                    ? y + out.squareSize + noDataYOffset
                    : y + 1.4142 * out.squareSize + out.boxPadding * 2 + noDataYOffset

            //rectangle
            lgg.append('rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.noDataShapeWidth)
                .attr('height', out.noDataShapeHeight)
                .attr('fill', m.noDataFillStyle())
                .attr('stroke', 'black')
                .attr('stroke-width', 0.7)
                .on('mouseover', function () {
                    const regions = out.map.nutsLvl_ == 'mixed' ? selectAll('#g_nutsrg') : select('#g_nutsrg')
                    const sel = regions.selectAll("[nd='nd']")
                    sel.style('fill', 'red') //transparent
                    sel.attr('fill___', function (d) {
                        select(this).attr('fill')
                    })
                })
                .on('mouseout', function () {
                    const nRg = out.map.nutsLvl_ == 'mixed' ? selectAll('#g_nutsrg') : select('#g_nutsrg')
                    const sel = nRg.selectAll("[nd='nd']")
                    sel.style('fill', function (d) {
                        select(this).attr('fill___')
                    })
                    select(this).style('fill', m.noDataFillStyle())
                })
            //'no data' label
            lgg.append('text')
                .attr('x', out.boxPadding + out.noDataShapeWidth + 5)
                .attr('y', y + out.noDataShapeHeight * 0.5 + 1)
                .text(out.noDataText)
                .style('font-size', out.labelFontSize + 'px')
                .style('font-family', m.fontFamily_)
                .style('fill', out.fontFill)
                .style('dominant-baseline', 'middle')
        }

        //set legend box dimensions
        out.setBoxDimension()
    }

    return out
}
