// Horizontal variant of the discrete colour legend
import { select } from 'd3-selection'
import { getFontSizeFromClass } from '../../core/utils'
import { appendLegendSwatch, appendLegendSwatchLabel, swatchBarLayout } from '../legend-swatch'
import { highlightClass, getTitlePadding } from './shared'
import { appendExtraSwatchRow, extraSwatchRows } from './extras'
import { drawHorizontalDivergence } from './divergence'
import { resolveMaxMin } from './max-min'
import { legendsBelowMap } from '../../core/legend-below'

/**
 * Horizontal variant of the discrete legend (orientation: 'horizontal'): one contiguous bar of
 * class swatches running low -> high from left to right, `config.width` pixels wide in total
 * (shared equally between the classes), with the class thresholds (labelType 'thresholds') labelled
 * under the seams between swatches, or each class's range (labelType 'ranges') centred under its
 * own swatch. Supports the same maxMin / maxMinLabels / maxMinRegionLabels and point-of-divergence
 * options as the vertical layout (the divergence line is vertical, with its arrows pointing left/right).
 */
export function createHorizontalLegend(out, config) {
    const map = out.map
    const container = out._discreteLegendContainer
    const n = out.getNumberOfClasses(out)
    const titlePadding = getTitlePadding(out)
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    const classifier = out.getColorClassifier(out)
    const classToFillStyle = out.getClassToFillStyle(out)
    const labelFormatter = out.getLabelFormatter(out)
    const ranges = out.labelType === 'ranges' || out.colorLegend?.labelType === 'ranges'
    const barWidth = config.width ?? out.width
    const tickLength = config.tickLength ?? 4
    const barBottom = titlePadding + config.shapeHeight
    const labelY = barBottom + tickLength + 2
    const labelFontSize = getFontSizeFromClass('em-legend-label') || 12

    // Point of divergence: s = number of classes to the left of the divergence seam. The config index counts
    // from the top of the equivalent vertical legend, so it is mirrored when the vertical one would be ascending.
    const hasDivergence = !!config.pointOfDivergenceLabel && config.pointOfDivergence != null
    let s = null
    if (hasDivergence) {
        const idx = config.pointOfDivergence
        s = out.ascending ? n - idx : idx
        if (!(s >= 0 && s <= n)) s = null
    }
    // in 'ranges' mode the classes after the divergence seam shift right to leave a gap for the line
    const gap = s !== null && ranges ? (config.pointOfDivergencePadding ?? 0) : 0
    const bar = swatchBarLayout({ count: n, width: barWidth, breakAt: s, breakSize: gap })
    const { itemWidth, itemX, seamX } = bar

    // low -> high from left to right, whichever way the vertical legend would be ordered
    for (let j = 0; j < n; j++) {
        const x = itemX(j)
        const ecl = j
        const itemContainer = container.append('g').attr('class', 'em-legend-item')

        appendLegendSwatch(itemContainer, {
            x,
            y: titlePadding,
            width: itemWidth,
            height: config.shapeHeight,
            color: classToFillStyle(ecl, n),
            onEnter: () => highlightClass(map, highlightFunction, ecl),
            onLeave: () => highlightClass(map, unhighlightFunction, ecl),
        })

        if (j > 0 && !(gap && j === s)) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-separator')
                .attr('x1', x)
                .attr('y1', titlePadding)
                .attr('x2', x)
                .attr('y2', barBottom)
        }

        if (ranges) {
            // vertical-legend index of this class, as labelFormatter's 'ranges' mode expects
            const i = out.ascending ? n - 1 - j : j
            const text = config.labels
                ? config.labels[i]
                : classifier?.invertExtent
                  ? labelFormatter(classifier.invertExtent(ecl)[out.ascending ? 0 : 1], i)
                  : ''
            appendLegendSwatchLabel(itemContainer, { x: x + itemWidth / 2, y: barBottom + 4, dy: '0.9em', anchor: 'middle', text })
        } else if (j < n - 1) {
            // threshold between class j and j+1
            const sx = seamX(j)
            itemContainer
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', sx)
                .attr('y1', barBottom)
                .attr('x2', sx)
                .attr('y2', barBottom + tickLength)
            const text = config.labels
                ? config.labels[out.ascending ? n - 2 - j : j]
                : classifier?.invertExtent
                  ? labelFormatter(classifier.invertExtent(ecl)[1])
                  : ''
            const label = appendLegendSwatchLabel(itemContainer, { x: sx, y: labelY, dy: '0.9em', anchor: 'middle', text })
            // mark the label at the divergence seam so drawHorizontalDivergence can move it
            if (hasDivergence && j + 1 === s) label.attr('class', 'em-legend-label em-legend-label-divergence')
        }
    }

    // Range labels are wide ('98.9 − < 133.9'): when neighbours would touch, alternate them onto a second row
    if (ranges) {
        const rowEnds = [-Infinity, -Infinity]
        container.selectAll('.em-legend-item > text.em-legend-label').each(function () {
            const box = this.getBBox()
            let row = rowEnds[0] + 3 < box.x ? 0 : rowEnds[1] + 3 < box.x ? 1 : 0
            if (row === 1) select(this).attr('y', barBottom + 4 + labelFontSize + 2)
            rowEnds[row] = box.x + box.width
        })
    }

    // Max / min bounds: a tick and label at each end of the bar, from the stat data extent
    // (like the vertical legend, bounds only exist for threshold labels)
    if (!ranges) {
        drawHorizontalMaxMin(out, config, { n, barWidth, barBottom, labelY, tickLength, labelFontSize, classifier, labelFormatter })
    }

    // Point of divergence line + labels (drawn last so it can see the label sizes)
    if (hasDivergence && s !== null) {
        const xSeam = bar.breakX
        drawHorizontalDivergence(out, config, { xSeam, barWidth, titlePadding, tickLength, labelFontSize })
    }
}

