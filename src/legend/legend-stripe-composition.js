import { select } from 'd3-selection'
import * as Legend from './legend'
import { executeForAllInsets } from '../core/utils'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //colour legend config (aligned with pie chart color legend)
    out.colorLegend = {
        title: null,
        titlePadding: 10,
        marginTop: 33,
        labelOffsets: { x: 5, y: 5 },
        shapeWidth: 25,
        shapeHeight: 20,
        shapePadding: 1,
        noData: true,
        noDataText: 'No data',
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (key == 'colorLegend') {
                if (config.colorLegend === false) {
                    out.colorLegend = false
                    continue
                }
                for (let p in out.colorLegend) {
                    if (config.colorLegend[p] !== undefined) {
                        out.colorLegend[p] = config.colorLegend[p]
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

        const lgg = out.lgg

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        if (out.colorLegend) buildColorLegend(out, baseX, baseY)

        //set legend box dimensions
        out.setBoxDimension()
    }

    function buildColorLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.colorLegend

        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-pie-color-legend').attr('transform', `translate(${baseX},${baseY})`)

        if (config.title) {
            out._colorLegendContainer
                .append('text')
                .attr('id', 'em-color-legend-title')
                .attr('class', 'em-color-legend-title')
                .attr('x', 0)
                .attr('y', out.titleFontSize)
                .text(config.title)
        }

        let i = 0
        const scs = map.catColors()
        for (let code in scs) {
            const y = out.colorLegend.titlePadding + (config.title ? out.titleFontSize : 0) + i * (config.shapeHeight + config.shapePadding)

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
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId_, highlightRegions, code)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId_, unhighlightRegions)
                    }
                })

            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', config.shapeWidth + config.labelOffsets.x)
                .attr('y', y + config.shapeHeight * 0.5)
                .attr('dy', '0.35em')
                .text(map.catLabels()[code] || code)

            i++
        }

        if (config.noData) {
            const y =
                out.colorLegend.marginTop +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)

            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding},${y})`)
            out.appendNoDataLegend(container, config.noDataText || out.noDataText, highlightRegions, unhighlightRegions)
        }
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
