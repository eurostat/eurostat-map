import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from './legend'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //the width of the legend box elements
    out.shapeWidth = 25
    //the height of the legend box elements
    out.shapeHeight = 20
    //the distance between consecutive legend box elements
    out.shapePadding = 5
    //the font size of the legend label
    out.labelFontSize = 12
    //the distance between the legend box elements to the corresponding text label
    out.labelOffset = 5
    //show no data
    out.noData = true
    //no data label text
    out.noDataText = 'No data'

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        const m = out.map
        const svgMap = m.svg()
        const lgg = out.lgg

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //draw title
        if (out.title) {
            lgg.append('text')
                .attr('class', 'em-legnd-title')
                .attr('x', out.boxPadding)
                .attr('y', out.boxPadding + out.titleFontSize)
                .text(out.title)
        }

        //draw legend elements for classes: rectangle + label
        let i = 0
        const scs = m.catColors()
        for (let code in scs) {
            //the vertical position of the legend element
            const y =
                out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0) + i * (out.shapeHeight + out.shapePadding)

            //the color
            const col = m.catColors()[code] || 'lightgray'

            //rectangle
            lgg.append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', scs[code])
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5)
                .on('mouseover', function () {
                    // TODO: change this to estat logic of making all other classes transparent?
                    svgMap
                        .selectAll('pattern')
                        .selectAll("rect[code='" + code + "']")
                        .style('fill', m.hoverColor())
                    select(this).style('fill', m.hoverColor())
                })
                .on('mouseout', function () {
                    svgMap
                        .selectAll('pattern')
                        .selectAll("rect[code='" + code + "']")
                        .style('fill', col)
                    select(this).style('fill', col)
                })

            //label
            lgg.append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .text(m.catLabels()[code] || code)
                .on('mouseover', function () {
                    svgMap
                        .selectAll('pattern')
                        .selectAll("rect[code='" + code + "']")
                        .style('fill', m.hoverColor())
                })
                .on('mouseout', function () {
                    const col = m.catColors()[code] || 'lightgray'
                    svgMap
                        .selectAll('pattern')
                        .selectAll("rect[code='" + code + "']")
                        .style('fill', col)
                })

            i++
        }

        //'no data' legend box
        if (out.noData) {
            const y =
                out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0) + i * (out.shapeHeight + out.shapePadding)

            //rectangle
            lgg.append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', m.noDataFillStyle())
                .on('mouseover', function () {
                    svgMap.select('#em-nutsrg').selectAll("[nd='nd']").style('fill', m.hoverColor())
                    select(this).style('fill', m.hoverColor())
                })
                .on('mouseout', function () {
                    const sel = svgMap
                        .select('#em-nutsrg')
                        .selectAll("[nd='nd']")
                        .style('fill', function (d) {
                            m.noDataFillStyle()
                        })
                    select(this).style('fill', m.noDataFillStyle())
                })

            //'no data' label
            lgg.append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .text(out.noDataText)
                .on('mouseover', function () {
                    svgMap.select('#em-nutsrg').selectAll("[nd='nd']").style('fill', m.hoverColor())
                })
                .on('mouseout', function () {
                    const sel = svgMap
                        .select('#em-nutsrg')
                        .selectAll("[nd='nd']")
                        .style('fill', function (d) {
                            m.noDataFillStyle()
                        })
                })
        }

        //set legend box dimensions
        out.setBoxDimension()
    }

    return out
}
