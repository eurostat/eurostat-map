import * as Legend from '../legend'
import { drawCircleSizeLegend } from '../legend-circle-size'
import { drawHorizontalFlowWidthLegend, drawVerticalFlowWidthLegend } from './legend-flow-width'
import { drawFlowColorLegend } from './legend-flow-color'

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
        marginTop: 15,
        labelFormatter: undefined, // function to format legend labels
        labels: null, // manual override for legend labels
        color: '#333', // line color
        orientation: 'horizontal', // 'vertical' or 'horizontal'
        segments: 3,
        width: 150,
        maxMin: false,
    }

    out.nodeSizeLegend = {
        title: null,
        titlePadding: 25,
        values: null,
        labels: null, // manual override for legend labels
        marginTop: 20,
        labelFormatter: undefined, // function to format legend labels
    }

    out.flowColorLegend = {
        title: null,
        titlePadding: 0, // Padding between title and legend body
        marginTop: 50,
        items: [], // user-defined legend items for custom flow color function,
        ticks: false // use labels as ticks
    }

    out.regionColorLegend = {
        title: null,
        titlePadding: 15,
        marginTop: 30,
        labels: ['Exporter', 'Importer'],
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (
                key == 'colorLegend' ||
                key == 'flowWidthLegend' ||
                key == 'nodeSizeLegend' ||
                key == 'flowColorLegend' ||
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
                    key == 'nodeSizeLegend' ||
                    key == 'flowColorLegend' ||
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
        if (out.flowWidthLegend) {
            out.flowWidthLegend.orientation == 'vertical' ? drawVerticalFlowWidthLegend(out, baseX, baseY + out.flowWidthLegend.marginTop) : drawHorizontalFlowWidthLegend(out, baseX, baseY + out.flowWidthLegend.marginTop)
        }

        const flowWidthNode = out._flowWidthContainer.node()
        const flowWidthLegendHeight = flowWidthNode.getBBox().height

        // node size legend
        if (map.flowNodes_ && map._nodeSizeScale) {
            // node legend container
            out._nodeLegendContainer = out.lgg
                .append('g')
                .attr('class', 'em-node-color-legend')
                .attr('transform', `translate(${baseX}, ${baseY + flowWidthLegendHeight})`)

            // node size legend
            out._nodeSizeContainer = out._nodeLegendContainer
                .append('g')
                .attr('class', 'em-node-size-legend')
                .attr('transform', `translate(${0}, ${out.nodeSizeLegend.marginTop})`)

            //draw circle size legend
            drawCircleSizeLegend(
                out,
                out._nodeSizeContainer,
                out.nodeSizeLegend.values,
                map._nodeSizeScale,
                out.nodeSizeLegend.title,
                out.nodeSizeLegend.titlePadding
            )
        }

        // flow colour legend
        if (out.flowColorLegend && ((map.flowNodes_ && map._nodeSizeScale) || (typeof map.flowColor_ === 'function'))) {
            // flow color legend
            let flowColorLegendYOffset = out.lgg.node().getBBox().height + out.flowColorLegend.marginTop
            drawFlowColorLegend(out, baseX, flowColorLegendYOffset)
        }

        // region fill colors
        if ((map.importerRegionIds.length > 0 || map.exporterRegionIds.length > 0) && out.regionColorLegend) {
            let regionColorLegendYOffset = out.lgg.node().getBBox().height + out.regionColorLegend.marginTop
            drawRegionColorLegend(out, baseX, regionColorLegendYOffset)
        }
    }



    function drawRegionColorLegend(out, baseX, baseY) {
        // Create/clear container
        out._regionColorContainer?.remove()
        out._regionColorContainer = out.lgg
            .append('g')
            .attr('class', 'em-flow-region-color-legend')
            .attr('transform', `translate(${baseX}, ${baseY})`)

        const title = out._regionColorContainer
            .append('text')
            .attr('class', 'em-color-legend-title')
            .attr('id', 'em-color-legend-title')
            .attr('dy', '0.35em')
            .text(out.regionColorLegend.title || 'Region fill colors')

        const map = out.map
        const items = {
            [out.regionColorLegend.labels[0]]: map.flowRegionColors_[0],
            [out.regionColorLegend.labels[1]]: map.flowRegionColors_[1],
        }
        // Draw the legend items
        let x = 0
        let y = out.regionColorLegend.titlePadding
        Object.entries(items).forEach(([label, color], i) => {
            out._regionColorContainer
                .append('rect')
                .attr('x', 0)
                .attr('y', y + i * 20)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .attr('fill', color)

            out._regionColorContainer
                .append('text')
                .attr('x', out.shapeWidth + 5)
                .attr('y', y + i * 20 + 15)
                .attr('class', 'em-legend-label')
                .text(label)
        })
    }

    return out
}


