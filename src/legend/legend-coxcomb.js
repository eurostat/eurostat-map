import { format } from 'd3-format'
import { select } from 'd3-selection'
import { max } from 'd3-array'
import * as Legend from './legend'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'
import { arc } from 'd3-shape'
import { drawCircleSizeLegend } from './legend-circle-size'

/**
 * Legend for Coxcomb (polar area) maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    out.sizeLegend = {
        title: null,
        titlePadding: 15,
        values: null,
    }

    out.colorLegend = {
        title: null,
        titlePadding: 15,
        marginTop: 23,
        labelOffsets: { x: 5, y: 5 },
        shapeWidth: 25,
        shapeHeight: 20,
        shapePadding: 1,
        noData: true,
        noDataText: 'No data',
    }

    out.timeLegend = {
        title: null,
        marginTop: 20,
    }

    out._sizeLegendHeight = 0

    if (config) {
        for (let key in config) {
            if (key === 'colorLegend' || key === 'sizeLegend' || key === 'timeLegend') {
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
            const container = lgg.append('g').attr('class', 'em-coxcomb-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)
            out._sizeLegendContainer = container
            drawCircleSizeLegend(out, container, out.sizeLegend.values, out.map.classifierSize_, out.sizeLegend.title, out.sizeLegend.titlePadding)
        }

        buildColorLegend(out, baseX, baseY)

        buildCoxcombTimeLegend(out, baseX, baseY)

        out.setBoxDimension()
    }

    function buildColorLegend(out, baseX, baseY) {
        const map = out.map
        const config = out.colorLegend
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-coxcomb-color-legend')

        let sizeLegendHeight = 0
        if (out._sizeLegendContainer) {
            sizeLegendHeight = out._sizeLegendContainer.node().getBBox().height
            out._colorLegendContainer.attr('transform', `translate(${baseX},${sizeLegendHeight + out.colorLegend.marginTop})`)
        } else {
            out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
        }

        if (config.title) {
            out._colorLegendContainer
                .append('text')
                .attr('class', 'em-color-legend-title')
                .attr('id', 'em-color-legend-title')
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
                sizeLegendHeight +
                out.colorLegend.marginTop +
                out.colorLegend.titlePadding +
                (config.title ? out.titleFontSize + out.boxPadding : 0) +
                i * config.shapeHeight +
                i * config.shapePadding
            const container = out.lgg.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${out.boxPadding},${y})`)
            out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
        }
    }

    /**
     * Adds a Coxcomb month-segment legend showing how wedges represent months.
     * Labels each segment (e.g., Jan, Feb) around the circle.
     */
    function buildCoxcombTimeLegend(out, baseX, baseY) {
        const times = out.map._coxTimes || []
        const radius = 40

        if (!times.length) return

        let y = baseY
        let x = baseX

        if (out._sizeLegendContainer) {
            y += out._sizeLegendContainer.node().getBBox().height
        }
        if (out._colorLegendContainer) {
            y += out._colorLegendContainer.node().getBBox().height
            y += out.colorLegend.marginTop || 0
        }

        y += out.timeLegend?.marginTop || 0
        y += radius

        const labelOffset = 18 // extra spacing for labels
        const angleStep = (2 * Math.PI) / times.length

        const colorLegendWidth = out._colorLegendContainer?.node()?.getBBox().width || 0
        const centerX = x + colorLegendWidth / 2 + labelOffset

        const container = out.lgg
            .append('g')
            .attr('class', 'em-coxcomb-time-legend')
            .attr('transform', `translate(${centerX}, ${y + radius})`)

        const arcGen = arc()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle((d, i) => i * angleStep)
            .endAngle((d, i) => (i + 1) * angleStep)

        // Draw faint wedges
        container
            .selectAll('path')
            .data(times)
            .join('path')
            .attr('d', (d, i) => arcGen(d, i))
            .attr('fill', '#ccc')
            .attr('class', 'em-legend-month-segment')

        const labelRadius = radius + labelOffset
        const timeAbbr = map._coxTimeLabels
            ? map._coxTimeLabels
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        // Place horizontal labels around the circle (no flipping)
        container
            .selectAll('text.month-label')
            .data(times)
            .join('text')
            .attr('class', 'em-legend-label em-month-label')
            .attr('x', (d, i) => Math.sin(i * angleStep + angleStep / 2) * labelRadius)
            .attr('y', (d, i) => -Math.cos(i * angleStep + angleStep / 2) * labelRadius)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text((d, i) => {
                return timeAbbr[i] || d
            })

        // Highlight behavior for month hover
        container
            .selectAll('path')
            .on('mouseover', function (event, time) {
                const hoveredTime = time // "YYYY-MM" format
                const mapSvg = out.map.svg_ || out.map.svg()
                const allSegments = mapSvg.selectAll('.em-coxcomb-chart path')

                allSegments.style('opacity', (d) => {
                    return d.data.month === hoveredTime ? 1 : 0
                })
                select(this).style('stroke-width', 3).style('opacity', 0.8).raise()
            })
            .on('mouseout', function () {
                const mapSvg = out.map.svg_ || out.map.svg()
                mapSvg.selectAll('.em-coxcomb-chart path').style('opacity', 1)
                select(this).style('stroke-width', 0.5).style('opacity', 0.4).raise()
            })
    }

    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.em-coxcomb-chart').selectAll('path[code]')
        allSegments.style('fill', 'white')
        const selected = allSegments.filter("path[code='" + code + "']")
        selected.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    function unhighlightRegions(map) {
        const allSegments = map.svg_.selectAll('.em-coxcomb-chart').selectAll('path[code]')
        allSegments.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    return out
}
