import { executeForAllInsets } from '../../core/utils'
import { getLabelFormatter, highlightRegions, unhighlightRegions } from './legend-choropleth'
import { select } from 'd3-selection'

// discrete legends for choropleth maps
// can either be 'ranges' (e.g. 0-10, 10-20) or 'thresholds' (e.g. 0, 10, 20 with ticks)
export function createDiscreteLegend(out, baseX, baseY) {
    out._discreteLegendContainer = out.lgg.append('g').attr('class', 'discrete-legend-container').attr('transform', `translate(${baseX},${baseY})`)
    if (out.labelType === 'ranges') {
        createRangesLegend(out)
    } else {
        createThresholdsLegend(out)
    }

    // Optionally add no-data
    if (out.noData) {
        let y = map.numberOfClasses_ * out.shapeHeight + 5 // 5px padding
        const x = 0
        if (out.pointOfDivergence) y += out.pointOfDivergencePadding // shift legend items down after point of divergence
        //const y = baseY + out.map.psClasses_ * (out.colorLegend.shapeHeight + out.colorLegend.shapePadding) + getFontSizeFromClass('em-legend-title')
        const container = out._discreteLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        out.appendNoDataLegend(container, out.noDataText, highlightRegions, unhighlightRegions)
    }
}

function createThresholdsLegend(out) {
    const m = out.map
    const container = out._discreteLegendContainer

    // Label formatter
    const labelFormatter = getLabelFormatter(out)
    for (let i = 0; i < m.numberOfClasses_; i++) {
        const y = i * out.shapeHeight
        const x = 0
        const ecl = out.ascending ? m.numberOfClasses() - i - 1 : i
        const fillColor = m.classToFillStyle()(ecl, m.numberOfClasses_)

        // Append rectangle for each class
        container
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', out.shapeWidth)
            .attr('height', out.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                highlightRegions(out.map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(out.map)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, ecl)
                }
            })

        // Append separation line asdasd
        if (i > 0) {
            container.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', out.sepLineLength).attr('y2', y)
        }

        // Append tick line
        if (i > 0) {
            container
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', out.sepLineLength)
                .attr('y1', y)
                .attr('x2', out.sepLineLength + out.tickLength)
                .attr('y2', y)
        }

        // Append label
        if (i < m.numberOfClasses() - 1) {
            // mark label so we can move it in drawDivergingLine
            const label = container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', Math.max(out.shapeWidth, out.sepLineLength + out.tickLength) + out.labelOffset)
                .attr('y', y + out.shapeHeight)
                //.attr('dominant-baseline', 'middle')
                .attr('dy', '0.35em') // ~vertical centering
                .text(() => {
                    if (out.labels) return out.labels[i]

                    const classifier = m.classifier?.()
                    if (classifier?.invertExtent) {
                        const range = classifier.invertExtent(ecl)
                        return labelFormatter(range[out.ascending ? 0 : 1])
                    }

                    return map.noDataText_ || ''
                })

            // mark label so we can move it in drawDivergingLine
            if (out.pointOfDivergenceLabel && i == out.pointOfDivergence - 1) label.attr('class', 'em-legend-label em-legend-label-divergence')
        }
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
    if (out.pointOfDivergenceLabel) {
        for (let i = 0; i < map.numberOfClasses_; i++) {
            let y = i * out.shapeHeight
            // point of divergence indicator
            if (i == out.pointOfDivergence) {
                drawDivergingLine(out, y)
            }
        }
    }
}

