import * as Legend from './legend'
import { select, selectAll } from 'd3-selection'
import { executeForAllInsets, getFontSizeFromClass, hexToRgb } from '../core/utils'

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
    out.noData = true
    out.noDataShapeHeight = 20
    out.noDataShapeWidth = 25
    out.noDataText = 'No data'
    out.boxPadding = 60 // depends on variable 1 label length really
    out.noDataYOffset = 20
    out.arrowHeight = 15
    out.arrowWidth = 14
    out.arrowPadding = 10

    if (config) for (let key in config) out[key] = config[key]

    /**
     * Override the update method to handle trivariate legends
     */
    out.update = function () {
        const lgg = out.lgg
        const numberOfClasses = out.map.numberOfClasses()

        // Remove previous content
        lgg.selectAll('*').remove()

        // Draw background box
        out.makeBackgroundBox()

        // Apply padding to the main <g> group
        const paddedGroup = lgg.append('g').attr('transform', `translate(${out.boxPadding}, ${out.boxPadding})`)

        // Draw title
        if (out.title) {
            paddedGroup
                .append('text')
                .attr('class', 'em-legend-title')
                .attr('x', 0) // Start at 0 within the padded group
                .attr('y', out.titleFontSize) // Vertical positioning
                .text(out.title)
        }

        // Draw the trivariate Venn diagram
        const labels = [out.label1, out.label2, out.label3]
        const colors = [out.map.color1_, out.map.color2_, out.map.color3_]

        drawTrivariateVennDiagram(paddedGroup, colors, labels)

        // Handle trivariate (Venn Diagram) or bivariate (grid) legend
        // if (numberOfClasses === 7) {
        //     drawTrivariateVennDiagram(lgg, out)
        // } else {
        //     drawTrivariateTernaryPlot(lgg, out, numberOfClasses)
        // }
    }

    return out
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
            color = multiplyBlendMultipleHex([colors[2], colors[0]]) // pink + cyan
        } else if (index == 1) {
            color = multiplyBlendMultipleHex([colors[1], colors[0]]) // cyan + yellow
        } else if (index == 2) {
            color = multiplyBlendMultipleHex([colors[1], colors[2]]) // pink + yellow
        }

        container.append('path').attr('d', shape).attr('class', 'segment').attr('fill', color).attr('opacity', 1)
    })

    // nucleus (combination of all 3 colors)
    roundedTriPoints.forEach((points, index) => {
        const ptCycle = points.map((i) => xPoints[i - 1]).concat(points.map((i) => yPoints[i - 1]))
        const shape = makeRoundedTri(ptCycle)
        const color = multiplyBlendMultipleHex(colors)

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
    // container.append('text').text('1').attr('x', xIsect1).attr('y', yIsect1)
    // container.append('text').text('2').attr('x', xIsect2).attr('y', yIsect2)
    // container.append('text').text('3').attr('x', xIsect3).attr('y', yIsect3)
    // container.append('text').text('4').attr('x', xIsect4).attr('y', yIsect4)
    // container.append('text').text('5').attr('x', xIsect5).attr('y', yIsect5)
    // container.append('text').text('6').attr('x', xIsect6).attr('y', yIsect6)
}

//blends two colors using 'multiply' blending mode. Returns the blended color as an RGB string
function multiplyBlendMultipleHex(colors) {
    // Convert hex color to RGB
    const hexToRgb = (hex) => {
        hex = hex.replace('#', '')
        if (hex.length === 3) {
            hex = hex
                .split('')
                .map((h) => h + h)
                .join('')
        }
        const int = parseInt(hex, 16)
        return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
    }

    // Convert RGB to hex
    const rgbToHex = ([r, g, b]) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

    // Convert all hex colors to RGB arrays
    const rgbColors = colors.map(hexToRgb)

    // Initialize the result with the first color
    let blended = [...rgbColors[0]]

    // Sequentially multiply each color with the result
    for (let i = 1; i < rgbColors.length; i++) {
        blended = blended.map((v, idx) => Math.round((v / 255) * (rgbColors[i][idx] / 255) * 255))
    }

    // Return the blended color as a hex code
    return rgbToHex(blended)
}

/**
 * Draws a trivariate legend as a Venn Diagram
 */
function drawTrivariateVennDiagram2(svg, containerWidth, containerHeight, labels, colors) {
    const radius = containerWidth / 5 // Radius of each circle
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2
    const offset = radius / 1.5

    // Define circle positions
    const circles = [
        { id: 'circle1', cx: centerX - offset, cy: centerY, label: labels[0], color: colors[0] },
        { id: 'circle2', cx: centerX + offset, cy: centerY, label: labels[1], color: colors[1] },
        { id: 'circle3', cx: centerX, cy: centerY + offset * 1.5, label: labels[2], color: colors[2] },
    ]

    // Draw circles
    circles.forEach(({ id, cx, cy, label, color }, index) => {
        svg.append('circle').attr('id', id).attr('cx', cx).attr('cy', cy).attr('r', radius).style('fill', color).style('opacity', 1)

        // Add labels with specific positioning
        const labelX =
            index === 0
                ? cx - radius - 10 // Left of the first circle
                : index === 1
                  ? cx + radius + 10 // Right of the second circle
                  : cx // Below the third circle

        const labelY = index < 2 ? cy : cy + radius + 20 // Same y for first two circles, below for the third

        svg.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', index < 2 ? (index === 0 ? 'end' : 'start') : 'middle') // Adjust alignment
            .attr('class', 'venn-label')
            .text(label)
            .style('font-size', '12px')
    })
}

/**
 * Draws a trivariate legend as a ternary plot
 */
function drawTrivariateTernaryPlot(lgg, out, numberOfClasses) {
    const size = out.squareSize // Size of the legend area
    const padding = 20 // Padding around the plot
    const radius = 5 // Radius of each class point
    const triangleHeight = (Math.sqrt(3) / 2) * size

    const ternaryGroup = lgg
        .append('g')
        .attr('class', 'trivariate-ternary-plot')
        .attr('transform', `translate(${out.boxPadding + size / 2}, ${out.boxPadding + triangleHeight / 2})`)

    // Draw the triangle
    const vertices = [
        { x: 0, y: -triangleHeight / 2 }, // Top vertex (Variable 1)
        { x: -size / 2, y: triangleHeight / 2 }, // Bottom-left vertex (Variable 2)
        { x: size / 2, y: triangleHeight / 2 }, // Bottom-right vertex (Variable 3)
    ]

    ternaryGroup
        .append('polygon')
        .attr('points', vertices.map((d) => `${d.x},${d.y}`).join(' '))
        .attr('fill', 'none')
        .attr('stroke', 'black')

    // Label the vertices
    const labels = [out.label1, out.label2, out.label3]
    vertices.forEach((vertex, i) => {
        ternaryGroup
            .append('text')
            .attr('x', vertex.x)
            .attr('y', vertex.y - (i === 0 ? 10 : -20)) // Offset labels
            .attr('class', 'ternary-label')
            .attr('text-anchor', 'middle')
            .text(labels[i])
    })

    // Plot the points inside the ternary plot
    for (let i = 0; i < numberOfClasses; i++) {
        for (let j = 0; j < numberOfClasses - i; j++) {
            const k = numberOfClasses - i - j - 1 // Ensure sum of i + j + k = numberOfClasses - 1
            const x = ((j - k) * size) / (2 * (numberOfClasses - 1)) // Horizontal position
            const y = (i * -triangleHeight) / (numberOfClasses - 1) // Vertical position

            const fill = out.map.classToFillStyle()(i, j, k)

            ternaryGroup
                .append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', radius)
                .attr('fill', fill)
                .on('mouseover', function () {
                    highlightRegions(out.map, i, j, k)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, highlightRegions, i, j, k)
                    }
                })
                .on('mouseout', function () {
                    unhighlightRegions(out.map)
                    if (out.map.insetTemplates_) {
                        executeForAllInsets(out.map.insetTemplates_, out.map.svgId, unhighlightRegions, i, j, k)
                    }
                })
        }
    }

    // Highlight selected regions on mouseover
    function highlightRegions(map, ecl1, ecl2) {
        let selector = out.geo_ === 'WORLD' ? '#em-worldrg' : '#em-nutsrg'
        if (map.Geometries.userGeometries) selector = '#em-user-regions' // for user-defined geometries
        const allRegions = map.svg_.selectAll(selector).selectAll(`[ecl1]`)

        // Set all regions to white
        allRegions.style('fill', 'white')

        // Highlight only the selected regions by restoring their original color
        const selectedRegions = allRegions.filter(`[ecl1='${ecl1}']`).filter(`[ecl2='${ecl2}']`)
        selectedRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___')) // Restore original color for selected regions
        })
    }

    // Reset all regions to their original colors on mouseout
    function unhighlightRegions(map) {
        let selector = out.geo_ === 'WORLD' ? '#em-worldrg' : '#em-nutsrg'
        if (map.Geometries.userGeometries) selector = '#em-user-regions' // for user-defined geometries
        const allRegions = map.svg_.selectAll(selector).selectAll(`[ecl1]`)

        // Restore each region's original color from the fill___ attribute
        allRegions.each(function () {
            select(this).style('fill', select(this).attr('fill___'))
        })
    }
}