function drawHorizontalMaxMin(out, config, c) {
    const { n, barWidth, barBottom, labelY, tickLength, labelFontSize, classifier, labelFormatter } = c
    const container = out._discreteLegendContainer
    // low -> high from left to right: the top class is the last one
    const mm = resolveMaxMin(out, config, { classifier, labelFormatter, topEcl: n - 1, bottomEcl: 0 })
    if (!mm) return

    const group = container.append('g').attr('class', 'em-legend-max-min-group')
    const tickEnd = barBottom + (config.maxMinTickLength ?? tickLength)
    const add = (isMax, x, text, onOver) => {
        const kind = isMax ? 'max' : 'min'
        const tick = group
            .append('line')
            .attr('class', `em-legend-tick em-legend-tick-${kind}`)
            .attr('x1', x)
            .attr('y1', barBottom)
            .attr('x2', x)
            .attr('y2', tickEnd)
        const label = group
            .append('text')
            .style('pointer-events', 'all')
            .style('cursor', 'pointer')
            .on('mouseover', onOver)
            .on('mouseout', mm.unhighlight)
            .attr('class', `em-legend-label em-legend-label-${kind}`)
            .attr('x', x)
            .attr('y', labelY)
            .attr('dy', '0.9em')
            // end labels are anchored inwards so they never stick out of the legend box
            .attr('text-anchor', isMax ? 'end' : 'start')
            .text(text)
        return { tick, label }
    }
    const items = []
    if (mm.showMin) items.push(add(false, 0, mm.minLabel, mm.highlightMin))
    if (mm.showMax) items.push(add(true, barWidth, mm.maxLabel, mm.highlightMax))

    // if an end label runs into a neighbouring threshold label, drop it onto a second row
    const others = container
        .selectAll('.em-legend-label')
        .filter(function () {
            return !this.classList.contains('em-legend-label-max') && !this.classList.contains('em-legend-label-min')
        })
        .nodes()
    items.forEach(({ tick, label }) => {
        const box = label.node().getBBox()
        const clash = others.some((o) => {
            const ob = o.getBBox()
            return ob.x < box.x + box.width + 2 && ob.x + ob.width + 2 > box.x
        })
        if (clash) {
            const rowY = labelY + labelFontSize + 4
            label.attr('y', rowY)
            tick.attr('y2', rowY)
        }
    })
}

/** No-data and extra category swatches for the horizontal layout: a row to the right of the bar. */
export function appendHorizontalExtraItems(out, config) {
    const barWidth = config.width ?? out.width
    const rows = extraSwatchRows(out, config)
    if (legendsBelowMap(out.map)) {
        // the legend is as wide as the map: the extra items (no data) go under the bar, not beside it, where they would be off the map
        const box = out._discreteLegendContainer.node().getBBox()
        appendExtraSwatchRow(out, rows, 0, box.y + box.height + 8)
        return
    }
    appendExtraSwatchRow(out, rows, barWidth + 16, getTitlePadding(out))
}
