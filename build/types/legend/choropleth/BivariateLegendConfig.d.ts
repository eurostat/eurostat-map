import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for bivariate choropleth map legends.
 * Displays a 2D grid showing the relationship between two variables,
 * with color squares representing different class combinations.
 */
export interface BivariateLegendConfig extends LegendConfig {
    /** Size of the legend square grid in pixels. @default 100 */
    squareSize?: number

    /** Rotation angle of the legend in degrees. @default 0 */
    rotation?: number

    /** Label for the first variable (y-axis). @default 'Variable 1' */
    label1?: string

    /** Label for the second variable (x-axis). @default 'Variable 2' */
    label2?: string

    /** Break labels for the first variable. Omit to hide first-axis break labels. */
    breaks1?: Array<number | string>

    /** Break labels for the second variable. Omit to hide second-axis break labels. */
    breaks2?: Array<number | string>

    /** Length of axis tick marks in pixels. @default 5 */
    tickLength?: number

    /** Offset adjustments for y-axis labels. @default { x: 0, y: 0 } */
    yAxisLabelsOffset?: { x: number; y: number }

    /** Offset adjustments for x-axis labels. @default { x: 0, y: 0 } */
    xAxisLabelsOffset?: { x: number; y: number }

    /** Offset adjustments for y-axis title. @default { x: 0, y: 0 } */
    yAxisTitleOffset?: { x: number; y: number }

    /** Offset adjustments for x-axis title. @default { x: 0, y: 0 } */
    xAxisTitleOffset?: { x: number; y: number }

    /** Extra vertical offset for the "no data" legend item in pixels. @default 30 */
    noDataYOffset?: number

    /** Whether to show arrows at the end of both axes, or for each axis independently. @default true */
    axisArrows?: boolean | { x?: boolean; y?: boolean }

    /** Height of axis arrows in pixels. @default 15 */
    arrowHeight?: number

    /** Width of axis arrows in pixels. @default 14 */
    arrowWidth?: number

    /** Padding between arrow and axis label in pixels. @default 10 */
    arrowPadding?: number

    /**
     * Labels displayed at low/high ends of each axis.
     * @default { x: { low: 'Low', high: 'High' }, y: { low: 'Low', high: 'High' } }
     */
    axisExtremes?: {
        x?: { low?: string; high?: string }
        y?: { low?: string; high?: string }
    }

    /** Whether to show low/high endpoint labels on both axes, or for each axis independently. @default true */
    showAxisExtremes?: boolean | { x?: boolean; y?: boolean }

    /**
     * Optional text annotations for each corner of the bivariate square.
     * Add text for any combination of topRight, bottomRight, bottomLeft, topLeft.
     * Supports line breaks using '<br>'/'<br/>' or '\\n'.
     */
    annotations?: {
        topRight?: string
        bottomRight?: string
        bottomLeft?: string
        topLeft?: string
    }

    /**
     * Length of corner annotation callout lines in pixels.
     * Can be a single number for all corners, or per-corner values.
     * @default 18
     */
    annotationLineLength?:
        | number
        | {
              topRight?: number
              bottomRight?: number
              bottomLeft?: number
              topLeft?: number
          }

    /**
     * Annotation text offsets in pixels.
     * Use global `{ x, y }` or per-corner values.
     * @default auto (based on corner direction)
     */
    annotationOffsets?:
        | { x?: number; y?: number }
        | {
              topRight?: { x?: number; y?: number }
              bottomRight?: { x?: number; y?: number }
              bottomLeft?: { x?: number; y?: number }
              topLeft?: { x?: number; y?: number }
          }

    /**
     * Extra offset applied to the leader-line endpoint where it meets the annotation label.
     * Use global `{ x, y }` or per-corner values.
     * @default { x: 0, y: 0 }
     */
    annotationLineEndOffset?:
        | { x?: number; y?: number }
        | {
              topRight?: { x?: number; y?: number }
              bottomRight?: { x?: number; y?: number }
              bottomLeft?: { x?: number; y?: number }
              topLeft?: { x?: number; y?: number }
          }

    /**
     * @deprecated Use annotationOffsets instead.
     * Radial padding between corner annotation callout line end and text in pixels.
     */
    annotationPadding?:
        | number
        | {
              topRight?: number
              bottomRight?: number
              bottomLeft?: number
              topLeft?: number
          }
}
