import { select, selectAll } from 'd3-selection'
import * as Legend from '../legend'
import { line } from 'd3-shape'
import { executeForAllInsets, getFontSizeFromClass, getLegendRegionsSelector } from '../../core/utils'
//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */

/**
 * A legend for choropleth-bivariate maps
 *
 * @param {MapInstance} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //size
    out.squareSize = 100

    //orientation
    out.rotation = 0

    //labels
    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'
    out.axisExtremes = {
        x: { low: 'Low', high: 'High' },
        y: { low: 'Low', high: 'High' },
    }

    //corner annotations
    out.annotations = {
        topLeft: undefined,
        topRight: undefined,
        bottomLeft: undefined,
        bottomRight: undefined,
    }
    out.annotationLineLength = 18
    out.annotationPadding = 8

    //get the font size of the texts
    out.axisTitleFontSize = getFontSizeFromClass('em-bivariate-axis-title')

    //breaks
    out.breaks1 = undefined
    out.breaks2 = undefined
    out.showBreaks = false // if set to true and breaks1 and breaks2 are undefined then breaks are automatically defined
    out.tickLength = 5 // length of the ticks

    //axis
    out.yAxisLabelsOffset = { x: 0, y: 0 }
    out.xAxisLabelsOffset = { x: 0, y: 0 }

    //axis titles
    out.yAxisTitleOffset = { x: 0, y: 0 }
    out.xAxisTitleOffset = { x: 0, y: 0 }

    //override padding
    out.boxPadding = out.labelFontSize

    //add extra distance between legend and no data item
    out.noDataYOffset = 30

    //arrows
    out.axisArrows = true // if set to true, arrows are drawn at the end of the axes
    out.arrowHeight = 5
    out.arrowWidth = 5
    out.arrowPadding = 12 // padding between arrow and axis label

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    if (config?.axisExtremes) {
        out.axisExtremes = {
            x: { ...(out.axisExtremes?.x || {}), ...(config.axisExtremes.x || {}) },
            y: { ...(out.axisExtremes?.y || {}), ...(config.axisExtremes.y || {}) },
        }
    }

    if (config?.annotations) {
        out.annotations = { ...out.annotations, ...config.annotations }
    }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        // Horizontal shift to move everything right (adjust this value as needed)
        out._horizontalOffset = out.axisTitleFontSize + out.arrowPadding // Adjust this value to move the whole legend to the right

        // Remove previous content
        out.lgg.selectAll('*').remove()

        // Draw background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // The vertical position of the legend element
        out._y = out.boxPadding + (out.title ? out.titleFontSize + out.boxPadding : 0)

        // Square group with horizontal offset
        addSquares()

        // set breaks if user hasnt defined them but has enabled them
        // set breaks if user hasn't defined them but has enabled them
        if (!out.breaks1 && !out.breaks2 && out.showBreaks) {
            // Extract breaks from classifier1_
            const c1 = map.classifier1_
            if (typeof c1.quantiles === 'function') {
                out.breaks1 = c1.quantiles().map((d) => parseFloat(d.toFixed(0)))
            } else if (c1.domain) {
                out.breaks1 = c1.domain().map((d) => parseFloat(d.toFixed(0)))
            }

            // Extract breaks from classifier2_
            const c2 = map.classifier2_
            if (typeof c2.quantiles === 'function') {
                out.breaks2 = c2.quantiles().map((d) => parseFloat(d.toFixed(0)))
            } else if (c2.domain) {
                out.breaks2 = c2.domain().map((d) => parseFloat(d.toFixed(0)))
            }
        }

        // Draw breaks labels 1 (X axis)
        addBreakLabels()

        out._xAxisArrowY = 0
        out._yAxisArrowX = 0
        if (out.axisArrows) {
            computeAxisArrowAnchors()
        }

        addAxisTitles()
        addAxisEndpointLabels()
        if (out.axisArrows) {
            addAxisArrows()
        }
        addCornerAnnotations()

        // Arrow defs
        out.lgg
            .append('defs')
            .append('marker')
            .attr('viewBox', `0 0 ${out.arrowWidth} ${out.arrowHeight}`)
            .attr('id', 'arrowhead')
            .attr('class', 'em-bivariate-arrowhead')
            .attr('refX', 0)
            .attr('refY', out.arrowHeight / 2)
            .attr('markerWidth', out.arrowWidth)
            .attr('markerHeight', out.arrowHeight)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', `M 0 0 L ${out.arrowWidth} ${out.arrowHeight / 2} L 0 ${out.arrowHeight}`)
            .attr('markerUnits', 'userSpaceOnUse')

        // 'No data' legend box
        if (out.noData) {
            addNoDataElement()
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    function addNoDataElement() {
        const noDataYOffset =
            out.rotation === 0 ? out.noDataYOffset + out.squareSize / out.map.numberOfClasses_ + out.arrowHeight / 2 : out.noDataYOffset

        const noDataY =
            out.rotation === 0 ? out._y + out.squareSize + noDataYOffset : out._y + 1.4142 * out.squareSize + out.boxPadding * 2 + noDataYOffset

        const container = out.lgg
            .append('g')
            .attr('class', 'em-no-data-legend')
            .attr('transform', `translate(${out.boxPadding}, ${noDataY + (out.rotation == 0 ? 0 : -10)})`)

        const highlightNd = (map) => {
            const selector = getLegendRegionsSelector(map)
            const dimmedFill = Legend.getDimmedFill(map)
            const allRegions = map.svg_.selectAll(selector).selectAll('[ecl1]')
            allRegions.each(function () {
                const sel = select(this)
                if (!sel.attr('data-fill')) sel.attr('data-fill', sel.style('fill'))
            })
            allRegions.style('fill', dimmedFill)
            allRegions.filter("[nd='nd']").each(function () {
                select(this).style('fill', select(this).attr('data-fill'))
            })
        }

        const unhighlightNd = (map) => {
            const selector = getLegendRegionsSelector(map)
            map.svg_
                .selectAll(selector)
                .selectAll('[ecl1]')
                .each(function () {
                    const sel = select(this)
                    const original = sel.attr('data-fill')
                    if (original) sel.style('fill', original)
                })
        }

        out.appendNoDataLegend(container, out.noDataText, highlightNd, unhighlightNd)
    }

    function addSquares() {
        const lgg = out.lgg
        const numberOfClasses = out.map.numberOfClasses_ || 3
        const sz = out.squareSize / numberOfClasses
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        const square = lgg
            .append('g')
            .attr('class', 'bivariate-squares-chart')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        // Draw rectangles
        for (let i = 0; i < numberOfClasses; i++) {
            for (let j = 0; j < numberOfClasses; j++) {
                const ecl1 = numberOfClasses - i - 1
                const ecl2 = numberOfClasses - j - 1
                const fill = out.map.classToFillStyle_(ecl1, ecl2)

                square
                    .append('rect')
                    .attr('class', 'em-bivariate-square')
                    .attr('x', initialX + (numberOfClasses - 1 - i) * sz)
                    .attr('y', j * sz)
                    .attr('width', sz)
                    .attr('height', sz)
                    .style('fill', fill)
                    .on('mouseover', function () {
                        highlightBivariateRegions(out.map, ecl1, ecl2)
                        if (out.map.insetTemplates_) {
                            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightBivariateRegions, ecl1, ecl2)
                        }
                        select(this).raise() // raise legend square to avoid stroke issue
                    })
                    .on('mouseout', function () {
                        unhighlightBivariateRegions(out.map)
                        if (out.map.insetTemplates_) {
                            executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightBivariateRegions, ecl1, ecl2)
                        }
                    })
            }
        }

        // Frame
        square
            .append('rect')
            .attr('class', 'em-bivariate-frame')
            .attr('x', initialX)
            .attr('y', 0)
            .attr('width', out.squareSize)
            .attr('height', out.squareSize)
            .attr('stroke-width', 0.7)
    }

    function addBreakLabels() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0
        const numberOfClasses = out.map.numberOfClasses()
        const sz = out.squareSize / numberOfClasses

        // group with horizontal offset
        const breakLabels = out.lgg
            .append('g')
            .attr('class', 'bivariate-break-labels')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )
        if (out.breaks1) {
            for (let i = 0; i < out.breaks1.length; i++) {
                const x = initialX + sz * (i + 1)
                const y = out.squareSize + getFontSizeFromClass('em-bivariate-tick-label')

                breakLabels
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.xAxisLabelsOffset.x)
                    .attr('y', y + out.xAxisLabelsOffset.y)
                    .text(out.breaks1[i])

                breakLabels
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', out.squareSize)
                    .attr('y2', out.squareSize + out.tickLength)
            }
        }

        // Draw breaks labels 2 (Y axis)
        if (out.breaks2) {
            for (let i = 0; i < out.breaks2.length; i++) {
                const x = initialX
                const y = sz * (i + 2) - sz

                breakLabels
                    .append('text')
                    .attr('class', 'em-bivariate-tick-label')
                    .attr('x', x + out.yAxisLabelsOffset.x)
                    .attr('y', y - out.yAxisLabelsOffset.y - (out.tickLength + 2))
                    .text([...out.breaks2].reverse()[i])
                    .attr('text-anchor', 'middle')
                    .attr('transform', `rotate(-90, ${x}, ${y})`)

                breakLabels
                    .append('line')
                    .attr('class', 'em-bivariate-tick')
                    .attr('x1', x)
                    .attr('x2', x - out.tickLength)
                    .attr('y1', y)
                    .attr('y2', y)
            }
        }
    }

    function addAxisTitles() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        const axisTitles = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-titles')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        // X axis title
        let xAxisTitleY = out.squareSize + out.xAxisLabelsOffset.y + (out.axisArrows ? out.arrowPadding + out.arrowHeight : 7)
        let xAxisTitleX = initialX
        if (out.showBreaks || (out.breaks1 && out.breaks2)) xAxisTitleY += getFontSizeFromClass('em-bivariate-tick-label') // move over for tick labels
        if (out.xAxisTitleOffset) xAxisTitleY += out.xAxisTitleOffset.y
        if (out.xAxisTitleOffset) xAxisTitleX += out.xAxisTitleOffset.x
        axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-x')
            .attr('x', xAxisTitleX)
            .attr('y', xAxisTitleY)
            .text(out.label1)
            .attr('dominant-baseline', 'hanging')
            .attr('alignment-baseline', 'hanging')

        // Y axis title
        let yAxisTitleY = (out.axisArrows ? out._yAxisArrowX - out.arrowPadding : 7) + (out.rotation == -45 ? -4 : -10) // adjust for rotation
        if (out.showBreaks || (out.breaks1 && out.breaks2)) xAxisTitleY += getFontSizeFromClass('em-bivariate-tick-label') // move over for tick labels
        let yAxisTitleX = -out.squareSize
        //manual offsets
        if (out.yAxisTitleOffset) yAxisTitleY += out.yAxisTitleOffset.y
        if (out.yAxisTitleOffset) yAxisTitleX += out.yAxisTitleOffset.x
        axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-y')
            .attr('x', yAxisTitleX)
            .attr('y', yAxisTitleY)
            .text(out.label2)
            .style('transform', out.rotation < 0 ? `translate(${out.axisArrows ? -51 : -15}px, 95px) rotate(90deg)` : 'rotate(-90deg)')
    }

    function addAxisEndpointLabels() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0

        const axisLabels = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-endpoint-labels')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        let xAxisLineY = out.squareSize + out.tickLength
        if (out.showBreaks || (out.breaks1 && out.breaks2)) {
            xAxisLineY += getFontSizeFromClass('em-bivariate-tick-label') / 1.5
        }

        let yAxisLineX = -out.tickLength
        if (out.showBreaks || (out.breaks1 && out.breaks2)) {
            yAxisLineX -= out.labelFontSize / 2
        }

        const xLabelY = xAxisLineY + (out.axisArrows ? out.arrowHeight + 2 : 8)
        const yLabelX = yAxisLineX - (out.axisArrows ? out.arrowHeight + 2 : 8)

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-x-low')
            .attr('x', initialX)
            .attr('y', xLabelY)
            .text(out.axisExtremes?.x?.low || 'Low')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-x-high')
            .attr('x', initialX + out.squareSize)
            .attr('y', xLabelY)
            .text(out.axisExtremes?.x?.high || 'High')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-y-low')
            .attr('x', yLabelX)
            .attr('y', out.squareSize)
            .text(out.axisExtremes?.y?.low || 'Low')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-y-high')
            .attr('x', yLabelX)
            .attr('y', 0)
            .text(out.axisExtremes?.y?.high || 'High')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
    }

    function addCornerAnnotations() {
        if (!out.annotations) return

        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const corners = {
            topLeft: [0, 0],
            topRight: [out.squareSize, 0],
            bottomLeft: [0, out.squareSize],
            bottomRight: [out.squareSize, out.squareSize],
        }
        const cx = out.squareSize / 2
        const cy = out.squareSize / 2

        const annotationsGroup = out.lgg
            .append('g')
            .attr('class', 'bivariate-corner-annotations')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        Object.entries(corners).forEach(([cornerName, point]) => {
            const text = out.annotations?.[cornerName]
            if (!text || typeof text !== 'string' || !text.trim()) return

            const [x0, y0] = point
            const vx = x0 - cx
            const vy = y0 - cy
            const norm = Math.hypot(vx, vy) || 1
            const ux = vx / norm
            const uy = vy / norm
            const cornerPadding = getAnnotationPadding(cornerName)

            const x1 = x0 + ux * out.annotationLineLength
            const y1 = y0 + uy * out.annotationLineLength
            const tx = x1 + ux * cornerPadding
            const ty = y1 + uy * cornerPadding

            const anchor = ux > 0.2 ? 'start' : ux < -0.2 ? 'end' : 'middle'
            const lines = splitAnnotationLines(text)

            annotationsGroup
                .append('line')
                .attr('class', 'em-bivariate-corner-annotation-line')
                .attr('x1', x0)
                .attr('y1', y0)
                .attr('x2', x1)
                .attr('y2', y1)

            const annotationText = annotationsGroup
                .append('text')
                .attr('class', 'em-bivariate-corner-annotation')
                .attr('x', tx)
                .attr('y', ty)
                .attr('text-anchor', anchor)
                .attr('dominant-baseline', 'middle')

            if (out.rotation === -45) {
                annotationText.attr('transform', `rotate(45 ${tx} ${ty})`)
            }

            appendMultilineText(annotationText, lines, tx)
        })
    }

    function getAnnotationPadding(cornerName) {
        const padding = out.annotationPadding
        if (typeof padding === 'number' && Number.isFinite(padding)) {
            return padding
        }
        if (padding && typeof padding === 'object') {
            // Accept legacy typo key 'ropRight' as alias for 'topRight'.
            const key = cornerName === 'topRight' && padding.topRight == null ? 'ropRight' : cornerName
            const value = padding[key]
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value
            }
        }
        return 8
    }

    function splitAnnotationLines(text) {
        const breakPattern = new RegExp('<br\\s*\\/?>(?:\\r?\\n)?|\\r?\\n', 'gi')
        return text
            .split(breakPattern)
            .map((line) => line.trim())
            .filter(Boolean)
    }

    function appendMultilineText(textSelection, lines, x) {
        if (!lines.length) return
        if (lines.length === 1) {
            textSelection.text(lines[0])
            return
        }

        const lineHeight = 1.15
        const startDy = -((lines.length - 1) * lineHeight) / 2

        lines.forEach((line, index) => {
            textSelection
                .append('tspan')
                .attr('x', x)
                .attr('dy', `${index === 0 ? startDy : lineHeight}em`)
                .text(line)
        })
    }

    function addAxisArrows() {
        const xc = out.rotation === 0 ? 0 : 0.7071 * out.squareSize + out.boxPadding
        const initialX = 0
        const labelGap = 6
        const arrowTipClearance = Math.max(0, out.arrowWidth || 0)

        // group with horizontal offset
        const axisArrows = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-arrows')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        // Fit the X arrow between low/high endpoint labels so it does not overlap their text.
        const xLowNode = out.lgg.select('.em-bivariate-axis-end-label-x-low').node()
        const xHighNode = out.lgg.select('.em-bivariate-axis-end-label-x-high').node()
        const xLowBBox = xLowNode && typeof xLowNode.getBBox === 'function' ? xLowNode.getBBox() : null
        const xHighBBox = xHighNode && typeof xHighNode.getBBox === 'function' ? xHighNode.getBBox() : null

        let xStart = initialX
        let xEnd = initialX + out.squareSize
        if (xLowBBox && xHighBBox) {
            xStart = Math.max(initialX, xLowBBox.x + xLowBBox.width + labelGap)
            xEnd = Math.min(initialX + out.squareSize, xHighBBox.x - labelGap - arrowTipClearance)
        }
        if (xEnd <= xStart) {
            xStart = initialX
            xEnd = initialX + out.squareSize
        }

        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [xStart, out._xAxisArrowY],
                    [xEnd, out._xAxisArrowY],
                ])
            )
            .attr('marker-end', 'url(#arrowhead)')

        // Fit the Y arrow between low/high endpoint labels so it does not overlap their text.
        const yLowNode = out.lgg.select('.em-bivariate-axis-end-label-y-low').node()
        const yHighNode = out.lgg.select('.em-bivariate-axis-end-label-y-high').node()
        const yLowBBox = yLowNode && typeof yLowNode.getBBox === 'function' ? yLowNode.getBBox() : null
        const yHighBBox = yHighNode && typeof yHighNode.getBBox === 'function' ? yHighNode.getBBox() : null

        let yStart = out.squareSize
        let yEnd = 0
        if (yLowBBox && yHighBBox) {
            yStart = Math.min(out.squareSize, yLowBBox.y - labelGap)
            yEnd = Math.max(0, yHighBBox.y + yHighBBox.height + labelGap + arrowTipClearance)
        }
        if (yStart <= yEnd) {
            yStart = out.squareSize
            yEnd = 0
        }

        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow')
            .attr(
                'd',
                line()([
                    [out._yAxisArrowX, yStart],
                    [out._yAxisArrowX, yEnd],
                ])
            )
            .attr('marker-end', 'url(#arrowhead)')
    }

    function computeAxisArrowAnchors() {
        out._xAxisArrowY = out.squareSize + out.tickLength + out.arrowPadding
        if (out.showBreaks || (out.breaks1 && out.breaks2)) {
            out._xAxisArrowY += getFontSizeFromClass('em-bivariate-tick-label') / 1.5
        }

        out._yAxisArrowX = -out.tickLength - out.arrowPadding
        if (out.showBreaks || (out.breaks1 && out.breaks2)) {
            out._yAxisArrowX -= out.labelFontSize / 2
        }
    }

    // Highlight selected regions on mouseover
    function highlightBivariateRegions(map, ecl1, ecl2) {
        const selector = getLegendRegionsSelector(map)
        const dimmedFill = Legend.getDimmedFill(map)
        const allRegions = map.svg_.selectAll(selector).selectAll('[ecl1]')

        allRegions.each(function () {
            const sel = select(this)
            if (!sel.attr('data-fill')) sel.attr('data-fill', sel.style('fill'))
        })

        allRegions.style('fill', dimmedFill)

        allRegions
            .filter(`[ecl1='${ecl1}']`)
            .filter(`[ecl2='${ecl2}']`)
            .filter(':not([nd])')
            .each(function () {
                select(this).style('fill', select(this).attr('data-fill'))
            })
    }

    function unhighlightBivariateRegions(map) {
        const selector = getLegendRegionsSelector(map)
        map.svg_
            .selectAll(selector)
            .selectAll('[ecl1],[ecl2]')
            .each(function () {
                const sel = select(this)
                const original = sel.attr('data-fill')
                if (original) sel.style('fill', original)
            })
    }

    return out
}
