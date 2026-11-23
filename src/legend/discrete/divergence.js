// The point-of-divergence line and labels of diverging discrete legends
import { getFontSizeFromClass } from '../../core/utils'

export function drawDivergingLine(out, y, config, scaleTopY, scaleBottomY) {
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const x = 0
    if (config.labelType == 'ranges') y = y + config.pointOfDivergencePadding / 2 // move to the middle of the space between legend item
    const maxLabelLength = out._discreteLegendContainer
        .selectAll('.em-legend-label')
        .filter(function () {
            return !this.classList.contains('em-legend-label-max') && !this.classList.contains('em-legend-label-min')
        })
        .nodes()
        .reduce((max, node) => Math.max(max, node.getBBox().width), 0)
    const divergingLinePadding = config.divergingLinePadding ?? 15
    const lineLength =
        config.divergingLineLength || config.shapeWidth + config.labelOffsets?.x + maxLabelLength + config.labelOffsets?.x + divergingLinePadding // rect > offset > label > offset > padding > vertical line

    const showDivergingLine = config.showDivergingLine ?? true
    if (showDivergingLine) {
        // Draw the horizontal divergence line
        container
            .append('line')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', x + lineLength)
            .attr('y2', y)
            .attr('class', 'em-legend-diverging-line')

        // Small vertical tick at the end of the line, matching other threshold ticks
        const tickLen = config.tickLength || 5
        container
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', x + lineLength)
            .attr('y1', y - tickLen / 2)
            .attr('x2', x + lineLength)
            .attr('y2', y + tickLen / 2)
    }

    const labels = config.pointOfDivergenceLabel.split('|')
    if (labels.length > 1) {
        // divergence line with up and down arrows
        const directionLineLength = config.divergingArrowLength || 30
        const directionLineX = x + lineLength
        const labelsAtExtremes = (config.pointOfDivergenceLabelsAtExtremes ?? false) && scaleTopY != null && scaleBottomY != null
        const labelsStacked = config.pointOfDivergenceLabelsStacked ?? false

        // When labels sit at the scale extremes and the caller hasn't pinned an explicit
        // arrow length, stretch each arrow to reach near its own label instead of stopping
        // at the short default length meant for a divergence-point-adjacent label.
        const extremesArrowMargin = 20
        const autoExtendArrows = labelsAtExtremes && config.divergingArrowLength == null
        const upLength = autoExtendArrows ? Math.max(y - scaleTopY - extremesArrowMargin, markerHeight) : directionLineLength
        const downLength = autoExtendArrows ? Math.max(scaleBottomY - y - extremesArrowMargin, markerHeight) : directionLineLength

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
            .attr('y2', y - upLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Downward line with arrowhead
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', directionLineX)
            .attr('y1', y)
            .attr('x2', directionLineX)
            .attr('y2', y + downLength)
            .attr('marker-end', 'url(#arrowhead)')

        // Labels for the upward and downward arrows: either beside the arrow (default) or
        // above/below its head, starting at the arrow's x position ('stacked'); either near
        // the divergence point (default) or up near the top/bottom of the whole scale ('at
        // extremes').
        const upTipY = y - upLength
        const downTipY = y + downLength

        if (labelsStacked) {
            // Gap in pixels between an arrow tip and its label, when not positioned at the
            // scale extremes (where the labels instead sit flush with the max/min value labels).
            const stackedLabelGap = 10

            const topLabel = container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX)
                .attr('y', labelsAtExtremes ? scaleTopY : upTipY - stackedLabelGap)
                .text(labels[0])
            if (labelsAtExtremes) {
                // Sits on the same y as the max stat value label (which uses dy=0.3em to center
                // its text on that y) - match it so this label never renders further north than
                // the max label's own text does.
                topLabel.attr('dy', '0.3em')
            } else {
                // Pull the text further up, away from the tip, the same way the bottom label's
                // dy pushes it further down - otherwise the (undescended) baseline sitting only
                // stackedLabelGap above the tip reads as almost touching it.
                topLabel.attr('dy', '-0.3em')
            }

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX)
                .attr('y', labelsAtExtremes ? scaleBottomY : downTipY + stackedLabelGap)
                .attr('dy', labelsAtExtremes ? '0.3em' : '0.9em')
                .text(labels[1])
        } else {
            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX + 10)
                .attr('y', labelsAtExtremes ? scaleTopY : upTipY + 10)
                .attr('dy', '0.3em')
                .text(labels[0])

            container
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('x', directionLineX + 10)
                .attr('y', labelsAtExtremes ? scaleBottomY : downTipY - 10)
                .attr('dy', '0.3em')
                .text(labels[1])
        }
    } else {
        // just the single label
        container
            .append('text')
            .attr('class', 'em-legend-diverging-label em-legend-label')
            .attr('x', x + lineLength + 5)
            .attr('y', y)
            .attr('dy', '0.3em')
            .text(config.pointOfDivergenceLabel)
    }

    // Move the threshold value label at the divergence point so it never overlaps the line -
    // only relevant when the line is actually drawn. With showDivergingLine false there's
    // nothing to overlap, so the stat value stays in its normal place next to its own tick.
    if (showDivergingLine) {
        if (labels.length > 1) {
            // Move it to the right of the line end and reparent into container
            out._discreteLegendContainer
                .selectAll('.em-legend-label-divergence')
                .each(function () {
                    container.node().appendChild(this)
                })
                .attr('x', x + lineLength + 10)
        } else {
            // Single pointOfDivergenceLabel — remove the threshold value label to avoid clashing
            out._discreteLegendContainer.selectAll('.em-legend-label-divergence').remove()
        }
    }
}

