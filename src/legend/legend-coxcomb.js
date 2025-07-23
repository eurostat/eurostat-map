import { format } from 'd3-format'
import { select } from 'd3-selection'
import { max } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'
import { arc } from 'd3'

/**
 * Legend for Coxcomb (polar area) maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    out.sizeLegend = {
        title: null,
        titlePadding: 30,
        values: null,
    }

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

    out.monthLegend = {
        title: null,
        marginTop: 60,
    }

    out._sizeLegendHeight = 0

    if (config) {
        for (let key in config) {
            if (key === 'colorLegend' || key === 'sizeLegend') {
                for (let p in out[key]) {
                    if (config[key][p] !== undefined) out[key][p] = config[key][p]
                }
            } else {
                out[key] = config[key]
            }
        }
    }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const lgg = out.lgg
        lgg.selectAll('*').remove()

        out.makeBackgroundBox()

        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        const baseY = out.getBaseY()
        const baseX = out.getBaseX()

        if (map.classifierSize_) {
            drawSizeLegend(out, baseX, baseY)
        }

        buildColorLegend(out, baseX, baseY)

        buildCoxcombMonthLegend(out, baseX, baseY)

        out.setBoxDimension()
    }

    function drawSizeLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.sizeLegend
        out._sizeLegendContainer = out.lgg.append('g').attr('class', 'em-coxcomb-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)

        const domain = map.classifierSize_.domain()

        if (!config.values) {
            config.values = [Math.floor(domain[1]), Math.floor(domain[0])]
        }

        const maxSize = map.classifierSize_(max(config.values))

        if (!config.title && out.title) config.title = out.title
        let titleHeight = 0
        if (config.title) {
            out._sizeLegendContainer.append('text').attr('class', 'em-size-legend-title').attr('x', 0).attr('y', out.titleFontSize).text(config.title)
            titleHeight = out.titleFontSize + config.titlePadding
        }

        const y = titleHeight + out.sizeLegend.titlePadding + maxSize * 2

        const legendItems = out._sizeLegendContainer
            .selectAll('g')
            .data(config.values)
            .join('g')
            .attr('class', 'em-coxcomb-size-legend-item')
            .attr('transform', `translate(${maxSize + out.boxPadding}, ${y})`)

        legendItems
            .append('circle')
            .attr('class', 'em-coxcomb-size-legend-circle')
            .style('fill', 'none')
            .attr('stroke', 'black')
            .attr('cy', (d) => -map.classifierSize_(d))
            .attr('r', map.classifierSize_)

        legendItems
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('y', (d) => -2 * map.classifierSize_(d) - out.labelFontSize - 2)
            .attr('x', 30)
            .attr('dy', '1.2em')
            .attr('xml:space', 'preserve')
            .text((d) => d.toLocaleString('en').replace(/,/gi, ' '))

        legendItems
            .append('line')
            .attr('class', 'em-coxcomb-size-legend-line')
            .attr('x1', 2)
            .attr('x2', 30)
            .attr('y1', (d) => -2 * map.classifierSize_(d))
            .attr('y2', (d) => -2 * map.classifierSize_(d))

        out._sizeLegendHeight = y
        return out
    }

    function buildColorLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.colorLegend
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-coxcomb-color-legend')

        if (out._sizeLegendContainer) {
            const sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            out._colorLegendContainer.attr('transform', `translate(${baseX},${sizeLegendHeight + out.colorLegend.marginTop})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
        }

        if (config.title) {
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-color-legend-title')
                .attr('x', 0)
                .attr('y', out.titleFontSize)
                .text(config.title)
        }

        let i = 0
        const scs = map.catColors()
        for (let code in scs) {
            const y = out.colorLegend.titlePadding + (config.title ? out.titleFontSize : 0) + i * (config.shapeHeight + config.shapePadding)
            const col = map.catColors()[code] || 'lightgray'

            out._colorLegendContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', 0)
                .attr('y', y)
                .attr('width', config.shapeWidth)
                .attr('height', config.shapeHeight)
                .style('fill', col)
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
                out._sizeLegendHeight +
                out.colorLegend.marginTop +
                out.boxPadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * (config.shapeHeight + config.shapePadding)
            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding},${y})`)
            out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
        }
    }

    /**
     * Adds a Coxcomb month-segment legend showing how wedges represent months.
     * Labels each segment (e.g., Jan, Feb) around the circle.
     */
    function buildCoxcombMonthLegend(out, baseX, baseY) {
        const months = out.map._coxcombMonths || []
        if (!months.length) return

        let y = baseY + (out.monthLegend?.marginTop || 0)
        let x = baseX

        if (out._sizeLegendContainer) {
            y += out._sizeLegendContainer.node().getBBox().height
        }
        if (out._colorLegendContainer) {
            y += out._colorLegendContainer.node().getBBox().height
            y += out.colorLegend.marginTop || 0
        }

        const radius = 40
        const labelOffset = 18 // extra spacing for labels
        const angleStep = (2 * Math.PI) / months.length

        const colorLegendWidth = out._colorLegendContainer?.node()?.getBBox().width || 0
        const centerX = x + colorLegendWidth / 2 + labelOffset

        const container = out.lgg
            .append('g')
            .attr('class', 'em-coxcomb-month-legend')
            .attr('transform', `translate(${centerX}, ${y + radius})`)

        const arcGen = arc()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle((d, i) => i * angleStep)
            .endAngle((d, i) => (i + 1) * angleStep)

        // Draw faint wedges
        container
            .selectAll('path')
            .data(months)
            .join('path')
            .attr('d', (d, i) => arcGen(d, i))
            .attr('fill', '#ccc')
            .attr('stroke', '#444')
            .attr('stroke-width', 0.3)
            .attr('opacity', 0.4)

        const labelRadius = radius + labelOffset
        const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        // Place horizontal labels around the circle (no flipping)
        container
            .selectAll('text.month-label')
            .data(months)
            .join('text')
            .attr('class', 'em-legend-label month-label')
            .attr('x', (d, i) => Math.sin(i * angleStep + angleStep / 2) * labelRadius)
            .attr('y', (d, i) => -Math.cos(i * angleStep + angleStep / 2) * labelRadius)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text((d) => {
                const monthNum = d.toString().slice(5, 7)
                return monthAbbr[parseInt(monthNum, 10) - 1] || d
            })
    }

    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.coxcombchart').selectAll('path[code]')
        allSegments.style('fill', 'white')
        const selected = allSegments.filter("path[code='" + code + "']")
        selected.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    function unhighlightRegions(map) {
        const allSegments = map.svg_.selectAll('.coxcombchart').selectAll('path[code]')
        allSegments.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
