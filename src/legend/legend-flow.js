import { spaceAsThousandSeparator } from '../core/utils'
import * as Legend from './legend'
import { drawCircleSizeLegend } from './legend-circle-size'
import { select } from 'd3-selection'

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
        labelFormatter: undefined, // function to format legend labels
        color: '#6b6b6b81', // line color
    }

    out.donutSizeLegend = {
        title: null,
        titlePadding: 25,
        values: null,
        marginTop: 20,
        labelFormatter: undefined, // function to format legend labels
    }

    out.flowColorLegend = {
        title: null,
        titlePadding: 0, // Padding between title and legend body
        marginTop: 33,
        items: [], // user-defined legend items for custom flow color function,
        ticks: false // use labels as ticks
    }

    out.regionColorLegend = {
        title: null,
        titlePadding: 15,
        marginTop: 30,
    }

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (
                key == 'colorLegend' ||
                key == 'flowWidthLegend' ||
                key == 'donutSizeLegend' ||
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
                    key == 'donutSizeLegend' ||
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
        buildFlowWidthLegend(out, baseX, baseY + out.flowWidthLegend.marginTop)

        const flowWidthLegendHeight = out._flowWidthContainer.node().getBBox().height

        // donut size legend
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
        }

        // flow colour legend
        if (map.flowDonuts_ && map.donutSizeScale || typeof map.flowColor_ === 'function') {
            // donut color legend
            let flowColorLegendYOffset = out.lgg.node().getBBox().height + out.flowColorLegend.marginTop
            drawFlowColorLegend(out, baseX, flowColorLegendYOffset)
        }

        // region fill colors
        if (map.importerRegionIds.length > 0 || map.exporterRegionIds.length > 0) {
            let regionColorLegendYOffset = out.lgg.node().getBBox().height + out.regionColorLegend.marginTop
            drawRegionColorLegend(out, baseX, regionColorLegendYOffset)
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
                .attr('stroke', out.flowWidthLegend.color ? out.flowWidthLegend.color : '#6b6b6b')
                .attr('stroke-width', strokeWidth)

            out._flowWidthContainer
                .append('text')
                .attr('x', x + 50)
                .attr('y', currentY)
                .attr('dy', '0.35em')
                .attr('class', 'em-legend-label')
                .text(out.flowWidthLegend.labelFormatter ? out.flowWidthLegend.labelFormatter(val) : spaceAsThousandSeparator(val))
        })
    }

    // explain flow line colors
    function drawFlowColorLegend(out, x, y) {
        const map = out.map

        // Create/clear container
        out._flowColorContainer?.remove()
        out._flowColorContainer = out.lgg
            .append('g')
            .attr('class', 'em-flow-color-legend')
            .attr('transform', `translate(${x}, ${y})`)

        const title = out._flowColorContainer
            .append('text')
            .attr('class', 'em-color-legend-title')
            .attr('id', 'em-color-legend-title')
            .attr('dy', '0.35em')
            .text(out.flowColorLegend.title || 'Destination')

        let legendItems = []
        if (typeof map.flowColor_ === 'function') {
            // user has defined a custom color function
            if (out.flowColorLegend.items && out.flowColorLegend.items.length > 0) {
                legendItems = out.flowColorLegend.items
            } else {
                legendItems = [
                    { label: "please specify legend items in legend.flowColorLegend.items like so: { label: 'Other', color: '#ccc' }", color: '#888' },
                ]
            }
        } else {
            // top locations legend items
            const colorScale = map.topLocationColorScale
            const topKeys = Array.from(map.topLocationKeys || [])
            legendItems = topKeys.map((key) => ({
                label: map.nodeNameMap.get(key) || key, // show location name if exists
                color: colorScale(key),
            }))
            // Always append the "Other" category last
            legendItems.push({ label: 'Other', color: map.flowColor_ })
        }

        // Draw each legend row
        const titleOffset = title.node().getBBox().height + out.flowColorLegend.titlePadding

        // Add hover interaction for flow lines
        const getFlowSelector = () => {
            // Straight: earlier code used <line>. Curved: your sankey builds <path class="em-flow-link">
            return map.flowLineType_ === 'straight'
                ? 'g.em-flow-container line, g.em-flow-lines line'
                : 'g.em-flow-container path.em-flow-link, g.em-flow-lines path.em-flow-link';
        };

        const nodeMatchesColor = function (wanted) {
            // Prefer the stable key
            const key = this.getAttribute('data-color');
            if (key) return key === wanted;

            // Fallback: check stroke/fill (works for non-gradient cases)
            const stroke = this.getAttribute('stroke');
            const fill = this.getAttribute('fill');

            // if tapered with gradient, fill will be "url(#...)" which won't equal a color
            // but if we got here, we don't have data-color; do best effort:
            return stroke === wanted || fill === wanted;
        };

        const highlightLinesByColor = (color) => {
            map.svg_
                .selectAll(getFlowSelector())
                .classed('highlighted', function () { return nodeMatchesColor.call(this, color); })
                .classed('dimmed', function () { return !nodeMatchesColor.call(this, color); });
        };

        const clearHighlights = () => {
            map.svg_
                .selectAll(getFlowSelector())
                .classed('highlighted', false)
                .classed('dimmed', false);
        };

        // Draw legend rows with mouseover
        const itemHeight = 22
        const itemWidth = out.itemHeight || 18
        legendItems.forEach((item, i) => {
            const row = out._flowColorContainer
                .append('g')
                .attr('class', 'em-color-legend-item')
                .attr('transform', `translate(0, ${i * 22 + titleOffset})`)
                .style('cursor', 'pointer')
                .on('mouseover', function () {
                    highlightLinesByColor(item.color)

                    // bold text + stroke rect
                    select(this).select('text').style('font-weight', 'bold')
                    select(this).select('rect').attr('stroke', 'black').attr('stroke-width', 2)
                })
                .on('mouseout', function () {
                    clearHighlights()

                    // reset text + rect
                    select(this).select('text').style('font-weight', 'normal')
                    select(this).select('rect').attr('stroke', 'none')
                })

            row.append('rect').attr('width', 18).attr('height', itemHeight).attr('fill', item.color)

            row.append('text').attr('x', 25).attr('y', 14).attr('class', 'em-legend-label').text(item.label)
        })
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
            'Net Exporter': map.flowRegionColors_[0],
            'Net Importer': map.flowRegionColors_[1],
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