export function drawHorizontalDivergence(out, config, c) {
    const { xSeam, barWidth, titlePadding, tickLength, labelFontSize } = c
    const container = out._discreteLegendContainer.append('g').attr('class', 'em-legend-divergence-container')
    const markerHeight = 6
    const labels = config.pointOfDivergenceLabel.split('|')

    // the line runs down from the top of the bar, past the labels
    const lineLength = config.divergingLineLength || config.shapeHeight + tickLength + 2 + labelFontSize + (config.divergingLinePadding ?? 15)
    const yEnd = titlePadding + lineLength
    const showDivergingLine = config.showDivergingLine ?? true
    if (showDivergingLine) {
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', titlePadding)
            .attr('x2', xSeam)
            .attr('y2', yEnd)
        const tickLen = config.tickLength || 5
        container
            .append('line')
            .attr('class', 'em-legend-tick')
            .attr('x1', xSeam - tickLen / 2)
            .attr('y1', yEnd)
            .attr('x2', xSeam + tickLen / 2)
            .attr('y2', yEnd)
    }

    if (labels.length > 1) {
        // arrows pointing left (lower values) and right (higher values). labels[0] is the "top" label of the
        // vertical legend, i.e. the high end when ascending, so it goes on the right in that case.
        const rightText = out.ascending ? labels[0] : labels[1]
        const leftText = out.ascending ? labels[1] : labels[0]
        const arrowLength = config.divergingArrowLength || 30
        const atExtremes = config.pointOfDivergenceLabelsAtExtremes ?? false
        const stacked = config.pointOfDivergenceLabelsStacked ?? false

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

        const makeLabel = (text, x, y, anchor, dy) =>
            container.append('text').attr('class', 'em-legend-label').attr('x', x).attr('y', y).attr('dy', dy).attr('text-anchor', anchor).text(text)

        // when the labels sit at the extremes, draw them first so the arrows can stretch up to them
        let leftLen = arrowLength
        let rightLen = arrowLength
        if (atExtremes) {
            const leftLabel = makeLabel(leftText, 0, yEnd, 'start', '0.3em')
            const rightLabel = makeLabel(rightText, barWidth, yEnd, 'end', '0.3em')
            if (config.divergingArrowLength == null) {
                leftLen = Math.max(xSeam - leftLabel.node().getBBox().width - 10, markerHeight)
                rightLen = Math.max(barWidth - xSeam - rightLabel.node().getBBox().width - 10, markerHeight)
            }
        }
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', yEnd)
            .attr('x2', xSeam - leftLen)
            .attr('y2', yEnd)
            .attr('marker-end', 'url(#arrowhead)')
        container
            .append('line')
            .attr('class', 'em-legend-diverging-line')
            .attr('x1', xSeam)
            .attr('y1', yEnd)
            .attr('x2', xSeam + rightLen)
            .attr('y2', yEnd)
            .attr('marker-end', 'url(#arrowhead)')

        if (!atExtremes) {
            if (stacked) {
                // above each arrow, running outwards from the line
                makeLabel(leftText, xSeam - 6, yEnd - 4, 'end', '0')
                makeLabel(rightText, xSeam + 6, yEnd - 4, 'start', '0')
            } else {
                // beyond each arrow tip
                makeLabel(leftText, xSeam - leftLen - 8, yEnd, 'end', '0.3em')
                makeLabel(rightText, xSeam + rightLen + 8, yEnd, 'start', '0.3em')
            }
        }

        // the threshold value at the divergence seam would sit under the line: move it below the arrows' junction
        if (showDivergingLine) {
            out._discreteLegendContainer.selectAll('.em-legend-label-divergence').each(function () {
                container.node().appendChild(this)
            })
            container
                .selectAll('.em-legend-label-divergence')
                .attr('x', xSeam)
                .attr('y', yEnd + 4)
                .attr('dy', '0.9em')
        }
    } else {
        // single label under the end of the line; it replaces the threshold value at that seam
        container
            .append('text')
            .attr('class', 'em-legend-diverging-label em-legend-label')
            .attr('x', xSeam)
            .attr('y', yEnd + 4)
            .attr('dy', '0.9em')
            .attr('text-anchor', 'middle')
            .text(config.pointOfDivergenceLabel)
        if (showDivergingLine) out._discreteLegendContainer.selectAll('.em-legend-label-divergence').remove()
    }
}
