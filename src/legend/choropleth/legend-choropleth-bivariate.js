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

    const defaultAnnotationOffsetsByRotation = {
        0: {
            topLeft: { x: 5, y: -13 },
            topRight: { x: 4, y: -7 },
            bottomLeft: { x: -15, y: 10 },
            bottomRight: { x: 25, y: -10 },
        },
        '-45': {
            topLeft: { x: 5, y: -13 },
            topRight: { x: 4, y: -7 },
            bottomLeft: { x: -15, y: 18 },
            bottomRight: { x: 25, y: -10 },
        },
    }
    const defaultNoDataYOffsetByRotation = { 0: 15, '-45': 50 }
    const hasCustomAnnotationOffsets = !!(config && Object.prototype.hasOwnProperty.call(config, 'annotationOffsets'))
    const hasCustomNoDataYOffset = !!(config && Object.prototype.hasOwnProperty.call(config, 'noDataYOffset'))

    const cloneAnnotationOffsets = (offsets) => ({
        topLeft: { ...offsets.topLeft },
        topRight: { ...offsets.topRight },
        bottomLeft: { ...offsets.bottomLeft },
        bottomRight: { ...offsets.bottomRight },
    })

    const applyRotationDependentDefaults = () => {
        const rotationKey = out.rotation === -45 ? '-45' : 0
        if (!hasCustomAnnotationOffsets) {
            out.annotationOffsets = cloneAnnotationOffsets(defaultAnnotationOffsetsByRotation[rotationKey])
        }
        if (!hasCustomNoDataYOffset) {
            out.noDataYOffset = defaultNoDataYOffsetByRotation[rotationKey]
        }
    }

    //size
    out.squareSize = 80

    //orientation
    out.rotation = 0

    //labels
    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'
    out.axisExtremes = {
        x: { low: 'Low', high: 'High' },
        y: { low: 'Low', high: 'High' },
    }
    out.showAxisExtremes = true

    //corner annotations
    out.annotations = {
        topLeft: undefined,
        topRight: undefined,
        bottomLeft: undefined,
        bottomRight: undefined,
    }
    out.annotationLineLength = {
        topLeft: 35,
        topRight: 18,
        bottomLeft: 32,
        bottomRight: 18,
    }
    out.annotationOffsets = cloneAnnotationOffsets(defaultAnnotationOffsetsByRotation[0])
    out.annotationLineEndOffsets = { bottomRight: { x: -5, y: 10 } }
    out.annotationPadding = 8
    //add extra distance between legend and no data item
    out.noDataYOffset = defaultNoDataYOffsetByRotation[0]

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
    out.boxPadding = 5

    //arrows
    out.axisArrows = true // if set to true, arrows are drawn at the end of the axes
    out.arrowHeight = 5
    out.arrowWidth = 5
    out.arrowPadding = 12 // padding between arrow and axis label

    //override attribute values with config values
    if (config) for (let key in config) out[key] = config[key]

    if (config?.axisExtremes === false) {
        out.showAxisExtremes = false
    } else if (config?.axisExtremes) {
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
        applyRotationDependentDefaults()

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

        if (out.showAxisExtremes) {
            addAxisEndpointLabels()
        }

        // Titles are positioned from final arrow geometry, so endpoint labels must exist first.
        addAxisTitles()

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

        const axisTitles = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-titles')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        const spans = computeAxisArrowSpans()

        // X axis title centered on the X arrow segment and placed below arrow + endpoint labels.
        const xAxisTitlePadding = 7
        let xAxisTitleX = (spans.xStart + spans.xEnd) / 2
        let xAxisTitleY = out.axisArrows ? out._xAxisArrowY + out.arrowHeight + xAxisTitlePadding : out.squareSize + 8 + xAxisTitlePadding

        const xLowNode = out.lgg.select('.em-bivariate-axis-end-label-x-low').node()
        const xHighNode = out.lgg.select('.em-bivariate-axis-end-label-x-high').node()
        const xLowBBox = xLowNode && typeof xLowNode.getBBox === 'function' ? xLowNode.getBBox() : null
        const xHighBBox = xHighNode && typeof xHighNode.getBBox === 'function' ? xHighNode.getBBox() : null
        const xLabelsBottom = Math.max(xLowBBox ? xLowBBox.y + xLowBBox.height : -Infinity, xHighBBox ? xHighBBox.y + xHighBBox.height : -Infinity)
        if (Number.isFinite(xLabelsBottom)) {
            xAxisTitleY = Math.max(xAxisTitleY, xLabelsBottom + xAxisTitlePadding)
        }

        if (out.xAxisTitleOffset) xAxisTitleX += out.xAxisTitleOffset.x
        if (out.xAxisTitleOffset) xAxisTitleY += out.xAxisTitleOffset.y
        axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-x')
            .attr('x', xAxisTitleX)
            .attr('y', xAxisTitleY)
            .text(out.label1)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')
            .attr('alignment-baseline', 'hanging')

        // Y axis title centered on the Y arrow segment and placed outside arrow + endpoint labels.
        const yAxisTitlePadding = 12
        let yAxisTitleX = out._yAxisArrowX - (out.axisArrows ? out.arrowHeight + yAxisTitlePadding : 8 + yAxisTitlePadding)
        let yAxisTitleY = (spans.yStart + spans.yEnd) / 2

        const yLowNode = out.lgg.select('.em-bivariate-axis-end-label-y-low').node()
        const yHighNode = out.lgg.select('.em-bivariate-axis-end-label-y-high').node()
        const yLowBBox = yLowNode && typeof yLowNode.getBBox === 'function' ? yLowNode.getBBox() : null
        const yHighBBox = yHighNode && typeof yHighNode.getBBox === 'function' ? yHighNode.getBBox() : null
        const yLabelsLeft = Math.min(yLowBBox ? yLowBBox.x : Infinity, yHighBBox ? yHighBBox.x : Infinity)
        if (Number.isFinite(yLabelsLeft)) {
            yAxisTitleX = Math.min(yAxisTitleX, yLabelsLeft - yAxisTitlePadding)
        }

        if (out.yAxisTitleOffset) yAxisTitleX += out.yAxisTitleOffset.x
        if (out.yAxisTitleOffset) yAxisTitleY += out.yAxisTitleOffset.y
        const yAxisTitle = axisTitles
            .append('text')
            .attr('class', 'em-bivariate-axis-title em-bivariate-axis-title-y')
            .attr('x', yAxisTitleX)
            .attr('y', yAxisTitleY)
            .text(out.label2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')

        yAxisTitle.attr('transform', `rotate(-90 ${yAxisTitleX} ${yAxisTitleY})`)
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

        const xAxisYOffsetReduction = out.rotation === -45 ? 6 : 0
        const xLabelY = (out.axisArrows ? out._xAxisArrowY : xAxisLineY + 8) - xAxisYOffsetReduction
        // Keep Y-axis endpoint labels clear of left-side annotation callout lines.
        const yLabelX = yAxisLineX - (out.axisArrows ? out.arrowHeight + 2 : 8) - 4

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-x-low')
            .attr('x', initialX)
            .attr('y', xLabelY)
            .text(out.axisExtremes?.x?.low || 'Low')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', out.axisArrows ? 'middle' : 'hanging')

        axisLabels
            .append('text')
            .attr('class', 'em-bivariate-axis-end-label em-bivariate-axis-end-label-x-high')
            .attr('x', initialX + out.squareSize)
            .attr('y', xLabelY)
            .text(out.axisExtremes?.x?.high || 'High')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', out.axisArrows ? 'middle' : 'hanging')

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
        const numberOfClasses = out.map.numberOfClasses_ || 3
        const cellSize = out.squareSize / numberOfClasses
        const corners = {
            // Anchor each annotation at the center of the corresponding corner class cell.
            topLeft: [cellSize / 2, cellSize / 2],
            topRight: [out.squareSize - cellSize / 2, cellSize / 2],
            bottomLeft: [cellSize / 2, out.squareSize - cellSize / 2],
            bottomRight: [out.squareSize - cellSize / 2, out.squareSize - cellSize / 2],
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
            const cornerOffset = getAnnotationOffset(cornerName, ux, uy)
            const cornerLineLength = getAnnotationLineLength(cornerName, ux, uy, cornerOffset)

            const x1 = x0 + ux * cornerLineLength
            const y1 = y0 + uy * cornerLineLength
            const tx = x1 + cornerOffset.x
            const ty = y1 + cornerOffset.y

            const anchor = ux > 0.2 ? 'start' : ux < -0.2 ? 'end' : 'middle'
            const lines = splitAnnotationLines(text)

            const annotationLine = annotationsGroup
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

            const lineEndOffset = getAnnotationLineEndOffset(cornerName)
            const lineEnd = getLineEndpointToAnnotationLabel(x0, y0, annotationText, x1, y1, lineEndOffset)
            annotationLine.attr('x2', lineEnd.x).attr('y2', lineEnd.y)
        })
    }

    function getLineEndpointToAnnotationLabel(x0, y0, annotationText, fallbackX, fallbackY, lineEndOffset = { x: 0, y: 0 }) {
        const node = annotationText?.node && annotationText.node()
        if (!node || typeof node.getBBox !== 'function') {
            return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
        }

        const bbox = node.getBBox()
        if (!bbox || !Number.isFinite(bbox.x) || !Number.isFinite(bbox.y)) {
            return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
        }

        const closestX = clamp(x0, bbox.x, bbox.x + bbox.width)
        const closestY = clamp(y0, bbox.y, bbox.y + bbox.height)

        const vx = closestX - x0
        const vy = closestY - y0
        const vLen = Math.hypot(vx, vy)
        if (!vLen) {
            return { x: fallbackX + lineEndOffset.x, y: fallbackY + lineEndOffset.y }
        }

        const labelGap = 1.5
        return {
            x: closestX - (vx / vLen) * labelGap + lineEndOffset.x,
            y: closestY - (vy / vLen) * labelGap + lineEndOffset.y,
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    function getAnnotationLineEndOffset(cornerName) {
        const defaultOffset = { x: 0, y: 0 }
        const offsets = out.annotationLineEndOffsets

        if (!offsets || typeof offsets !== 'object') {
            return defaultOffset
        }

        const cornerOffset = offsets[cornerName]
        if (cornerOffset && typeof cornerOffset === 'object') {
            return {
                x: typeof cornerOffset.x === 'number' && Number.isFinite(cornerOffset.x) ? cornerOffset.x : defaultOffset.x,
                y: typeof cornerOffset.y === 'number' && Number.isFinite(cornerOffset.y) ? cornerOffset.y : defaultOffset.y,
            }
        }

        if (typeof offsets.x === 'number' || typeof offsets.y === 'number') {
            return {
                x: typeof offsets.x === 'number' && Number.isFinite(offsets.x) ? offsets.x : defaultOffset.x,
                y: typeof offsets.y === 'number' && Number.isFinite(offsets.y) ? offsets.y : defaultOffset.y,
            }
        }

        return defaultOffset
    }

    function getAnnotationOffset(cornerName, ux, uy) {
        const defaultOffset = { x: ux * 8, y: uy * 8, isCustom: false }
        const offsets = out.annotationOffsets

        if (offsets && typeof offsets === 'object') {
            const cornerOffset = offsets[cornerName]
            if (cornerOffset && typeof cornerOffset === 'object') {
                const x = typeof cornerOffset.x === 'number' && Number.isFinite(cornerOffset.x) ? cornerOffset.x : defaultOffset.x
                const y = typeof cornerOffset.y === 'number' && Number.isFinite(cornerOffset.y) ? cornerOffset.y : defaultOffset.y
                return { x, y, isCustom: true }
            }

            const x = typeof offsets.x === 'number' && Number.isFinite(offsets.x) ? offsets.x : defaultOffset.x
            const y = typeof offsets.y === 'number' && Number.isFinite(offsets.y) ? offsets.y : defaultOffset.y
            if (typeof offsets.x === 'number' || typeof offsets.y === 'number') {
                return { x, y, isCustom: true }
            }
        }

        const legacyPadding = getLegacyAnnotationPadding(cornerName)
        if (legacyPadding != null) {
            return { x: ux * legacyPadding, y: uy * legacyPadding, isCustom: false }
        }

        return defaultOffset
    }

    function getLegacyAnnotationPadding(cornerName) {
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
        return null
    }

    function getAnnotationLineLength(cornerName, ux, uy, cornerOffset) {
        let baseLineLength = 18
        const lineLengthConfig = out.annotationLineLength

        if (typeof lineLengthConfig === 'number' && Number.isFinite(lineLengthConfig)) {
            baseLineLength = lineLengthConfig
        } else if (lineLengthConfig && typeof lineLengthConfig === 'object') {
            const value = lineLengthConfig[cornerName]
            if (typeof value === 'number' && Number.isFinite(value)) {
                baseLineLength = value
            }
        }

        // When per-annotation offsets are used, adapt the line so its end stays close to the moved label.
        const radialOffset = cornerOffset?.isCustom ? ux * cornerOffset.x + uy * cornerOffset.y : 0
        return Math.max(2, baseLineLength + radialOffset)
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

        // group with horizontal offset
        const axisArrows = out.lgg
            .append('g')
            .attr('class', 'bivariate-axis-arrows')
            .attr(
                'transform',
                `translate(${out.boxPadding + out._horizontalOffset},${xc + out._y}) rotate(${out.rotation}) translate(${out.boxPadding},0)`
            )

        const spans = computeAxisArrowSpans()
        // X axis arrow
        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow em-bivariate-axis-arrow-x')
            .attr(
                'd',
                line()([
                    [spans.xStart, out._xAxisArrowY],
                    [spans.xEnd, out._xAxisArrowY],
                ])
            )
            .attr('marker-end', 'url(#arrowhead)')

        // Y axis arrow
        axisArrows
            .append('path')
            .attr('class', 'em-bivariate-axis-arrow em-bivariate-axis-arrow-y')
            .attr(
                'd',
                line()([
                    [out._yAxisArrowX, spans.yStart],
                    [out._yAxisArrowX, spans.yEnd],
                ])
            )
            .attr('marker-end', 'url(#arrowhead)')
    }

    function computeAxisArrowSpans() {
        const initialX = 0
        const labelGap = 6
        const arrowTipClearance = Math.max(0, out.arrowWidth || 0)

        const xLowNode = out.lgg.select('.em-bivariate-axis-end-label-x-low').node()
        const xHighNode = out.lgg.select('.em-bivariate-axis-end-label-x-high').node()
        const xLowBBox = xLowNode && typeof xLowNode.getBBox === 'function' ? xLowNode.getBBox() : null
        const xHighBBox = xHighNode && typeof xHighNode.getBBox === 'function' ? xHighNode.getBBox() : null

        let xStart = initialX
        let xEnd = initialX + out.squareSize
        if (out.showAxisExtremes && xLowBBox && xHighBBox) {
            xStart = Math.max(initialX, xLowBBox.x + xLowBBox.width + labelGap)
            xEnd = Math.min(initialX + out.squareSize, xHighBBox.x - labelGap - arrowTipClearance)
        } else if (!out.showAxisExtremes) {
            // Keep arrowhead inside axis extent when endpoint labels are hidden.
            xEnd = Math.max(initialX, initialX + out.squareSize - arrowTipClearance)
        }
        if (xEnd <= xStart) {
            xStart = initialX
            xEnd = initialX + out.squareSize
        }

        const yLowNode = out.lgg.select('.em-bivariate-axis-end-label-y-low').node()
        const yHighNode = out.lgg.select('.em-bivariate-axis-end-label-y-high').node()
        const yLowBBox = yLowNode && typeof yLowNode.getBBox === 'function' ? yLowNode.getBBox() : null
        const yHighBBox = yHighNode && typeof yHighNode.getBBox === 'function' ? yHighNode.getBBox() : null

        let yStart = out.squareSize
        let yEnd = 0
        if (out.showAxisExtremes && yLowBBox && yHighBBox) {
            yStart = Math.min(out.squareSize, yLowBBox.y - labelGap)
            yEnd = Math.max(0, yHighBBox.y + yHighBBox.height + labelGap + arrowTipClearance)
        } else if (!out.showAxisExtremes) {
            // Keep arrowhead inside axis extent when endpoint labels are hidden.
            yEnd = Math.min(out.squareSize, arrowTipClearance)
        }
        if (yStart <= yEnd) {
            yStart = out.squareSize
            yEnd = 0
        }

        return { xStart, xEnd, yStart, yEnd }
    }

    function computeAxisArrowAnchors() {
        out._xAxisArrowY = out.squareSize + out.tickLength + out.arrowPadding
        if (out.showBreaks || (out.breaks1 && out.breaks2)) {
            out._xAxisArrowY += getFontSizeFromClass('em-bivariate-tick-label')
        }
        if (out.rotation === -45) {
            out._xAxisArrowY -= 6
        } else if (out.rotation === 0) {
            out._xAxisArrowY -= 3
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
