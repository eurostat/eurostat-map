// legends for discrete color scales
import { select } from 'd3-selection'
import { executeForAllInsets, getLegendRegionsSelector } from '../core/utils'
import { getChoroplethLabelFormatter, highlightRegions, unhighlightRegions } from './choropleth/legend-choropleth'
import { getPropSymbolLabelFormatter, highlightPsSymbols, unhighlightPsSymbols } from './proportional-symbol/legend-proportional-symbols'

// can either be 'ranges' (e.g. 0-10, 10-20) or 'thresholds' (e.g. 0, 10, 20 with ticks)
export function drawDiscreteLegend(out, x, y) {
    // container
    out._discreteLegendContainer = out.lgg.append('g').attr('class', 'discrete-legend-container').attr('transform', `translate(${x},${y})`)

    // title
    if (out.colorLegend?.title) {
        out._discreteLegendContainer
            .append('text')
            .attr('class', 'em-legend-title em-color-legend-title')
            .attr('x', 0)
            .attr('y', 0)
            .text(out.colorLegend.title)
    }

    // choropleths dont have multiple visual variables (yet), so we use the root legend config
    const config = out.map._mapType == 'ps' ? out.colorLegend : out // Use out.colorLegend for proportional symbols, out for choropleth

    // thresholds vs ranges
    if (out.labelType === 'ranges') {
        createRangesLegend(out, config)
    } else {
        createThresholdsLegend(out, config)
    }

    // Optionally add no-data
    if (config.noData) {
        let y = getNumberOfClasses(out) * config.shapeHeight + getTitlePadding(out) + 3 // 3px padding
        const x = 0
        if (config.pointOfDivergence && config.pointOfDivergencePadding) y += config.pointOfDivergencePadding // shift legend items down after point of divergence
        const container = out._discreteLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        const highlightFunction = getHighlightFunction(out.map)
        const unhighlightFunction = getUnHighlightFunction(out.map)
        out.appendNoDataLegend(container, config.noDataText, highlightFunction, unhighlightFunction)
    }
}

function getHighlightFunction(map) {
    if (map._mapType == 'ps') return highlightPsSymbols
    return highlightRegions
}

function getUnHighlightFunction(map) {
    if (map._mapType == 'ps') return unhighlightPsSymbols
    return unhighlightRegions
}

function getNumberOfClasses(out) {
    const map = out.map
    const mapType = map._mapType
    const numberOfClasses = mapType === 'ps' ? map.psClasses_ : map.numberOfClasses_ //prop symbols or choropleth
    return numberOfClasses
}

function getLabelFormatter(out) {
    const map = out.map
    const mapType = map._mapType
    const labelFormatter = mapType === 'ps' ? getPropSymbolLabelFormatter(out) : getChoroplethLabelFormatter(out)
    return labelFormatter
}

function getClassToFillStyle(out) {
    const map = out.map
    const mapType = map._mapType
    const classToFillStyle = mapType === 'ps' ? map.psClassToFillStyle_ : map.classToFillStyle_
    return classToFillStyle
}

function getColorClassifier(out) {
    const map = out.map
    const mapType = map._mapType
    const colorClassifier = mapType === 'ps' ? map.classifierColor_ : map.classifier_
    return colorClassifier
}

function getTitlePadding(out) {
    // Calculate the padding between the title and the first legend item
    const map = out.map
    return map._mapType == 'ps' ? out.sizeLegend.titlePadding : 0
}

function createThresholdsLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const numberOfClasses = getNumberOfClasses(out)
    const titlePadding = getTitlePadding(out)
    const highlightFunction = getHighlightFunction(map)
    const unhighlightFunction = getUnHighlightFunction(map)

    // Label formatter
    const labelFormatter = getLabelFormatter(out)
    for (let i = 0; i < numberOfClasses; i++) {
        const y = i * config.shapeHeight + titlePadding
        const x = 0
        const ecl = out.ascending ? numberOfClasses - i - 1 : i
        const fillColor = getClassToFillStyle(out)(ecl, numberOfClasses)

        // Append rectangle for each class
        container
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.shapeWidth)
            .attr('height', config.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                select(this).raise()
                highlightFunction(map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightFunction, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(map)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightFunction, ecl)
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
                .attr('x1', config.sepLineLength)
                .attr('y1', y)
                .attr('x2', config.sepLineLength + config.tickLength)
                .attr('y2', y)
        }

        // Append label
        if (i < numberOfClasses - 1) {
            // mark label so we can move it in drawDivergingLine
            const label = container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', Math.max(config.shapeWidth, config.sepLineLength + config.tickLength) + (config.labelOffsets.x || 0))
                .attr('y', y + config.shapeHeight)
                //.attr('dominant-baseline', 'middle')
                .attr('dy', '0.35em') // ~vertical centering
                .text(() => {
                    if (config.labels) return config.labels[i]
                    const classifier = getColorClassifier(out)
                    if (classifier?.invertExtent) {
                        const range = classifier.invertExtent(ecl)
                        return labelFormatter(range[out.ascending ? 0 : 1])
                    }
                    return map.noDataText_ || ''
                })

            // mark label so we can move it in drawDivergingLine
            if (config.pointOfDivergenceLabel && i == config.pointOfDivergence - 1) label.attr('class', 'em-legend-label em-legend-label-divergence')
        }
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
    if (config.pointOfDivergenceLabel) {
        for (let i = 0; i < numberOfClasses; i++) {
            let y = i * config.shapeHeight
            // point of divergence indicator
            if (i == config.pointOfDivergence) {
                drawDivergingLine(out, y, config)
            }
        }
    }
}

function createRangesLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const labelFormatter = getLabelFormatter(out)
    const numberOfClasses = getNumberOfClasses(out)
    const highlightFunction = getHighlightFunction(map)
    const unhighlightFunction = getUnHighlightFunction(map)

    // for each class
    for (let i = 0; i < numberOfClasses; i++) {
        let y = i * config.shapeHeight + getTitlePadding(out)
        const x = 0
        const ecl = out.ascending ? numberOfClasses - i - 1 : i
        const fillColor = map.classToFillStyle()(ecl, numberOfClasses)
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        // shift legend items down after point of divergence if applicable
        if (config.pointOfDivergenceLabel && i >= config.pointOfDivergence) y += config.pointOfDivergencePadding

        // Append rectangle
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.shapeWidth)
            .attr('height', config.shapeHeight)
            .style('fill', fillColor)
            .on('mouseover', function () {
                select(this).raise()
                highlightFunction(out.map, ecl)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightFunction, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightFunction(out.map)
                if (out.map.insetTemplates_) {
                    executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightFunction, ecl)
                }
            })

        // Append separation line
        if (i > 0) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-separator')
                .attr('x1', 0)
                .attr('y1', y)
                .attr('x2', config.sepLineLength)
                .attr('y2', y)
        }

        // Append labels
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('x', Math.max(config.shapeWidth, config.sepLineLength + config.tickLength) + (config.labelOffsets.x || 0))
            .attr('y', y + config.shapeHeight / 2)
            .attr('dy', '0.35em')
            .text(config.labels ? config.labels[i] : labelFormatter(map.classifier().invertExtent(ecl)[out.ascending ? 0 : 1], i))
    }

    // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
    if (config.pointOfDivergenceLabel) {
        for (let i = 0; i < numberOfClasses; i++) {
            let y = i * config.shapeHeight
            // point of divergence indicator
            if (i == config.pointOfDivergence) {
                drawDivergingLine(out, y, config)
            }
        }
    }
}

function drawDivergingLine(out, y, config) {
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const x = 0
    if (config.labelType == 'ranges') y = y + config.pointOfDivergencePadding / 2 // move to the middle of the space between legend item
    const maxLabelLength = out._discreteLegendContainer
        .selectAll('.em-legend-label')
        .nodes()
        .reduce((max, node) => Math.max(max, node.getBBox().width), 0)
    const lineLength = out.divergingLineLength || out.shapeWidth + out.labelOffsets?.x + maxLabelLength + out.labelOffsets?.x + 15 // rect > offset > label > offset > padding > vertical line

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
        } else {
            // remove it so it doesnt clash with pointOfDivergenceLabel
            container.selectAll('.em-legend-label-divergence').remove()
        }
    }
}
