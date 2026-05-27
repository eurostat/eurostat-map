import { LegendConfig } from './LegendConfig'

/**
 * Configuration for scale legend in sparkline maps.
 */
export interface SparklineScaleLegendConfig {
    /** Title for the scale legend section. */
    title?: string | null

    /** Padding between title and chart in pixels. @default 5 */
    titlePadding?: number

    /** Whether to show an example sparkline with averaged data. @default false */
    showExampleChart?: boolean

    /** Whether to show the region with maximum value. @default true */
    showMaxRegion?: boolean

    /** Custom example data for the sparkline. If null, uses averaged data. */
    exampleData?: number[] | null

    /** Number of ticks on Y axis. @default 5 */
    tickCount?: number

    /** Custom tick format function for Y axis values. */
    tickFormat?: ((value: number) => string) | null

    /** Whether to show X axis with date labels. @default true */
    showXAxis?: boolean

    /** Rotation angle for X axis labels in degrees. @default -45 */
    xAxisRotation?: number

    /** Step for showing X axis ticks (1 = every tick, 2 = every other, etc.). @default 1 */
    xAxisTickStep?: number

    /** Margins around the sparkline cell. Defaults to match the map's sparkline chart margin. */
    margin?: { top: number; right: number; bottom: number; left: number }

    /** Opacity of the sparkline. @default 0.5 */
    lineOpacity?: number

    /** Stroke width of the sparkline. @default 1 */
    lineStrokeWidth?: number
}

/**
 * Configuration for no data legend in sparkline maps.
 */
export interface SparklineNoDataLegendConfig {
    /** Whether to show the no data legend item. @default true */
    show?: boolean

    /** Text label for "no data" item. @default 'No data' */
    text?: string
}

/**
 * Configuration for sparkline map legends.
 * Shows the Y-axis scale and optionally an example sparkline chart.
 */
export interface SparklineLegendConfig extends LegendConfig {
    /** Configuration for the scale legend showing Y-axis range. */
    scaleLegend?: Partial<SparklineScaleLegendConfig>

    /** Configuration for the no data legend. Set to false to hide. */
    noDataLegend?: Partial<SparklineNoDataLegendConfig> | false
}
