//legend-choropleth.js
import { select } from 'd3-selection'
import { format } from 'd3-format'
import * as Legend from './legend'
import { checkIfDiverging, executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../core/utils'
import { appendPatternFillLegend } from './legend-pattern-fill'
import { createHistogramLegend } from './legend-histogram'

/**
 * A legend for choropleth maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object (inherit)
    const out = Legend.legend(map)

    out.labelType = 'thresholds' // thresholds || ranges
    //the order of the legend elements. Set to false to invert.
    out.ascending = true
    //the width of the legend box elements
    out.shapeWidth = 25
    //the height of the legend box elements
    out.shapeHeight = 20
    //the separation line length
    out.sepLineLength = out.shapeWidth
    //tick line length in pixels
    out.tickLength = 4
    //the number of decimal for the legend labels
    out.decimals = 0
    //the distance between the legend box elements to the corresponding text label
    out.labelOffset = 3
    //labelFormatter function
    out.labelFormatter = null
    // manually define labels
    out.labels = null

    // Histogram config as nested object
    out.histogram = null

    //diverging line
    out.pointOfDivergenceLabel = undefined
    out.pointOfDivergence = undefined
    out.pointOfDivergencePadding = 7
    out.divergingLineLength = undefined
    out.divergingArrowLength = undefined

    //continuous legend
    out.lowLabel = undefined //'Low'
    out.highLabel = undefined //'High'
    out.continuousTicks = 0 // Number of tick marks on continuous color legend (set to 0 to disable and just show low/high labels)
    out.continuousTickValues = [] // Custom tick values for continuous legend (if empty, will use linear interpolation based on domain)
    out.continuousTickLabels = [] // Custom tick labels for continuous legend (if empty, will use continuousTickValues)
    out.continuousOrientation = 'horizontal' // or 'vertical'

    //show no data
    out.noData = true
    //no data text label
    out.noDataText = 'No data'

    //override attribute values with config values
    if (config) {
        for (let key in config) {
            if (key === 'histogram' && typeof config[key] === 'object') {
                out.histogram = {
                    orientation: 'horizontal',
                    showCounts: false,
                    showPercentages: false,
                    labelRotation: 0,
                    ...config.histogram,
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

        if (out.lgg.node()) {
            const map = out.map
            const container = out.lgg

            // Draw legend background box and title if provided
            out.makeBackgroundBox()
            if (out.title) {
                let cssFontSize = getFontSizeFromClass('em-legend-title')
                container
                    .append('text')
                    .attr('class', 'em-legend-title')
                    .attr('x', out.boxPadding)
                    .attr('y', out.boxPadding + cssFontSize)
                    .text(out.title)
            }

            //exit early if no classifier
            if (!map.classToFillStyle()) return

            //set default point of divergence if applicable
            if (out.pointOfDivergenceLabel && !out.pointOfDivergence) out.pointOfDivergence = map.numberOfClasses_ / 2

            if (out.histogram) {
                createHistogramLegend(out, getThresholds(), getColors(), getData(), getLabelFormatter(), highlightRegions, unhighlightRegions)
            } else if (map.colorSchemeType_ === 'continuous') {
                createContinuousLegend()
            } else {
                if (out.labelType === 'ranges') createRangesLegend()
                else createThresholdsLegend()
            }

            // Get the total height of the choropleth legend box
            const legendHeight = out.lgg.node().getBBox().height

            // Append pattern fill legend items BELOW the main legend
            appendPatternFillLegend(map, out.lgg, {
                shapeWidth: out.shapeWidth,
                shapeHeight: out.shapeHeight,
                labelOffset: out.labelOffset,
                boxPadding: out.boxPadding,
                offsetY: legendHeight + out.boxPadding + 5, // << this shifts pattern legend down
            })

            // Set legend box dimensions
            out.setBoxDimension()
        }
    }

    function getThresholds() {
        const map = out.map
        const thresholds =
            map.thresholds_.length > 1
                ? map.thresholds_
                : Array.from({ length: map.numberOfClasses_ })
                      .map((_, index) => {
                          return map.classifier().invertExtent(index)[out.ascending ? 0 : 1]
                      })
                      .slice(1) // Remove the first entry and return the rest as an array
        return thresholds
    }

    function getColors() {
        const map = out.map
        return map.colors_
            ? map.colors_
            : Array.from({ length: map.numberOfClasses_ }).map((_, index) => {
                  return map.classToFillStyle()(index, map.numberOfClasses_)
              })
    }

    function getData() {
        const map = out.map
        return Object.values(map.statData()._data_).map((item) => item.value)
    }

    function getLabelFormatter() {
        if (out.labelType == 'ranges') {
            const thresholds = getThresholds()
            const defaultLabeller = (label, i) => {
                const decimalFormatter = format(`.${out.decimals}f`)
                if (i === 0) return `> ${decimalFormatter(thresholds[thresholds.length - 1])}` //top
                if (i === thresholds.length) return `< ${decimalFormatter(thresholds[0])}` //bottom
                return `${decimalFormatter(thresholds[thresholds.length - i - 1])} - < ${decimalFormatter(thresholds[thresholds.length - i])}  ` //in-between
            }
            return out.labelFormatter || defaultLabeller
        } else if (out.labelType == 'thresholds') {
            return out.labelFormatter || format(`.${out.decimals}f`)
        } else {
            return out.labelFormatter || format(`.${out.decimals}f`)
        }
    }

    //supports:
    // Sequential interpolators (like d3.interpolatePurples)
    // Stretched interpolators (e.g., stretchedColor using .valueTransform)
    // D3 diverging scales (d3.scaleDiverging(...).domain([-60, 0, 38.7]))
    // All of the above with or without .valueTransform / .valueUntransform
    function createContinuousLegend() {
        const m = out.map
        const container = out.lgg.append('g').attr('class', 'em-continuous-legend')
        const isVertical = out.continuousOrientation === 'vertical'
        const legendId = 'legend-gradient-' + Math.random().toString(36).substr(2, 5)
        const domain = getColorDomain(m)
        const { legendWidth, legendHeight, baseY } = computeLayoutBasics(out, isVertical)

        createLegendGradient(container, m, legendId, isVertical)
        drawLegendRect(container, legendId, out, baseY, legendWidth, legendHeight, isVertical)

        if (hasTicks(out)) {
            drawTickLabels(container, out, domain, legendWidth, baseY, isVertical)
        } else {
            drawLowHighLabels(container, out, domain, baseY, legendWidth, legendHeight, isVertical)
        }

        if (out.noData) {
            drawNoDataBox(container, out, baseY, legendWidth, legendHeight, isVertical)
        }
    }

    function getColorDomain(map) {
        return typeof map.colorFunction_?.domain === 'function' ? map.colorFunction_.domain() : map.domain_ || [0, 1]
    }

    function computeLayoutBasics(out, isVertical) {
        const width = out.width || out.shapeWidth * 6
        const height = isVertical ? out.shapeWidth : out.shapeHeight
        let y = out.boxPadding
        if (out.title) y += getFontSizeFromClass('em-legend-title') + 10
        return { legendWidth: width, legendHeight: height, baseY: y }
    }
    function createLegendGradient(container, map, gradientId, isVertical) {
        const isD3Scale = typeof map.colorFunction_?.domain === 'function'
        const isDiverging = map.isDiverging?.() || false
        const valueTransform = map.valueTransform_ || ((d) => d)
        const steps = 20

        // Determine domain
        const rawDomain = isD3Scale ? map.colorFunction_.domain() : map.domain_ || [0, 1]
        const domain = rawDomain.map(valueTransform)
        const [d0, d1, d2] = domain.length === 3 ? domain : [domain[0], null, domain[1]]

        // Create gradient
        const defs = container.append('defs')
        const gradient = defs
            .append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', isVertical ? '0%' : '0%')
            .attr('x2', isVertical ? '0%' : '100%')
            .attr('y1', isVertical ? '100%' : '0%')
            .attr('y2', isVertical ? '0%' : '0%')

        for (let i = 0; i <= steps; i++) {
            let t = i / steps

            // Flip diverging full-scale gradients in horizontal layout
            let tNorm = t
            if (!isVertical && isD3Scale && isDiverging && rawDomain.length === 3 && rawDomain[0] < rawDomain[2]) {
                tNorm = 1 - t
            }

            let val
            if (domain.length === 3) {
                // Diverging interpolator or diverging scale with 3-point domain
                val = tNorm < 0.5 ? d0 + (d1 - d0) * (tNorm * 2) : d1 + (d2 - d1) * ((tNorm - 0.5) * 2)
            } else {
                val = d0 + tNorm * (d2 - d0)
            }

            const color = map.colorFunction_(isD3Scale ? val : tNorm)

            gradient
                .append('stop')
                .attr('offset', `${t * 100}%`) // use unflipped t here for visual layout
                .attr('stop-color', color)
        }
    }

    function drawLegendRect(container, gradientId, out, baseY, width, height, isVertical) {
        container
            .append('rect')
            .attr('x', out.boxPadding)
            .attr('y', baseY)
            .attr('width', isVertical ? height : width)
            .attr('height', isVertical ? width : height)
            .style('fill', `url(#${gradientId})`)
    }

    function hasTicks(out) {
        return out.continuousTicks > 1 || out.continuousTickValues.length > 1
    }

    function drawTickLabels(container, out, domain, legendWidth, baseY, isVertical) {
        const m = out.map
        const tickGroup = container.append('g').attr('class', 'em-legend-ticks')
        const decimalFormatter = format(`.${out.decimals}f`)
        const transform = m.valueTransform_ || ((d) => d)

        const raw =
            Array.isArray(out.continuousTickValues) && out.continuousTickValues.length > 0
                ? out.continuousTickValues.map(transform)
                : Array.from({ length: out.continuousTicks }, (_, i) => domain[0] + (i / (out.continuousTicks - 1)) * (domain[1] - domain[0]))

        raw.forEach((val, i) => {
            const t = computeNormalizedTickPosition(val, domain)
            const pos = isVertical ? baseY + legendWidth - t * legendWidth : out.boxPadding + t * legendWidth
            const x = isVertical ? out.boxPadding + (out.shapeHeight || 20) : pos
            const y = isVertical ? pos + 1 : baseY + (out.shapeHeight || 20)

            tickGroup
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', isVertical ? x + out.tickLength : x)
                .attr('y2', isVertical ? y : y + out.tickLength)

            const label =
                Array.isArray(out.continuousTickLabels) && out.continuousTickLabels[i] != null
                    ? out.continuousTickLabels[i]
                    : m.valueUntransform_
                      ? decimalFormatter(m.valueUntransform_(val))
                      : decimalFormatter(val)

            tickGroup
                .append('text')
                .attr('class', 'em-legend-label em-legend-ticklabel')
                .attr('x', isVertical ? x + out.tickLength + 3 : x)
                .attr('y', isVertical ? y + 4 : y + out.tickLength + 10)
                .attr('dy', isVertical ? (i === 0 ? '-0.1em' : i === raw.length - 1 ? '0.35em' : '') : '0.35em')
                .attr('text-anchor', isVertical ? 'start' : i === 0 ? 'start' : i === raw.length - 1 ? 'end' : 'middle')
                .attr('dominant-baseline', isVertical ? (i === 0 ? 'text-after-edge' : i === raw.length - 1 ? 'hanging' : 'middle') : null)
                .text(label)
        })
    }

    function computeNormalizedTickPosition(val, domain) {
        if (domain.length === 3) {
            const [d0, d1, d2] = domain
            return val < d1 ? (0.5 * (val - d0)) / (d1 - d0) : 0.5 + (0.5 * (val - d1)) / (d2 - d1)
        } else {
            return (val - domain[0]) / (domain[1] - domain[0])
        }
    }

    function drawLowHighLabels(container, out, domain, baseY, width, height, isVertical) {
        const m = out.map
        const decimalFormatter = format(`.${out.decimals}f`)
        const low = out.lowLabel ?? decimalFormatter(m.valueUntransform_ ? m.valueUntransform_(domain[0]) : domain[0])
        const high = out.highLabel ?? decimalFormatter(m.valueUntransform_ ? m.valueUntransform_(domain[1]) : domain[1])

        if (isVertical) {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + height + 5)
                .attr('y', baseY + out.boxPadding + width - 15)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .text(low)

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + height + 5)
                .attr('y', baseY + out.boxPadding)
                .attr('text-anchor', 'start')
                .attr('dy', '0.35em')
                .text(high)
        } else {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding)
                .attr('y', baseY + height + 15)
                .attr('text-anchor', 'start')
                .text(low)

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + width)
                .attr('y', baseY + height + 15)
                .attr('text-anchor', 'end')
                .text(high)
        }
    }

    function drawNoDataBox(container, out, baseY, width, height, isVertical) {
        const m = out.map
        const y = isVertical ? baseY + out.boxPadding + width + 5 : baseY + height + 30
        const g = container.append('g').attr('class', 'em-no-data-legend')

        g.append('rect')
            .attr('class', 'em-legend-rect')
            .attr('x', out.boxPadding)
            .attr('y', y)
            .attr('width', out.shapeWidth)
            .attr('height', out.shapeHeight)
            .style('fill', m.noDataFillStyle_)
            .on('mouseover', () => {
                highlightRegions(m, 'nd')
                if (m.insetTemplates_) {
                    executeForAllInsets(m.insetTemplates_, m.svgId, highlightRegions, 'nd')
                }
            })
            .on('mouseout', () => {
                unhighlightRegions(m)
                if (m.insetTemplates_) {
                    executeForAllInsets(m.insetTemplates_, m.svgId, unhighlightRegions)
                }
            })

        g.append('text')
            .attr('class', 'em-legend-label')
            .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
            .attr('y', y + out.shapeHeight / 2)
            .attr('dy', '0.35em')
            .text(out.noDataText)
    }

    function createThresholdsLegend() {
        const m = out.map
        const lgg = out.lgg
        let baseY = out.boxPadding
        // Label formatter
        const labelFormatter = getLabelFormatter()
        if (out.title) baseY = baseY + getFontSizeFromClass('em-legend-title') + 8 // title size + padding
        for (let i = 0; i < m.numberOfClasses_; i++) {
            const y = baseY + i * out.shapeHeight
            const x = out.boxPadding
            const ecl = out.ascending ? m.numberOfClasses() - i - 1 : i
            const fillColor = m.classToFillStyle()(ecl, m.numberOfClasses_)

            // Append rectangle for each class
            lgg.append('rect')
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

            // Append separation line
            if (i > 0) {
                lgg.append('line')
                    .attr('class', 'em-legend-separator')
                    .attr('x1', out.boxPadding)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength)
                    .attr('y2', y)
            }

            // Append tick line
            if (i > 0) {
                lgg.append('line')
                    .attr('class', 'em-legend-tick')
                    .attr('x1', out.boxPadding + out.sepLineLength)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength + out.tickLength)
                    .attr('y2', y)
            }

            // Append label
            if (i < m.numberOfClasses() - 1) {
                // mark label so we can move it in drawDivergingLine
                const label = lgg
                    .append('text')
                    .attr('class', 'em-legend-label')
                    .attr('x', out.boxPadding + Math.max(out.shapeWidth, out.sepLineLength + out.tickLength) + out.labelOffset)
                    .attr('y', y + out.shapeHeight)
                    //.attr('dominant-baseline', 'middle')
                    .attr('dy', '0.35em') // ~vertical centering
                    .text(out.labels ? out.labels[i] : labelFormatter(m.classifier().invertExtent(ecl)[out.ascending ? 0 : 1]))

                // mark label so we can move it in drawDivergingLine
                if (out.pointOfDivergenceLabel && i == out.pointOfDivergence - 1) label.attr('class', 'em-legend-label em-legend-label-divergence')
            }
        }

        // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
        if (out.pointOfDivergenceLabel) {
            for (let i = 0; i < map.numberOfClasses_; i++) {
                let y = baseY + i * out.shapeHeight
                // point of divergence indicator
                if (i == out.pointOfDivergence) {
                    drawDivergingLine(y)
                }
            }
        }

        // 'No data' box and label if applicable
        if (out.noData) {
            const y = baseY + m.numberOfClasses() * out.shapeHeight + out.boxPadding
            lgg.append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', out.map.noDataFillStyle_)
                .on('mouseover', function () {
                    highlightRegions(out.map, 'nd')
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, 'nd')
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions)
                    }
                })

            lgg.append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dy', '0.35em')
                .text(out.noDataText)
        }
    }

    function createRangesLegend() {
        const map = out.map
        const container = out.lgg
        const labelFormatter = getLabelFormatter()

        let baseY = out.boxPadding
        if (out.title) baseY = baseY + getFontSizeFromClass('em-legend-title') + 8 // title size + padding

        // for each class
        for (let i = 0; i < map.numberOfClasses_; i++) {
            let y = baseY + i * out.shapeHeight
            const x = out.boxPadding
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
                itemContainer
                    .append('line')
                    .attr('class', 'em-legend-separator')
                    .attr('x1', out.boxPadding)
                    .attr('y1', y)
                    .attr('x2', out.boxPadding + out.sepLineLength)
                    .attr('y2', y)
            }

            // Append labels
            itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + Math.max(out.shapeWidth, out.sepLineLength + out.tickLength) + out.labelOffset)
                .attr('y', y + out.shapeHeight / 2)
                .attr('dy', '0.35em')
                .text(out.labels ? out.labels[i] : labelFormatter(map.classifier().invertExtent(ecl)[out.ascending ? 0 : 1], i))
        }

        // Draw diverging line if applicable. We draw it afterwards so that we can calculate the max length of the legend labels so it doesnt cover them
        if (out.pointOfDivergenceLabel) {
            for (let i = 0; i < map.numberOfClasses_; i++) {
                let y = baseY + i * out.shapeHeight
                // point of divergence indicator
                if (i == out.pointOfDivergence) {
                    drawDivergingLine(y)
                }
            }
        }

        // 'No data' box and label if applicable
        if (out.noData) {
            const noDataItemContainer = container.append('g').attr('class', 'em-legend-item')
            let y = baseY + map.numberOfClasses() * out.shapeHeight + out.boxPadding
            //if (out.pointOfDivergence) y += out.pointOfDivergencePadding // shift legend items down after point of divergence
            noDataItemContainer
                .append('rect')
                .attr('class', 'em-legend-rect')
                .attr('x', out.boxPadding)
                .attr('y', y)
                .attr('width', out.shapeWidth)
                .attr('height', out.shapeHeight)
                .style('fill', out.map.noDataFillStyle_)
                .on('mouseover', function () {
                    select(this).raise()
                    highlightRegions(map, 'nd')
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, 'nd')
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(map)
                    if (map.insetTemplates_) {
                        executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions)
                    }
                })

            noDataItemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', out.boxPadding + out.shapeWidth + out.labelOffset)
                .attr('y', y + out.shapeHeight * 0.5)
                .attr('dy', '0.35em')
                .text(out.noDataText)
        }
    }

    function drawDivergingLine(y) {
        const container = out.lgg.append('g').attr('class', 'em-legend-divergence-container')
        const markerHeight = 6
        const x = out.boxPadding
        if (out.labelType == 'ranges') y = y + out.pointOfDivergencePadding / 2 // move to the middle of the space between legend item
        let maxLabelLength = out.lgg
            .selectAll('.em-legend-label')
            .nodes()
            .reduce((max, node) => Math.max(max, node.getBBox().width), 0)
        const lineLength = out.divergingLineLength || maxLabelLength + out.boxPadding + out.shapeWidth + 10 // + padding

        // Draw the horizontal divergence line
        container
            .append('line')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', x + lineLength)
            .attr('y2', y)
            .attr('class', 'em-legend-diverging-line')

        // divergence line with up and down arrows
        const labels = out.pointOfDivergenceLabel.split('|')
        if (labels.length > 1) {
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
                out.lgg.selectAll('.em-legend-label-divergence').attr('x', x + lineLength + 10)
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
                out.lgg.selectAll('.em-legend-label-divergence').remove()
            }
        }
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Set all regions to white
        allRegions.style('fill', 'white')

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = allRegions.filter("[ecl='" + ecl + "']")
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        const selector = getLegendRegionsSelector(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl]')

        // Restore each region's original color from the fill___ attribute
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }

    //deprecated
    out.labelDecNb = (v) => (console.warn('labelDecNb is now DEPRECATED. Please use decimals instead.'), out)

    return out
}
