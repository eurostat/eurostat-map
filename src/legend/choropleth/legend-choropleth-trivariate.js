import * as Legend from '../legend'
import { select, selectAll } from 'd3-selection'
import { executeForAllInsets, getFontSizeFromClass, averageBlendHex, interpolateIntensity } from '../../core/utils'
import { color } from 'd3'
import { getTrivariateColor } from '../../map-types/map-choropleth-trivariate'

/**
 * A legend for choropleth-trivariate maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    // Default settings
    out.width = 230
    out.height = 230

    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'
    out.label3 = 'Variable 3' // Add a label for the third variable
    out.axisTitleFontSize = getFontSizeFromClass('em-bivariate-axis-title')
    out.showBreaks = false
    out.noDataYOffset = 20
    out.arrowHeight = 15
    out.arrowWidth = 14
    out.arrowPadding = 10

    if (config) for (let key in config) out[key] = config[key]

    /**
     * Override the update method to handle trivariate legends
     */
    out.update = function () {
        out.updateConfig()
        out.updateContainer()
        const lgg = out.lgg

        // Remove previous content
        lgg.selectAll('*').remove()

        if (out.lgg.node()) {
            // Draw background box
            out.makeBackgroundBox()

            //titles
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            // Apply padding to the main <g> group
            const baseX = out.getBaseX()
            const baseY = out.getBaseY()

            // Draw the trivariate Venn diagram
            const labels = [out.label1, out.label2, out.label3]
            const colors = [out.map.color1_, out.map.color2_, out.map.color3_]

            const mode = out.map.trivariateRelationship()
            out._trivariateContainer = lgg.append('g').attr('transform', `translate(${baseX}, ${baseY})`).attr('class', 'em-trivariate-legend')

            if (mode === 'presence') {
                drawTrivariateVennDiagram(out._trivariateContainer, colors, labels)
                //drawPresenceLegend(svg, map);
            } else {
                drawTernaryLegend(out)
            }
        }

        // Set legend box dimensions
        out.setBoxDimension()
    }

    return out
}

/**
 * Draws a trivariate legend as a ternary color triangle.
 * Uses the same fill logic as the map (regionsFillFunction).
 *
 * @param {d3.Selection} container The D3 selection to append the legend to
 * @param {object} out Legend context (contains map, labels, etc.)
 */
function drawTernaryLegend(out) {
    const size = out.width - out.boxPadding * 2
    const height = (Math.sqrt(3) / 2) * size

    // Triangle vertices
    const vertices = [
        { x: 0, y: -height / 2 }, // Top (Variable 1)
        { x: -size / 2, y: height / 2 }, // Bottom-left (Variable 2)
        { x: size / 2, y: height / 2 }, // Bottom-right (Variable 3)
    ]

    // Draw triangle outline
    out._trivariateContainer
        .append('polygon')
        .attr('points', vertices.map((d) => `${d.x},${d.y}`).join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#444')

    // Vertex labels
    const labels = [out.label1, out.label2, out.label3]
    vertices.forEach((v, i) => {
        out._trivariateContainer
            .append('text')
            .attr('x', v.x)
            .attr('y', v.y + (i === 0 ? -10 : 20))
            .attr('text-anchor', 'middle')
            .attr('class', 'ternary-label')
            .text(labels[i])
    })

    // Fill triangle interior with a dense color field
    const resolution = 100 // number of samples along each side (smooth gradient)
    const dotSize = size / (resolution * 3.5) // scale marker size based on resolution

    for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution - i; j++) {
            const k = resolution - i - j
            const p1 = i / resolution
            const p2 = j / resolution
            const p3 = k / resolution

            // Convert barycentric coordinates to (x, y)
            const x = vertices[0].x * p1 + vertices[1].x * p2 + vertices[2].x * p3
            const y = vertices[0].y * p1 + vertices[1].y * p2 + vertices[2].y * p3

            // Get blended color using map logic
            const color = out.map.regionsFillFunction
                ? getTrivariateColor(p1, p2, p3, out.map.color1(), out.map.color2(), out.map.color3(), 1)
                : '#ccc'

            // Draw as a tiny rectangle
            out._trivariateContainer
                .append('rect')
                .attr('x', x - dotSize / 2)
                .attr('y', y - dotSize / 2)
                .attr('width', dotSize)
                .attr('height', dotSize)
                .attr('fill', color)
                .attr('stroke', 'none')
        }
    }
}

