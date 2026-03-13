import { select } from 'd3-selection'
import * as Legend from './legend'
import { executeForAllInsets } from '../core/utils'
import { arc } from 'd3-shape'

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
        labels: null,
        labelFormatter: null,
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

        // Wedge size legend replaces circle size legend
        if (map.classifierChartSize_) {
            const container = lgg.append('g').attr('class', 'em-coxcomb-size-legend').attr('transform', `translate(${baseX}, ${baseY})`)
            out._sizeLegendContainer = container
            drawWedgeSizeLegend(
                out,
                container,
                out.sizeLegend.values,
                out.map.classifierChartSize_,
                out.sizeLegend.title,
                out.sizeLegend.titlePadding
            )
        }

        buildColorLegend(out, baseX, baseY)
        buildCoxcombTimeLegend(out, baseX, baseY)
        out.setBoxDimension()
    }

    function drawWedgeSizeLegend(out, container, values, sizeScale, title, titlePadding = 16) {
        let yOffset = 0

        if (title) {
            const titleFontSize = out.titleFontSize || 12
            yOffset += titleFontSize + (titlePadding || 0)
            container.append('text').attr('class', 'em-size-legend-title').attr('x', 0).attr('y', titleFontSize).text(title)
        }

        // Default values if none provided
        if (!values) {
            const globalMax = out.map._globalMonthlyMax || 1
            const globalMin = out.map._globalMonthlyMin || 0
            values = [globalMax, globalMin]
        }

        const labels = out.sizeLegend?.labels
        const labelFormatter =
            out.sizeLegend?.labelFormatter ||
            ((v) => {
                if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
                if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
                return String(v)
            })

        // All wedges share a fixed angle — one slice wide enough to read clearly
        const wedgeHalfAngle = Math.PI / 8
        const startAngle = -wedgeHalfAngle
        const endAngle = wedgeHalfAngle

        const arcGen = arc().innerRadius(0).startAngle(startAngle).endAngle(endAngle)

        const maxR = sizeScale(Math.max(...values))
        // Center horizontally: wedge points up, labels extend to the right
        const originX = maxR
        const originY = maxR + yOffset + 10

        const legendG = container.append('g').attr('class', 'em-wedge-size-legend').attr('transform', `translate(${originX}, ${originY})`)

        // Draw nested wedges largest first so smaller ones render on top
        const sorted = [...values].sort((a, b) => b - a)
        sorted.forEach((v) => {
            const r = sizeScale(v)
            legendG
                .append('path')
                .attr('class', 'em-legend-wedge')
                .attr('d', arcGen.outerRadius(r)())
                .attr('fill', '#bbb')
                .attr('stroke', 'white')
                .attr('stroke-width', 0.5)
                .attr('opacity', 0.85)
        })

        // Dashed lines and labels, using original values order for index alignment
        const labelX = maxR + 8 // right of the largest wedge
        values.forEach((v, i) => {
            const r = sizeScale(v)
            // tip of wedge at this radius, at the midpoint angle (pointing straight up = y:-r)
            const tipY = -r

            legendG
                .append('line')
                .style('stroke-dasharray', '2,2')
                .style('stroke', 'grey')
                .attr('x1', 2)
                .attr('y1', tipY)
                .attr('x2', labelX)
                .attr('y2', tipY)

            legendG
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', labelX + 3)
                .attr('y', tipY)
                .attr('dy', '0.35em')
                .text(labels?.[i] !== undefined ? labels[i] : labelFormatter(v))
        })

        // Center the whole group horizontally
        const bbox = legendG.node().getBBox()
        legendG.attr('transform', `translate(${-bbox.x}, ${originY})`)

        out._sizeLegendHeight = legendG.node().getBBox().height
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
        const scs = map.catColors_
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
                .text(map.catLabels_[code] || code)

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
     * Adds a Coxcomb time-segment legend showing how wedges represent periods of time.
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
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .attr('class', 'em-coxcomb-legend-time-segment')

        const labelRadius = radius + labelOffset
        const timeAbbr = map._coxTimeLabels
            ? map._coxTimeLabels
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        // Place horizontal labels around the circle (no flipping)
        container
            .selectAll('text.em-coxcomb-legend-time-label')
            .data(times)
            .join('text')
            .attr('class', 'em-legend-label em-coxcomb-legend-time-label')
            .attr('x', (d, i) => Math.sin(i * angleStep + angleStep / 2) * labelRadius)
            .attr('y', (d, i) => -Math.cos(i * angleStep + angleStep / 2) * labelRadius)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text((d, i) => {
                return timeAbbr[i] || d
            })

        // Highlight behavior for time hover
        // Cache and pre-group segments once
        const mapSvg = out.map.svg_ || out.map.svg()
        const segmentsByTime = new Map()
        let lastActive = null

        function getSegments(time) {
            if (!segmentsByTime.has(time)) {
                segmentsByTime.set(time, mapSvg.node().querySelectorAll(`.em-coxcomb-chart path[month="${time}"]`))
            }
            return segmentsByTime.get(time)
        }

        container.on('mouseleave', function () {
            if (lastActive !== null) {
                lastActive.forEach((el) => el.classList.remove('em-time-active'))
                lastActive = null
            }
            mapSvg.node().classList.remove('em-time-dimmed')
            container.selectAll('path').style('stroke', 'white').style('stroke-width', 0.5).style('opacity', 1)
        })

        container
            .selectAll('path')
            .on('mouseenter', function (event, time) {
                if (lastActive) lastActive.forEach((el) => el.classList.remove('em-time-active'))

                mapSvg.node().classList.add('em-time-dimmed')

                lastActive = getSegments(time)
                lastActive.forEach((el) => el.classList.add('em-time-active'))

                container.selectAll('path').style('opacity', 0.3).style('stroke', 'white').style('stroke-width', 0.5)
                select(this).style('stroke', '#333').style('stroke-width', 2).style('opacity', 1)
            })
            .on('mouseout', function () {
                select(this).style('stroke', 'white').style('stroke-width', 0.5).style('opacity', 1)
            })
    }

    function highlightRegions(map, code) {
        const allSegments = map.svg_.selectAll('.em-coxcomb-chart').selectAll('path[code]')

        // Store original colors before changing them
        allSegments.each(function () {
            const sel = select(this)
            if (!sel.attr('fill___')) {
                sel.attr('fill___', sel.style('fill'))
            }
        })

        allSegments.style('fill', 'white')
        const selected = allSegments.filter("path[code='" + code + "']")
        selected.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    function unhighlightRegions(map) {
        const allSegments = map.svg_.selectAll('.em-coxcomb-chart').selectAll('path[code]')
        allSegments.each(function () {
            const sel = select(this)
            const originalColor = sel.attr('fill___')

            if (originalColor && originalColor !== 'null' && originalColor !== 'undefined') {
                sel.style('fill', originalColor)
            } else {
                // Fallback: try to recompute the original color if not stored properly
                const code = sel.attr('code')
                if (code !== null && code !== undefined && map.classToFillStyle_) {
                    const originalFill = map.classToFillStyle_[code] || map.getColorOrFillStyle_(code)
                    if (originalFill) {
                        sel.style('fill', originalFill)
                        sel.attr('fill___', originalFill)
                    }
                }
            }
        })
    }

    return out
}
