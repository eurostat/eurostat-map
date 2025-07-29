import { spaceAsThousandSeparator } from '../core/utils'
import * as Legend from './legend'
import { drawCircleLegend } from './legend-circle-size'

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    out.sizeLegend = {
        title: null,
        titlePadding: 17,
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

        const m = out.map
        const lgg = out.lgg

        // update legend parameters if necessary
        if (m.legend_)
            for (let key in m.legend_) {
                if (key == 'colorLegend' || key == 'sizeLegend') {
                    for (let p in out[key]) {
                        //override each property in size and color legend m.legend_
                        if (m.legend_[key][p] !== undefined) {
                            out[key][p] = m.legend_[key][p]
                        }
                    }
                } else {
                    out[key] = m.legend_[key]
                }
            }

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // draw legend elements
        buildFlowLegend(out)

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend which illustrates the statistical values of different flow symbol sizes
     *
     */
    function buildFlowLegend(out) {
        const map = out.map
        let x = out.getBaseX()
        let y = out.getBaseY()

        buildFlowWidthLegend(out, x, y + 12)

        if (map.flowDonuts_) {
            if (map.donutSizeScale) {
                // donut size legend
                const yOffset = out._sizeLegendContainer.node().getBBox().height
                out._sizeLegendContainer = out.lgg
                    .append('g')
                    .attr('class', 'em-donut-size-legend')
                    .attr('transform', `translate(${baseX}, ${baseY + yOffset})`)

                drawCircleLegend(out, 0, 0, out._sizeLegendContainer, out.sizeLegend.values, map.donutSizeScale)

                // donut color legend
                const donutYOffset = out._sizeLegendContainer.node().getBBox().height + 10
                drawDonutColorLegend(out, 0, baseY + donutYOffset)
            }
        }

        const colorYOffset = out._sizeLegendContainer.node().getBBox().height + 10
        drawColorLegend(out, baseX, baseY + colorYOffset)
    }

    function buildFlowWidthLegend(out, x, y) {
        const map = out.map
        if (!map.strokeWidthScale) return

        out._sizeLegendContainer = out.lgg.append('g').attr('id', 'em-size-legend').attr('class', 'em-size-legend')
        const container = out._sizeLegendContainer.append('g').attr('class', 'em-flow-width-legend')

        if (out.sizeLegend.title) {
            container
                .append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('class', 'em-legend-label')
                .text(out.sizeLegend.title || 'Flow width')
        }

        const scale = map.strokeWidthScale

        // Representative values (min, mid, max or user-defined)
        const domain = scale.domain()
        const values = out.sizeLegend.values || [domain[0], domain[domain.length - 1]]

        let currentY = y + (out.sizeLegend.titlePadding || 10)
        const padding = 7 // extra spacing between items

        values.forEach((val, i) => {
            const strokeWidth = scale(val)

            // Space relative to previous line (half previous + half current + padding)
            if (i > 0) {
                const prevStrokeWidth = scale(values[i - 1])
                currentY += prevStrokeWidth / 2 + strokeWidth / i + padding
            }

            container
                .append('line')
                .attr('x1', x)
                .attr('x2', x + 40)
                .attr('y1', currentY)
                .attr('y2', currentY)
                .attr('stroke', '#444')
                .attr('stroke-width', strokeWidth)

            container
                .append('text')
                .attr('x', x + 50)
                .attr('y', currentY)
                .attr('dy', '0.35em')
                .attr('class', 'em-legend-label')
                .text(spaceAsThousandSeparator(val))
        })
    }

    function drawDonutColorLegend(out, x, y) {
        const map = out.map
        out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-color-legend').attr('transform', `translate(${x}, ${y})`)
        const container = out._colorLegendContainer.append('g').attr('class', 'em-flow-donut-color-legend')
        out.flowOverlayColors_ = ['#bbd7ee', '#c7e3c6'] // net exporter, net importers
        const items = {
            'Net Exporter': out.flowOverlayColors_[0],
            'Net Importer': out.flowOverlayColors_[1],
        }
        // Draw the legend items
        Object.entries(items).forEach(([label, color], i) => {
            container
                .append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 18)
                .attr('height', 18)
                .attr('fill', color)

            container
                .append('text')
                .attr('x', 25)
                .attr('y', i * 20 + 15)
                .attr('class', 'em-legend-label')
                .text(label)
        })
    }

    function drawColorLegend(out, x, y) {
        const container = out.lgg.append('g').attr('class', 'em-color-legend').attr('transform', `translate(${x}, ${y})`)
        const map = out.map
        const items = {
            'Net Exporter': map.flowOverlayColors_[0],
            'Net Importer': map.flowOverlayColors_[1],
        }
        // Draw the legend items
        Object.entries(items).forEach(([label, color], i) => {
            container
                .append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 18)
                .attr('height', 18)
                .attr('fill', color)

            container
                .append('text')
                .attr('x', 25)
                .attr('y', i * 20 + 15)
                .attr('class', 'em-legend-label')
                .text(label)
        })
    }

    return out
}
