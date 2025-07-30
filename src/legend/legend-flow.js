import { spaceAsThousandSeparator } from '../core/utils'
import * as Legend from './legend'
import { drawCircleSizeLegend } from './legend-circle-size'

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    out.flowWidthLegend = {
        title: null,
        titlePadding: 17,
        values: null,
        marginTop: 5,
    }

    out.donutSizeLegend = {
        title: null,
        titlePadding: 25,
        values: null,
        marginTop: 20,
    }

    out.donutColorLegend = {
        title: null,
        titlePadding: 15,
        marginTop: 23,
    }

    out.regionColorLegend = {
        title: null,
        titlePadding: 15,
        marginTop: 35,
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (
                key == 'colorLegend' ||
                key == 'flowWidthLegend' ||
                key == 'donutSizeLegend' ||
                key == 'donutColorLegend' ||
                key == 'regionColorLegend'
            ) {
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
                if (
                    key == 'colorLegend' ||
                    key == 'flowWidthLegend' ||
                    key == 'donutSizeLegend' ||
                    key == 'donutColorLegend' ||
                    key == 'regionColorLegend'
                ) {
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
        let baseX = out.getBaseX()
        let baseY = out.getBaseY()

        // line widths
        buildFlowWidthLegend(out, baseX, baseY + out.flowWidthLegend.marginTop)

        const flowWidthLegendHeight = out._flowWidthContainer.node().getBBox().height

        // donut compositions
        if (map.flowDonuts_ && map.donutSizeScale) {
            // donut legends container
            out._donutLegendContainer = out.lgg
                .append('g')
                .attr('class', 'em-donut-legend')
                .attr('transform', `translate(${baseX}, ${baseY + flowWidthLegendHeight})`)

            // donut size legend
            out._donutSizeContainer = out._donutLegendContainer
                .append('g')
                .attr('class', 'em-donut-size-legend')
                .attr('transform', `translate(${0}, ${out.donutSizeLegend.marginTop})`)

            //draw circle size legend
            drawCircleSizeLegend(
                out,
                out._donutSizeContainer,
                out.donutSizeLegend.values,
                map.donutSizeScale,
                out.donutSizeLegend.title,
                out.donutSizeLegend.titlePadding
            )

            // donut color legend
            const donutColorYOffset =
                out.donutSizeLegend.marginTop + out._donutSizeContainer.node().getBBox().height + 10 + out.donutColorLegend.marginTop
            drawDonutColorLegend(out, 0, donutColorYOffset)
        }

        // region fill colors
        if (map.importerRegionIds.length > 0 || map.exporterRegionIds.length > 0) {
            let colorYOffset = baseY + out.flowWidthLegend.marginTop + flowWidthLegendHeight + out.regionColorLegend.marginTop
            if (map.flowDonuts_ && map.donutSizeScale) {
                colorYOffset += out.donutSizeLegend.marginTop
                colorYOffset += out._donutLegendContainer.node().getBBox().height
            }
            drawOverlayColorLegend(out, baseX, colorYOffset)
        }
    }

    function buildFlowWidthLegend(out, baseX, baseY) {
        const map = out.map
        if (!map.strokeWidthScale) return

        out._flowWidthContainer = out.lgg.append('g').attr('class', 'em-flow-width-legend').attr('transform', `translate(${baseX}, ${baseY})`)

        if (out.flowWidthLegend.title) {
            out._flowWidthContainer
                .append('text')
                // .attr('x', x)
                // .attr('y', y)
                .attr('class', 'em-size-legend-title')
                .text(out.flowWidthLegend.title || 'Flow width')
        }

        const scale = map.strokeWidthScale

        // Representative values (min, mid, max or user-defined)
        const domain = scale.domain()
        const values = out.flowWidthLegend.values || [domain[0], domain[domain.length - 1]]

        let currentY = out.flowWidthLegend.titlePadding || 10
        const padding = 7 // extra spacing between items
        let x = 0

        values.forEach((val, i) => {
            const strokeWidth = scale(val)

            // Space relative to previous line (half previous + half current + padding)
            if (i > 0) {
                const prevStrokeWidth = scale(values[i - 1])
                currentY += prevStrokeWidth / 2 + strokeWidth / i + padding
            }

            out._flowWidthContainer
                .append('line')
                .attr('x1', x)
                .attr('x2', x + 40)
                .attr('y1', currentY)
                .attr('y2', currentY)
                .attr('stroke', '#6b6b6b')
                .attr('stroke-width', strokeWidth)

            out._flowWidthContainer
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
        out._donutColorContainer = out._donutLegendContainer
            .append('g')
            .attr('class', 'em-donut-color-legend')
            .attr('transform', `translate(${x}, ${y})`)

        const items = map.flowDonutColors_
        // Draw the legend items
        Object.entries(items).forEach(([label, color], i) => {
            out._donutColorContainer
                .append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 18)
                .attr('height', 18)
                .attr('fill', color)

            out._donutColorContainer
                .append('text')
                .attr('x', 25)
                .attr('y', i * 20 + 15)
                .attr('class', 'em-legend-label')
                .text(label)
        })
    }

    function drawOverlayColorLegend(out, baseX, baseY) {
        if (!out._colorLegendContainer) {
            out._colorLegendContainer = out.lgg.append('g').attr('class', 'em-color-legend').attr('transform', `translate(${baseX}, ${baseY})`)
        }
        const container = out._colorLegendContainer.append('g').attr('class', 'em-flow-overlay-color-legend')

        const title = container
            .append('text')
            .attr('class', 'em-color-legend-title')
            .attr('dy', '0.35em')
            .text(out.regionColorLegend.title || 'Region fill colors')

        const map = out.map
        const items = {
            'Net Exporter': map.flowOverlayColors_[0],
            'Net Importer': map.flowOverlayColors_[1],
        }
        // Draw the legend items
        let x = 0
        let y = out.regionColorLegend.titlePadding
        Object.entries(items).forEach(([label, color], i) => {
            container
                .append('rect')
                .attr('x', 0)
                .attr('y', y + i * 20)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .attr('fill', color)

            container
                .append('text')
                .attr('x', out.shapeWidth + 5)
                .attr('y', y + i * 20 + 15)
                .attr('class', 'em-legend-label')
                .text(label)
        })
    }

    return out
}
