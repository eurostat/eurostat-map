import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from './legend'
import { executeForAllInsets, getLegendRegionsSelector } from '../core/utils'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const m = out.map
        const svgMap = m.svg()
        const lgg = out.lgg

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        //draw legend elements for classes: rectangle + label
        let i = 0
        const scs = m.catColors()
        for (let code in scs) {
            //the vertical position of the legend element
            const y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0) + i * (out.shapeHeight + out.shapePadding)

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
                    const sel = select(this)
                    sel.raise()
                    highlightRegions(out.map, code)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, code)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions)
                    }
                })

            //label
            lgg.append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffsets.x)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dy', '0.35em') // ~vertical centering
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
            const y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0) + i * (out.shapeHeight + out.shapePadding)

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
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffsets.x)
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

    function highlightRegions(map, code) {
        const allRegions = map.svg_.selectAll('pattern').selectAll('rect')

        // Save original colors if not already stored
        allRegions.each(function () {
            const el = select(this)
            if (!el.attr('data-original-fill')) {
                el.attr('data-original-fill', el.style('fill'))
            }
            el.style('fill', 'white') // Set all regions to white
        })

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = map.svg_.selectAll('pattern').selectAll("rect[code='" + code + "']")
        selectedRegions.each(function () {
            const el = select(this)
            el.style('fill', el.attr('data-original-fill')) // Restore original fill
        })
    }

    function unhighlightRegions(map) {
        const allRegions = map.svg_.selectAll('pattern').selectAll('rect')

        // Restore each region's original color from the stored attribute
        allRegions.each(function () {
            const el = select(this)
            const originalFill = el.attr('data-original-fill')
            if (originalFill) {
                el.style('fill', originalFill)
            }
        })
    }

    return out
}
