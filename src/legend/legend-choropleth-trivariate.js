import * as Legend from './legend'
import { select, selectAll } from 'd3-selection'
import { executeForAllInsets, getFontSizeFromClass } from '../core/utils'

/**
 * A legend for choropleth-trivariate maps
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    // Default settings
    out.width = 200
    out.height = 200
    out.squareSize = 100
    out.rotation = 0
    out.label1 = 'Variable 1'
    out.label2 = 'Variable 2'
    out.label3 = 'Variable 3' // Add a label for the third variable
    out.axisTitleFontSize = getFontSizeFromClass('em-bivariate-axis-title')
    out.showBreaks = false
    out.noData = true
    out.noDataShapeHeight = 20
    out.noDataShapeWidth = 25
    out.noDataText = 'No data'
    out.boxPadding = 60
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

        drawTrivariateVennDiagram(paddedGroup, out.width - 2 * out.boxPadding, out.height - 2 * out.boxPadding, labels, ['red', 'blue', 'green'])

        // Handle trivariate (Venn Diagram) or bivariate (grid) legend
        // if (numberOfClasses === 7) {
        //     drawTrivariateVennDiagram(lgg, out)
        // } else {
        //     drawTrivariateTernaryPlot(lgg, out, numberOfClasses)
        // }
    }

    return out
}

/**
 * Draws a trivariate legend as a Venn Diagram
 */
function drawTrivariateVennDiagram(svg, containerWidth, containerHeight, labels, colors) {
    const radius = containerWidth / 5 // Radius of each circle
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2

    // Define circle positions
    const circles = [
        { id: 'circle1', cx: centerX - radius, cy: centerY, label: labels[0], color: colors[0] },
        { id: 'circle2', cx: centerX + radius, cy: centerY, label: labels[1], color: colors[1] },
        { id: 'circle3', cx: centerX, cy: centerY + radius * 1.5, label: labels[2], color: colors[2] },
    ]

    // Draw circles
    circles.forEach(({ id, cx, cy, label, color }, index) => {
        svg.append('circle').attr('id', id).attr('cx', cx).attr('cy', cy).attr('r', radius).style('fill', color).style('opacity', 0.5)

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
