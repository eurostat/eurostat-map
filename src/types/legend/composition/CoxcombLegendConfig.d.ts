import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for size legend in coxcomb (polar area) charts.
 */
export interface CoxcombSizeLegendConfig {
    /** Title for the size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 15 */
    titlePadding?: number

    /** Custom values to display in the size legend. If not specified, values are auto-generated. */
    values?: number[] | null

    /** Custom labels for the size legend values. */
    labels?: string[] | null

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | null
}

/**
 * Configuration for color legend in coxcomb (polar area) charts.
 */
export interface CoxcombColorLegendConfig {
    /** Title for the color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 15 */
    titlePadding?: number

    /** Top margin for the color legend in pixels. @default 23 */
    marginTop?: number

    /** Offset adjustments for labels. @default { x: 5, y: 5 } */
    labelOffsets?: { x: number; y: number }

    /** Width of color swatches in pixels. @default 25 */
    shapeWidth?: number

    /** Height of color swatches in pixels. @default 20 */
    shapeHeight?: number

    /** Padding between swatches in pixels. @default 1 */
    shapePadding?: number

    /** Whether to show a "no data" item. @default true */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string
}

/**
 * Configuration for time legend in coxcomb (polar area) charts.
 */
export interface CoxcombTimeLegendConfig {
    /** Title for the time legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 15 */
    titlePadding?: number

    /** Top margin for the time legend in pixels. @default 20 */
    marginTop?: number

    /** Radius of the time legend circle in pixels. @default 35 */
    radius?: number
}

/**
 * Configuration for coxcomb (polar area) chart legends.
 * Supports separate sub-legends for size, color, and time dimensions.
 */
export interface CoxcombLegendConfig extends LegendConfig {
    /** Configuration for the wedge size legend. */
    sizeLegend?: Partial<CoxcombSizeLegendConfig>

    /** Configuration for the color/category legend. */
    colorLegend?: Partial<CoxcombColorLegendConfig>

    /** Configuration for the time period legend. */
    timeLegend?: Partial<CoxcombTimeLegendConfig>
}