function createRangesLegend(out) {
    const map = out.map
    const container = out._discreteLegendContainer
    const labelFormatter = getLabelFormatter(out)

    // for each class
    for (let i = 0; i < map.numberOfClasses_; i++) {
        let y = i * out.shapeHeight
        const x = 0
        const ecl = out.ascending ? map.numberOfClasses() - i - 1 : i
        const fillColor = map.classToFillStyle()(ecl, map.numberOfClasses_)
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        // shift legend items down after point of divergence if applicable
        if (out.pointOfDivergenceLabel && i >= out.pointOfDivergence) y += out.pointOfDivergencePadding

        // Append rectangle
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', out.shapeWidth)
            .attr('height', out.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                select(this).raise()
                highlightRegions(out.map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(out.map)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, ecl)
                }
            })

        // Append separation line
        if (i > 0) {
            itemContainer.append('line').attr('class', 'em-legend-separator').attr('x1', 0).attr('y1', y).attr('x2', out.sepLineLength).attr('y2', y)
        }

        // Append labels
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('x', Math.max(out.shapeWidth, out.sepLineLength + out.tickLength) + out.labelOffset)
            .attr('y', y + out.shapeHeight / 2)
            .attr('dy', '0.35em')
            .text(out.labels ? out.labels[i] : labelFormatter(map.classifier().invertExtent(ecl)[out.ascending ? 0 : 1], i))
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
    if (out.pointOfDivergenceLabel) {
        for (let i = 0; i < map.numberOfClasses_; i++) {
            let y = i * out.shapeHeight
            // point of divergence indicator
            if (i == out.pointOfDivergence) {
                drawDivergingLine(out, y)
            }
        }
    }
}

function drawDivergingLine(out, y) {
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const x = 0
    if (out.labelType == 'ranges') y = y + out.pointOfDivergencePadding / 2 // move to the middle of the space between legend item
    const maxLabelLength = out._discreteLegendContainer
        .selectAll('.em-legend-label')
        .nodes()
        .reduce((max, node) => Math.max(max, node.getBBox().width), 0)
    const lineLength = out.divergingLineLength || out.shapeWidth + out.labelOffset + maxLabelLength + out.labelOffset + 15 // rect > offset > label > offset > padding > vertical line

    // Draw the horizontal divergence line
    container
        .append('line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', x + lineLength)
        .attr('y2', y)
        .attr('class', 'em-legend-diverging-line')

    const labels = out.pointOfDivergenceLabel.split('|')
    if (labels.length > 1) {
        // divergence line with up and down arrows
        const directionLineLength = out.divergingArrowLength || 30
        const directionLineX = x + lineLength
        // Add arrowhead marker definition
        const defs = container.append('defs')
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', markerHeight)
            .attr('markerHeight', markerHeight)
            .attr('refX', 0)
            .attr('refY', markerHeight / 2)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', `0 0, ${markerHeight} ${markerHeight / 2}, 0 ${markerHeight}`)
            .attr('fill', 'black')

        // Upward line with arrowhead
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', directionLineX)
            .attr('y1', y)
            .attr('x2', directionLineX)
            .attr('y2', y - directionLineLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Downward line with arrowhead
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', directionLineX)
            .attr('y1', y)
            .attr('x2', directionLineX)
            .attr('y2', y + directionLineLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Labels for upward and downward lines
        container
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('x', directionLineX + 10)
            .attr('y', y - directionLineLength + 10)
            .attr('dy', '0.35em')
            .text(labels[0])

        container
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('x', directionLineX + 10)
            .attr('y', y + directionLineLength - 10)
            .attr('dy', '0.35em')
            .text(labels[1])
    } else {
        // just the single label
        container
            .append('text')
            .attr('class', 'em-legend-diverging-label em-legend-label')
            .attr('x', x + lineLength + 5)
            .attr('y', y)
            .attr('dy', '0.35em')
            .text(out.pointOfDivergenceLabel)
    }

    //move threshold label out of the way of the line
    if (out.labelType == 'thresholds') {
        if (labels.length > 1) {
            // move it to end of line
            container.selectAll('.em-legend-label-divergence').attr('x', x + lineLength + 10)
            // Append tick line
            // container
            //     .append('line')
            //     .attr('class', 'em-legend-tick')
            //     .attr('x1', x + lineLength)
            //     .attr('y1', y)
            //     .attr('x2', x + lineLength + 5)
            //     .attr('y2', y)
        } else {
            //remove it so it doesnt clash with pointOfDivergenceLabel
            container.selectAll('.em-legend-label-divergence').remove()
        }
    }
}