function drawTrivariateVennDiagram(container, colors, labels) {
    //specs for Circle 1
    const xCenter1 = 50
    const yCenter1 = 50
    const circleRad = 30

    //draw Circle 1
    // const circle1 = container
    //     .append('circle')
    //     .attr('r', circleRad)
    //     .attr('transform', 'translate(' + xCenter1 + ',' + yCenter1 + ')')

    //add'l specs for Circle 2
    const offsetFactor = 1.2
    const offset = offsetFactor * circleRad
    const xCenter2 = xCenter1 + offset
    const yCenter2 = yCenter1 //creating new var for clarity

    //draw Circle 2
    // const circle2 = container
    //     .append('circle')
    //     .attr('r', circleRad)
    //     .attr('transform', 'translate(' + xCenter2 + ',' + yCenter2 + ')')

    //add'l specs for Circle 3
    const xCenter3 = xCenter1 + offset / 2
    const yCenter3 = yCenter1 + (Math.sqrt(3) * offset) / 2

    //draw Circle 3
    // const circle3 = container
    //     .append('circle')
    //     .attr('r', circleRad)
    //     .attr('transform', 'translate(' + xCenter3 + ',' + yCenter3 + ')')

    //compute first points of intersection
    const triHeight = Math.sqrt(circleRad ** 2 - (offset / 2) ** 2)
    //outer intersection of Circles 1 and 2
    const xIsect1 = xCenter3
    const yIsect1 = yCenter1 - triHeight
    //inner intersection of Circles 1 and 2
    const xIsect4 = xCenter3
    const yIsect4 = yCenter1 + triHeight

    //treat "triHeight" as the hypoteneuse of a 30.60.90 triangle.
    //this tells us the shift from the midpoint of a leg of the triangle
    //to the point of intersection
    const xDelta = (triHeight * Math.sqrt(3)) / 2
    const yDelta = triHeight / 2

    const xMidpointC1C3 = (xCenter1 + xCenter3) / 2
    const xMidpointC2C3 = (xCenter2 + xCenter3) / 2
    const yMidpointBoth = (yCenter1 + yCenter3) / 2

    //find the rest of the points of intersection
    const xIsect2 = xMidpointC1C3 - xDelta
    const yIsect2 = yMidpointBoth + yDelta
    const xIsect3 = xMidpointC2C3 + xDelta
    const yIsect3 = yMidpointBoth + yDelta

    const xIsect5 = xMidpointC1C3 + xDelta
    const yIsect5 = yMidpointBoth - yDelta
    const xIsect6 = xMidpointC2C3 - xDelta
    const yIsect6 = yMidpointBoth - yDelta

    const xPoints = [xIsect1, xIsect2, xIsect3, xIsect4, xIsect5, xIsect6]
    const yPoints = [yIsect1, yIsect2, yIsect3, yIsect4, yIsect5, yIsect6]

    const makeIronShapes = ([x1, x2, x3, y1, y2, y3]) => {
        const path = `M ${x1} ${y1}
             A ${circleRad} ${circleRad} 0 0 1 ${x2} ${y2}
             A ${circleRad} ${circleRad} 0 0 0 ${x3} ${y3}
             A ${circleRad} ${circleRad} 0 0 1 ${x1} ${y1}`
        return path
    }

    const makeSunShapes = ([x1, x2, x3, y1, y2, y3]) => {
        const path = `M ${x1} ${y1}
             A ${circleRad} ${circleRad} 0 0 0 ${x2} ${y2}
             A ${circleRad} ${circleRad} 0 0 0 ${x3} ${y3}
             A ${circleRad} ${circleRad} 0 1 1 ${x1} ${y1}`
        return path
    }

    const makeRoundedTri = ([x1, x2, x3, y1, y2, y3]) => {
        const path = `M ${x1} ${y1}
             A ${circleRad} ${circleRad} 0 0 1 ${x2} ${y2}
             A ${circleRad} ${circleRad} 0 0 1 ${x3} ${y3}
             A ${circleRad} ${circleRad} 0 0 1 ${x1} ${y1}`
        return path
    }

    const ironPoints = [
        [1, 5, 6],
        [3, 4, 5],
        [2, 6, 4],
    ]
    const sunPoints = [
        [3, 5, 1],
        [2, 4, 3],
        [1, 6, 2],
    ]
    const roundedTriPoints = [[5, 4, 6]]

    // main circles (raw colors)
    sunPoints.forEach((points, index) => {
        const ptCycle = points.map((i) => xPoints[i - 1]).concat(points.map((i) => yPoints[i - 1]))
        const shape = makeSunShapes(ptCycle)

        container.append('path').attr('d', shape).attr('class', 'segment').attr('fill', colors[index]).attr('opacity', 1)
    })

    // first intersects (combination of 2 colors)
    ironPoints.forEach((points, index) => {
        const ptCycle = points.map((i) => xPoints[i - 1]).concat(points.map((i) => yPoints[i - 1]))
        const shape = makeIronShapes(ptCycle)

        let color
        if (index == 0) {
            color = averageBlendHex([colors[2], colors[0]])
        } else if (index == 1) {
            color = averageBlendHex([colors[1], colors[0]])
        } else if (index == 2) {
            color = averageBlendHex([colors[1], colors[2]])
        }

        container.append('path').attr('d', shape).attr('class', 'segment').attr('fill', color).attr('opacity', 1)
    })

    // nucleus (combination of all 3 colors)
    roundedTriPoints.forEach((points, index) => {
        const ptCycle = points.map((i) => xPoints[i - 1]).concat(points.map((i) => yPoints[i - 1]))
        const shape = makeRoundedTri(ptCycle)
        const color = averageBlendHex(colors)

        container.append('path').attr('d', shape).attr('class', 'segment').attr('fill', color).attr('opacity', 1)
    })

    container
        .selectAll('path.segment')
        .on('mouseover', function () {
            select(this).transition().attr('opacity', 0.8).duration(500)
        })
        .on('mouseout', function () {
            select(this).transition().attr('opacity', 1).duration(500)
        })

    // label intersects
    const yOffset = container
        .append('text')
        .text(labels[0])
        .attr('x', xCenter1 - circleRad - 3)
        .attr('y', xCenter1)
        .attr('class', 'venn-label')
        .attr('text-anchor', 'end')
    container
        .append('text')
        .text(labels[1])
        .attr('x', xCenter2 + circleRad + 3)
        .attr('y', yCenter2)
        .attr('class', 'venn-label')
    container
        .append('text')
        .text(labels[2])
        .attr('x', xCenter3)
        .attr('y', yCenter3 + circleRad + 15)
        .attr('class', 'venn-label')
        .attr('text-anchor', 'middle')
}
