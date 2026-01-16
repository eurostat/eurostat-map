import { TernaryPoint, TricoloreResult, VisualizationOptions } from '../types'
import { TernaryGeometry } from '../core/ternaryGeometry'
import { ColorMapping } from '../core/colorMapping'
import { CompositionUtils } from '../core/compositionUtils'
// TODO: check if this works correctly in various environments
//  for d3 (cf. inside TricoloreViz constructor too)
import { select } from 'd3-selection'
import { group } from 'd3-array'

/**
 * js visualization for Tricolore
 */
export class TricoloreViz {
    private container: any // D3Selection;
    private readonly width: number
    private readonly height: number
    private margin: { top: number; right: number; bottom: number; left: number }
    private svg: any // D3Selection;
    private triangle: any // D3Selection;
    private legend: any // D3Selection;
    private circles: any // D3Selection
    private canvas: HTMLCanvasElement | null = null
    private ctx: CanvasRenderingContext2D | null = null

    /**
     * Create a TricoloreViz instance
     *
     * @param selector - CSS selector for container or D3 selection
     * @param width - Width of the visualization
     * @param height - Height of the visualization
     * @param margin - Margins around the visualization
     *
     * @throws Error - If js is not available
     */
    constructor(
        selector: string | any,
        width: number = 650,
        height: number = 520,
        margin: { top: number; right: number; bottom: number; left: number } = {
            top: 20,
            right: 60,
            bottom: 50,
            left: 60,
        }
    ) {
        this.container = select(selector)

        this.width = width
        this.height = height
        this.margin = margin

        // Create SVG container
        this.svg = this.container.append('svg').attr('width', width).attr('height', height)

        // Create group for the triangle
        this.triangle = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`).attr('class', 'em-tricolore-triangle')

        // Create group for legending elements (axis names and ticks)
        this.legend = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`).attr('class', 'em-tricolore-legend-labels')

