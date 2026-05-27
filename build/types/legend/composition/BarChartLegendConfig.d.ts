import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for size legend in bar chart maps.
 */
export interface BarChartSizeLegendConfig {
    /** Title for the size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Custom values to display in the size legend. If null, auto-generates [min, mid, max]. */
    values?: number[] | null

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** Whether to show a "no data" item. @default false */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string
}

/**
 * Configuration for color legend in bar chart maps.
 */
export interface BarChartColorLegendConfig {
    /** Title for the color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Top margin (distance from size legend) in pixels. @default 20 */
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
 * Configuration for bar chart map legends.
 * Adapts automatically to the map's barType ('stacked' or 'grouped').
 */
export interface BarChartLegendConfig extends LegendConfig {
    /** Configuration for the bar size legend. Set to false to hide. */
    sizeLegend?: Partial<BarChartSizeLegendConfig> | false

    /** Configuration for the color/category legend. Set to false to hide. */
    colorLegend?: Partial<BarChartColorLegendConfig> | false
}
