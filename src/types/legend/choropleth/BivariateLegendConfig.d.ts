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

    /** Break points for the first variable. Auto-calculated if undefined. */
    breaks1?: number[]

    /** Break points for the second variable. Auto-calculated if undefined. */
    breaks2?: number[]

    /** Whether to show break labels on the axes. @default false */
    showBreaks?: boolean

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

    /** Whether to show arrows at the end of the axes. @default true */
    axisArrows?: boolean

    /** Height of axis arrows in pixels. @default 15 */
    arrowHeight?: number

    /** Width of axis arrows in pixels. @default 14 */
    arrowWidth?: number

    /** Padding between arrow and axis label in pixels. @default 10 */
    arrowPadding?: number
}
