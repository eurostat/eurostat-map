// Vertical discrete colour legend: a stack of class swatches labelled by range or by threshold
import { appendLegendSwatchRows, rangesDecorator, swatchStackLayout, thresholdsDecorator } from '../legend-swatch'
import { highlightClass, getTitlePadding } from './shared'
import { drawDivergingLine } from './divergence'
import { appendVerticalMaxMin } from './max-min'

/** Swatches as {color, hover handlers} items, in legend order (descending legends list the top class first). */
function classItems(out, numberOfClasses) {
    const map = out.map
    const highlightFunction = out.getHighlightFunction(map)
    const unhighlightFunction = out.getUnHighlightFunction(map)
    const classToFillStyle = out.getClassToFillStyle(out)
    const items = []
    for (let i = 0; i < numberOfClasses; i++) {
        const ecl = out.ascending ? numberOfClasses - i - 1 : i
        items.push({
            ecl,
            color: classToFillStyle(ecl, numberOfClasses),
            onEnter: () => highlightClass(map, highlightFunction, ecl),
            onLeave: () => highlightClass(map, unhighlightFunction, ecl),
        })
    }
    return items
}

/** Draw the point-of-divergence line once the labels exist, so it can clear the widest one. */
function appendDivergence(out, config, numberOfClasses, titlePadding) {
    if (!config.pointOfDivergenceLabel) return
    const stack = swatchStackLayout({ count: numberOfClasses, shapeHeight: config.shapeHeight, startY: titlePadding })
    for (let i = 0; i < numberOfClasses; i++) {
        if (i == config.pointOfDivergence) drawDivergingLine(out, stack.rowY(i), config, stack.top, stack.bottom)
    }
}

/** Swatches with a label at each boundary between classes (the 'thresholds' label type). */
export function createThresholdsLegend(out, config) {
    const map = out.map
    const numberOfClasses = out.getNumberOfClasses(out)
    const titlePadding = getTitlePadding(out)
    const classifier = out.getColorClassifier(out)
    const labelFormatter = out.getLabelFormatter(out)
    const sepLineLength = config.sepLineLength ?? config.shapeWidth

    appendLegendSwatchRows(out._discreteLegendContainer, classItems(out, numberOfClasses), {
        shapeWidth: config.shapeWidth,
        shapeHeight: config.shapeHeight,
        startY: titlePadding,
        decorate: thresholdsDecorator({
            count: numberOfClasses,
            sepLength: sepLineLength,
            tickLength: config.tickLength,
            labelX: Math.max(config.shapeWidth, sepLineLength + config.tickLength) + (config.labelOffsets.x || 0),
            shapeHeight: config.shapeHeight,
            labelText: (i, item) => {
                if (config.labels) return config.labels[i]
                if (classifier?.invertExtent) return labelFormatter(classifier.invertExtent(item.ecl)[out.ascending ? 0 : 1])
                return map.noDataText_ || ''
            },
            // mark the label at the divergence so drawDivergingLine can move it
            onLabel: (label, i) => {
                if (config.pointOfDivergenceLabel && i == config.pointOfDivergence - 1) label.attr('class', 'em-legend-label em-legend-label-divergence')
            },
        }),
    })

    appendVerticalMaxMin(out, config, {
        container: out._discreteLegendContainer,
        titlePadding,
        numberOfClasses,
        sepLineLength,
        classifier,
        labelFormatter,
    })
    appendDivergence(out, config, numberOfClasses, titlePadding)
}

/** Swatches each labelled with its own range (the 'ranges' label type). */
export function createRangesLegend(out, config) {
    const numberOfClasses = out.getNumberOfClasses(out)
    const labelFormatter = out.getLabelFormatter(out)
    const colorClassifier = out.getColorClassifier(out)
    const titlePadding = getTitlePadding(out)
    const sepLineLength = config.sepLineLength ?? config.shapeWidth

    const items = classItems(out, numberOfClasses).map((item, i) => ({
        ...item,
        // shift legend items down after the point of divergence if applicable
        yOffset: config.pointOfDivergenceLabel && i >= config.pointOfDivergence ? config.pointOfDivergencePadding : 0,
        label: config.labels ? config.labels[i] : labelFormatter(colorClassifier.invertExtent(item.ecl)[out.ascending ? 0 : 1], i),
    }))
    appendLegendSwatchRows(out._discreteLegendContainer, items, {
        shapeWidth: config.shapeWidth,
        shapeHeight: config.shapeHeight,
        startY: titlePadding,
        labelX: Math.max(config.shapeWidth, sepLineLength + config.tickLength) + (config.labelOffsets.x || 0),
        decorate: rangesDecorator(sepLineLength),
    })

    appendDivergence(out, config, numberOfClasses, titlePadding)
}
