import { LegendConfig } from './LegendConfig'

/**
 * Configuration for size legend in pie chart maps.
 */
export interface PieChartSizeLegendConfig {
    /** Title for the size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Custom values to display in the size legend. If not specified, values are auto-generated. */
    values?: number[] | null

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** Whether to show a "no data" item. @default false */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string
}

/**
 * Configuration for color legend in pie chart maps.
 */
export interface PieChartColorLegendConfig {
    /** Title for the color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Top margin (distance from size legend) in pixels. @default 33 */
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
 * Configuration for pie chart map legends.
 * Supports separate legends for pie size and slice colors.
 */
export interface PieChartLegendConfig extends LegendConfig {
    /** Configuration for the pie size legend. Set to false to hide. */
    sizeLegend?: Partial<PieChartSizeLegendConfig> | false

    /** Configuration for the color/category legend. Set to false to hide. */
    colorLegend?: Partial<PieChartColorLegendConfig> | false
}
