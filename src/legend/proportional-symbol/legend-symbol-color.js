import { executeForAllInsets, spaceAsThousandSeparator } from '../../core/utils'
import { highlightRegions, unhighlightRegions } from './legend-proportional-symbols'

/**
 * Builds a legend illustrating the statistical values of different symbol colours
 *
 * @param {*} m map
 */
export function buildColorLegend(out, baseX, baseY) {
    // color legend main container
    out._colorLegendContainer = out.lgg.append('g').attr('class', 'color-legend-container')

    if (out._sizeLegendContainer) {
        // position it below size legend ( + out.colorLegend.marginTop)
        out._colorLegendContainer.attr(
            'transform',
            `translate(${baseX},${out._sizeLegendContainer.node().getBBox().height + out.colorLegend.marginTop})`
        )
    } else {
        out._colorLegendContainer.attr('transform', `translate(${baseX},${baseY})`)
    }

    if (out.colorLegend.labelType === 'ranges') {
        buildColorRangesLegend(out)
    } else {
        buildColorThresholdsLegend(out)
    }

    // Optionally add no-data
    if (out.colorLegend.noData) {
        const y = baseY + out.map.psClasses_ * (out.colorLegend.shapeHeight + out.colorLegend.shapePadding)
        const x = 0
        const container = out._colorLegendContainer.append('g').attr('class', 'em-no-data-legend').attr('transform', `translate(${x},${y})`)
        out.appendNoDataLegend(container, out.colorLegend.noDataText, highlightRegions, unhighlightRegions)
    }
}

function getColorThresholds(out) {
    const map = out.map
    const thresholds =
        map.psThresholds_.length > 1
            ? map.psThresholds_
            : Array.from({ length: map.psClasses_ })
                  .map((_, index) => {
                      return map.classifierColor_.invertExtent(index)[out.ascending ? 0 : 1]
                  })
                  .slice(1) // Remove the first entry and return the rest as an array
    return thresholds
}

function buildColorRangesLegend(out) {
    const map = out.map
    const f = out.colorLegend.labelFormatter || spaceAsThousandSeparator
    const thresholds = getColorThresholds(out)
    const numberOfClasses = map.psClasses_
    const container = out._colorLegendContainer
    const x = 0 // x position of color legend cells
    let y

    //title
    if (out.colorLegend.title) {
        container
            .append('text')
            .attr('class', 'em-legend-title')
            .attr('x', x)
            .attr('y', out.titleFontSize + out.colorLegend.marginTop)
            .text(out.colorLegend.title)
    }

    for (let i = 0; i < numberOfClasses; i++) {
        y =
            out.titleFontSize +
            out.colorLegend.titlePadding +
            out.colorLegend.marginTop +
            i * (out.colorLegend.shapeHeight + out.colorLegend.shapePadding)

        const ecl = out.ascending ? i : numberOfClasses - i - 1

        const itemContainer = container.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-legend-item')

        // Rectangle
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .style('fill', map.psClassToFillStyle()(ecl, numberOfClasses))
            .attr('width', out.colorLegend.shapeWidth)
            .attr('height', out.colorLegend.shapeHeight)
            .on('mouseover', function () {
                highlightRegions(map, ecl)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(map)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions)
                }
            })

        // Label
        itemContainer
            .append('text')
            .attr('class', 'em-legend-label')
            .attr('dy', '0.35em') // ~vertical centering
            .attr('x', out.colorLegend.shapeWidth + out.colorLegend.labelOffset.x)
            .attr('y', out.colorLegend.shapeHeight / 2)
            .text(() => {
                if (out.colorLegend.labels) return out.colorLegend.labels[i] // user-defined labels
                if (i === 0) return `> ${f(thresholds[thresholds.length - 1])}`
                if (i === thresholds.length) return `< ${f(thresholds[0])}`
                return `${f(thresholds[thresholds.length - i - 1])} - < ${f(thresholds[thresholds.length - i])}`
            })
    }
}

function buildColorThresholdsLegend(out) {
    //define format for labels
    const labelFormatter = out.colorLegend.labelFormatter || spaceAsThousandSeparator

    //title
    if (out.colorLegend.title) {
        out._colorLegendContainer
            .append('text')
            .attr('class', 'em-legend-title')
            .attr('x', out.boxPadding)
            .attr('y', out.titleFontSize + out.colorLegend.marginTop)
            .text(out.colorLegend.title)
    }

    // x position of color legend cells
    let x = 0

    //draw legend elements for classes: rectangle + label
    let numberOfClasses = map.psClasses_

    for (let i = 0; i < numberOfClasses; i++) {
        //the vertical position of the legend element
        let y = out.titleFontSize + out.colorLegend.titlePadding + out.colorLegend.marginTop + i * out.colorLegend.shapeHeight // account for title + margin

        //the class number, depending on order
        const ecl = out.ascending ? i : numberOfClasses - i - 1

        let itemContainer = out._colorLegendContainer.append('g').attr('transform', `translate(${x},${y})`).attr('class', 'em-legend-item')

        //append symbol & style
        itemContainer
            .append('rect')
            .attr('class', 'em-legend-rect')
            .style('fill', map.psClassToFillStyle()(ecl, numberOfClasses))
            .attr('width', out.colorLegend.shapeWidth)
            .attr('height', out.colorLegend.shapeHeight)
            .on('mouseover', function () {
                highlightRegions(map, ecl)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, highlightRegions, ecl)
                }
            })
            .on('mouseout', function () {
                unhighlightRegions(map)
                if (map.insetTemplates_) {
                    executeForAllInsets(map.insetTemplates_, map.svgId, unhighlightRegions, ecl)
                }
            })

        //separation line
        if (i > 0) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-separator')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 0 + out.colorLegend.sepLineLength)
                .attr('y2', 0)
        }

        // Append tick line
        if (i > 0) {
            itemContainer
                .append('line')
                .attr('class', 'em-legend-tick')
                .attr('x1', out.colorLegend.shapeWidth)
                .attr('y1', 0)
                .attr('x2', out.colorLegend.sepLineLength + out.colorLegend.tickLength)
                .attr('y2', 0)
        }

        //label
        if (i < numberOfClasses - 1) {
            itemContainer
                .append('text')
                .attr('class', 'em-legend-label')
                .attr('dy', '0.35em') // ~vertical centering
                .attr('x', out.colorLegend.sepLineLength + out.colorLegend.tickLength + out.colorLegend.labelOffset.x)
                .attr('y', out.colorLegend.shapeHeight)
                .text(
                    out.colorLegend.labels
                        ? out.colorLegend.labels[i]
                        : labelFormatter(map.classifierColor_.invertExtent(out.ascending ? ecl + 1 : ecl - 1)[out.ascending ? 0 : 1])
                )
        }
    }
}