        // Create group for data points
        this.circles = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`).attr('class', 'em-tricolore-data-points')
    }

    /**
     * Create a continuous ternary plot using canvas
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createContinuousPlot(data: TernaryPoint[] = [], options: Partial<VisualizationOptions> = {}): void {
        const {
            center = [1 / 3, 1 / 3, 1 / 3],
            hue = 80,
            chroma = 140,
            lightness = 80,
            contrast = 0.4,
            spread = 1,
            showData = true,
            showCenter = true,
            showLines = true,
            labels = ['p₁', 'p₂', 'p₃'],
            labelPosition = 'corner',
            colorTarget = 'triangles',
        } = options

        const plotWidth = this.width - this.margin.left - this.margin.right
        const plotHeight = this.height - this.margin.top - this.margin.bottom
        const size = Math.min(plotWidth, plotHeight)

        // Remove any existing canvas
        if (this.canvas) {
            select(this.canvas).remove()
        }

        // Clear previous contents
        this.triangle.selectAll('*').remove()
        this.legend.selectAll('*').remove()
        this.circles.selectAll('*').remove()

        // Create canvas for continuous color rendering
        this.canvas = document.createElement('canvas')
        this.canvas.width = size
        this.canvas.height = size
        this.ctx = this.canvas.getContext('2d')

        if (!this.ctx) return

        // Draw the colored triangle on canvas
        this.drawContinuousTriangle(size, center, hue, chroma, lightness, contrast, spread)

        // Position canvas
        this.triangle.append('image').attr('x', 0).attr('y', 0).attr('width', size).attr('height', size).attr('href', this.canvas.toDataURL())

        // Add triangle border and axes using SVG
        this.drawTriangleFrame(size, labels, center, showCenter, showLines, labelPosition, colorTarget)

        // Add data points if requested
        if (showData && data.length > 0) {
            const colorTarget = options.colorTarget ?? 'triangles'
            this.addDataPoints(data, size, options.dataPointHandlers, showCenter, center, undefined, colorTarget)
        }

        if (showCenter) {
            this.addCenterAnnotation(size, center, options.centerLabel ?? 'Average value')
        }
    }

    /**
     * Create a discrete ternary plot using SVG polygons
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createDiscretePlot(data: TernaryPoint[] = [], options: Partial<VisualizationOptions> = {}): void {
        const {
            center = [1 / 3, 1 / 3, 1 / 3],
            breaks = 4,
            hue = 80,
            chroma = 140,
            lightness = 80,
            contrast = 0.4,
            spread = 1,
            showData = true,
            showCenter = true,
            showLines = true,
            labels = ['p₁', 'p₂', 'p₃'],
            labelPosition = 'corner',
            colorTarget = 'triangles',
        } = options

        const plotWidth = this.width - this.margin.left - this.margin.right
        const plotHeight = this.height - this.margin.top - this.margin.bottom
        const size = Math.min(plotWidth, plotHeight)

        // Clear previous contents
        this.triangle.selectAll('*').remove()
        this.legend.selectAll('*').remove()
        this.circles.selectAll('*').remove()

        // Generate mesh centroids and vertices
        const centroids = TernaryGeometry.ternaryMeshCentroids(breaks)
        const vertices = TernaryGeometry.ternaryMeshVertices(centroids)

        // Calculate colors for each centroid
        const centroidPoints = centroids.map((c) => [c.p1, c.p2, c.p3] as TernaryPoint)
        const colors = ColorMapping.colorMapTricolore(centroidPoints, center, breaks, hue, chroma, lightness, contrast, spread)

        // Group vertices by triangle id
        const triangleGroups = group(vertices, (d: any) => d.id)

        // Create a polygon for each triangle
        triangleGroups.forEach((triangleVertices: any, id: string) => {
            const points = triangleVertices
                .map((v: any) => {
                    const [x, y] = this.ternaryToSvgCoords([v.p1, v.p2, v.p3], size)
                    return `${x},${y}`
                })
                .join(' ')

            const color = colors[Number(id) - 1].rgb
            const classIndex = Number(id) - 1
            const poly = this.triangle
                .append('polygon')
                .attr('points', points)
                .attr('stroke', 'none')
                .attr('classIndex', classIndex)
                .attr('class', 'em-ternary-discrete-polygon')

            if (colorTarget === 'triangles') {
                poly.attr('fill', color)
            } else {
                poly.attr('fill', '#fffefe') // or 'none'
            }

            const handlers = options.triangleHandlers

            if (handlers?.mouseover) {
                poly.on('mouseover', (e) => handlers.mouseover!(e, color))
            }
            if (handlers?.mouseout) {
                poly.on('mouseout', (e) => handlers.mouseout!(e))
            }
        })

        // Draw triangle border and axes
        this.drawTriangleFrame(size, labels, center, showCenter, showLines, labelPosition, colorTarget)

        // Add data points if requested
        if (showData && data.length > 0) {
            const pointColors =
                colorTarget === 'points' ? ColorMapping.colorMapTricolore(data, center, breaks, hue, chroma, lightness, contrast, spread) : undefined
            this.addDataPoints(
                data,
                size,
                options.dataPointHandlers,
                showCenter,
                center,
                colorTarget === 'points' ? pointColors : undefined,
                colorTarget
            )
        }

        if (showCenter) {
            this.addCenterAnnotation(size, center, options.centerLabel ?? 'Average value')
        }
    }

    /**
     * Create a sextant ternary plot
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createSextantPlot(data: TernaryPoint[] = [], options: Partial<VisualizationOptions> & { values?: string[] } = {}): void {
        const {
            center = [1 / 3, 1 / 3, 1 / 3],
            values = ['#FFFF00', '#B3DCC3', '#01A0C6', '#B8B3D8', '#F11D8C', '#FFB3B3'],
            showData = true,
            showCenter = true,
            showLines = true,
            labels = ['p₁', 'p₂', 'p₃'],
            labelPosition = 'corner',
            colorTarget = 'triangles',
        } = options

        if (values.length !== 6) {
            throw new Error('Sextant plot requires exactly 6 color values')
        }

        const plotWidth = this.width - this.margin.left - this.margin.right
        const plotHeight = this.height - this.margin.top - this.margin.bottom
        const size = Math.min(plotWidth, plotHeight)

        // Clear previous contents
        this.triangle.selectAll('*').remove()
        this.legend.selectAll('*').remove()
        this.circles.selectAll('*').remove()

        // Generate sextant vertices
        const vertices = TernaryGeometry.ternarySextantVertices(center)

        // Group vertices by sextant id
        const sextantGroups = group(vertices, (d: any) => d.id)

        // Create a polygon for each sextant
        sextantGroups.forEach((sextantVertices: any, id: string) => {
            // Sort vertices by vertex id to ensure proper polygon drawing
            sextantVertices.sort((a: any, b: any) => a.vertex - b.vertex)

            const points = sextantVertices
                .map((v: any) => {
                    const [x, y] = this.ternaryToSvgCoords([v.p1, v.p2, v.p3], size)
                    return `${x},${y}`
                })
                .join(' ')

            const colorIndex = Number(id) - 1
            const classIndex = Number(id) - 1
            const poly = this.triangle
                .append('polygon')
                .attr('points', points)
                .attr('fill', values[colorIndex])
                .attr('stroke', 'none')
                .attr('data-ecl', classIndex)

            const handlers = options.triangleHandlers

            if (handlers?.mouseover) {
                poly.on('mouseover', (e) => handlers.mouseover!(e, values[colorIndex]))
            }
            if (handlers?.mouseout) {
                poly.on('mouseout', (e) => handlers.mouseout!(e))
            }
        })

        // Draw triangle border and axes
        this.drawTriangleFrame(size, labels, center, showCenter, showLines, labelPosition, colorTarget)

        // Add data points if requested
        if (showData && data.length > 0) {
            const colorTarget = options.colorTarget ?? 'triangles'
            this.addDataPoints(data, size, options.dataPointHandlers, showCenter, center, undefined, colorTarget)
        }

        if (showCenter) {
            this.addCenterAnnotation(size, center, options.centerLabel ?? 'Average value')
        }
    }

    /**
     * Draw the continuous colored triangle on canvas
     */
    private drawContinuousTriangle(
        size: number,
        center: TernaryPoint,
        hue: number,
        chroma: number,
        lightness: number,
        contrast: number,
        spread: number
    ): void {
        if (!this.ctx) return

        const resolution = size
        const imageData = this.ctx.createImageData(resolution, resolution)

        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                // Convert from pixel coordinates to ternary coordinates
                const [p1, p2, p3] = this.svgToTernaryCoords([x, y], resolution)

                // Skip pixels outside the triangle
                if (p1 < 0 || p2 < 0 || p3 < 0 || p1 > 1 || p2 > 1 || p3 > 1) {
                    continue
                }

                // Calculate color for this point
                const color = ColorMapping.colorMapTricolore([[p1, p2, p3]], center, 100, hue, chroma, lightness, contrast, spread)[0]

                // Parse the hex color
                const r = parseInt(color.rgb!.slice(1, 3), 16)
                const g = parseInt(color.rgb!.slice(3, 5), 16)
                const b = parseInt(color.rgb!.slice(5, 7), 16)

                // Set the pixel color
                const pixelIndex = (y * resolution + x) * 4
                imageData.data[pixelIndex] = r
                imageData.data[pixelIndex + 1] = g
                imageData.data[pixelIndex + 2] = b
                imageData.data[pixelIndex + 3] = 255
            }
        }

        this.ctx.putImageData(imageData, 0, 0)
    }

    /**
     * Draw the triangle frame, axes and labels
     */
    private drawTriangleFrame(
        size: number,
        labels: [string, string, string],
        center: TernaryPoint,
        showCenter: boolean,
        showLines: boolean,
        labelPosition: 'corner' | 'edge' = 'corner',
        colorTarget: 'triangles' | 'points' = 'triangles',
        showData: boolean = false
    ): void {
        // Define triangle corners in ternary coordinates
        // and convert to SVG coordinates
        const corners = [
            [1, 0, 0], // bottom left (p1)
            [0, 1, 0], // top (p2)
            [0, 0, 1], // bottom right (p3)
        ] as TernaryPoint[]

        const svgCorners = corners.map((p) => this.ternaryToSvgCoords(p, size))

        // Create the triangle border
        const points = svgCorners.map((p) => p.join(',')).join(' ')
        this.triangle.append('polygon').attr('points', points).attr('fill', 'none').attr('stroke', 'black').attr('stroke-width', 1)

        // Add axis names
        if (labelPosition === 'edge') {
            const labelPositions = [
                [(svgCorners[0][0] + svgCorners[1][0]) / 2 - 35, (svgCorners[0][1] + svgCorners[1][1]) / 2 - 14], // p1
                [(svgCorners[1][0] + svgCorners[2][0]) / 2 + 35, (svgCorners[1][1] + svgCorners[2][1]) / 2 - 14], // p2
                [(svgCorners[0][0] + svgCorners[2][0]) / 2, (svgCorners[0][1] + svgCorners[2][1]) / 2 + 25], // p3
            ]

            const rotateValues = [-60, 60, 0]

            labels.forEach((label, i) => {
                this.legend
                    .append('text')
                    .attr('x', labelPositions[i][0])
                    .attr('y', labelPositions[i][1])
                    .attr('class', 'em-axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('transform', `rotate(${rotateValues[i]},${labelPositions[i][0]},${labelPositions[i][1]})`)
                    .text(label)
            })
        } else {
            // 'corner'
            const labelPositions = [
                [svgCorners[0][0], svgCorners[0][1] + 25], // p1
                [svgCorners[1][0], svgCorners[1][1] - 15], // p2
                [svgCorners[2][0], svgCorners[2][1] + 25], // p3
            ]

            labels.forEach((label, i) => {
                this.legend
                    .append('text')
                    .attr('class', 'em-legend-label em-ternary-legend-label')
                    .attr('x', labelPositions[i][0])
                    .attr('y', labelPositions[i][1])
                    .attr('text-anchor', 'middle')
                    .text(label)
            })
        }

        // Add grid lines and labels at 25%, 50%, 75% for each axis
        // ===============================
        // Grid lines (major + minor)
        // ===============================
        const majorGrid = [0.25, 0.5, 0.75]
        const minorStep = 0.05

        const minorGrid: number[] = []
        for (let v = minorStep; v < 1; v += minorStep) {
            if (!majorGrid.includes(+v.toFixed(2))) {
                minorGrid.push(+v.toFixed(2))
            }
        }

        const drawGridLine = (a: TernaryPoint, b: TernaryPoint, major: boolean) => {
            const [x1, y1] = this.ternaryToSvgCoords(a, size)
            const [x2, y2] = this.ternaryToSvgCoords(b, size)

            this.legend
                .append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', colorTarget === 'triangles' ? 'white' : '#555')
                .attr('stroke-width', major ? 0.6 : 0.3)
                .attr('opacity', major ? 0.7 : 0.25)
                .attr('stroke-dasharray', major ? null : '2,2')
                .attr('class', major ? 'em-ternary-grid-line' : 'em-ternary-grid-line-minor')
        }

        if (showLines) {
            // --- minor grid first (background) ---
            minorGrid.forEach((v) => {
                // p1
                drawGridLine([v, 0, 1 - v], [v, 1 - v, 0], false)

                // p2
                drawGridLine([0, v, 1 - v], [1 - v, v, 0], false)

                // p3
                drawGridLine([1 - v, 0, v], [0, 1 - v, v], false)
            })

            // --- major grid on top ---
            majorGrid.forEach((v) => {
                // p1
                drawGridLine([v, 0, 1 - v], [v, 1 - v, 0], true)

                // p2
                drawGridLine([0, v, 1 - v], [1 - v, v, 0], true)

                // p3
                drawGridLine([1 - v, 0, v], [0, 1 - v, v], true)
            })
        }

        // ===============================
        // Axis labels (unchanged)
        // ===============================
        majorGrid.forEach((val) => {
            const line = [this.ternaryToSvgCoords([val, 1 - val, 0], size), this.ternaryToSvgCoords([val, 0, 1 - val], size)]

            this.legend
                .append('text')
                .attr('x', line[0][0] - 5)
                .attr('y', line[0][1])
                .attr('text-anchor', 'end')
                .attr('font-size', '10px')
                .attr('class', 'em-ternary-axis-label')
                .text(`${val * 100}%`)
        })

        majorGrid.forEach((val) => {
            const line = [this.ternaryToSvgCoords([0, val, 1 - val], size), this.ternaryToSvgCoords([1 - val, val, 0], size)]

            this.legend
                .append('text')
                .attr('x', line[0][0] + 5)
                .attr('y', line[0][1])
                .attr('text-anchor', 'start')
                .attr('font-size', '10px')
                .attr('class', 'em-ternary-axis-label')
                .text(`${val * 100}%`)
        })

        majorGrid.forEach((val) => {
            const line = [this.ternaryToSvgCoords([1 - val, 0, val], size), this.ternaryToSvgCoords([0, 1 - val, val], size)]

            this.legend
                .append('text')
                .attr('x', line[0][0])
                .attr('y', line[0][1] + 10)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('class', 'em-ternary-axis-label')
                .text(`${val * 100}%`)
        })
    }

    /**
     * Add data points to the visualization
     */
    private addDataPoints(
        data: TernaryPoint[],
        size: number,
        handlers?: {
            mouseover?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
            mousemove?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
            mouseout?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
        },
        showCenter?: boolean,
        center?: TernaryPoint,
        colors?: TricoloreResult[],
        colorTarget: 'triangles' | 'points' = 'triangles'
    ): void {
        const closed = CompositionUtils.close([...data])
        // Validate data (this will throw an error if invalid)
        CompositionUtils.validateTernaryPoints(closed)
        // TODO: decide if we want
        //  - to throw an error (current behavior)
        //  - to silently ignore invalid points
        //  - to filter out invalid points and warn about it
        //  - to warn and skip plotting points
        // try {
        //   CompositionUtils.validateTernaryPoints(data);
        // } catch (e) {
        //   console.warn('Invalid ternary points:', e);
        //   return;
        // }

        closed.forEach((p, i) => {
            if (p) {
                const [x, y] = this.ternaryToSvgCoords(p, size)
                const fill = colorTarget === 'points' && colors && colors[i] && colors[i].rgb ? colors[i].rgb : 'black'

                const c = this.circles
                    .append('circle')
                    .datum({ point: p, index: i })
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 2)
                    .attr('fill', fill)
                    .attr('opacity', colorTarget === 'points' ? 1 : 0.7)
                    .attr('class', 'em-ternary-legend-data-point')
                if (handlers?.mouseover) {
                    c.on('mouseover', (e) => handlers.mouseover!(e, c.datum()))
                }
                if (handlers?.mousemove) {
                    c.on('mousemove', (e) => handlers.mousemove!(e, c.datum()))
                }
                if (handlers?.mouseout) {
                    c.on('mouseout', (e) => handlers.mouseout!(e, c.datum()))
                }
            }
        })

        if (showCenter) {
            const centerSvg = this.ternaryToSvgCoords(center, size)
            const [cx, cy] = centerSvg

            //LINES
            const guides: [TernaryPoint, TernaryPoint][] = [
                // p₁ = c1 → bottom edge (p2 = 0)
                [[center[0], 0, 1 - center[0]], center],

                // p₂ = c2 → LEFT edge (p3 = 0)  ← THIS WAS WRONG BEFORE
                [[1 - center[1], center[1], 0], center],

                // p₃ = c3 → right edge (p1 = 0)
                [[0, 1 - center[2], center[2]], center],
            ]

            guides.forEach(([a, b]) => {
                const [x1, y1] = this.ternaryToSvgCoords(a, size)
                const [x2, y2] = this.ternaryToSvgCoords(b, size)

                this.circles
                    .append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x2)
                    .attr('y2', y2)
                    .attr('stroke', colorTarget === 'triangles' ? 'white' : '#000')
                    .attr('stroke-width', colorTarget === 'triangles' ? 1 : 0.6)
                    .attr('opacity', colorTarget === 'triangles' ? 0.9 : 0.6)
                    .attr('class', 'em-ternary-center-line')
            })

            this.circles
                .append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 3)
                .attr('fill', 'black')
                .attr('stroke', 'white')
                .attr('class', 'em-ternary-center-point')
        }
    }

    /**
     * Add a curved annotation from the ternary center point
     * to the top of the legend area explaining what it is.
     */
    private addCenterAnnotation(size: number, center: TernaryPoint, text: string = 'Average value'): void {
        const [cx, cy] = this.ternaryToSvgCoords(center, size)

        // Target point above the triangle (inside legend space)
        const tx = cx + size/3 //offset to the right
        const ty = 30

        // Control point for curvature (pulls curve upward)
        const mx = cx
        const my = cy - size/3

        const path = `
        M ${cx},${cy}
        Q ${mx},${my} ${tx},${ty}
    `

        const g = this.legend.append('g').attr('class', 'em-ternary-center-annotation')

        // Curved guide line
        g.append('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', '#444')
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.8)

        // Small dot at the end (optional but helps)
        //g.append('circle').attr('cx', tx).attr('cy', ty).attr('r', 2).attr('fill', '#444')

        // Label
        g.append('text')
            .attr('x', tx)
            .attr('y', ty - 6)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#444')
            .attr('class', 'em-ternary-center-annotation-label')
            .text(text)
    }

    /**
     * Convert ternary coordinates to SVG coordinates
     */
    private ternaryToSvgCoords(p: TernaryPoint, size: number): [number, number] {
        const [x, y] = TernaryGeometry.ternaryToCartesian(p)
        return [x * size, size - y * size]
    }

    /**
     * Convert SVG coordinates to ternary coordinates
     */
    private svgToTernaryCoords(point: [number, number], size: number): TernaryPoint {
        return TernaryGeometry.cartesianToTernary(point[0] / size, 1 - point[1] / size)
    }
}
