import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for the color legend in stripe composition maps.
 */
export interface StripeCompositionColorLegendConfig {
    /** Title for the color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Top margin in pixels. @default 33 */
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

    /** Text label for "no data" item. @default map.noDataText() */
    noDataText?: string
}

/**
 * Configuration for stripe composition map legends.
 * Used to display a legend with colored rectangles representing different categories
 * in stripe composition maps (regions divided into colored stripes showing composition).
 */
export interface StripeCompositionLegendConfig extends LegendConfig {
    /** Configuration for the color/category legend. Set to false to hide. */
    colorLegend?: Partial<StripeCompositionColorLegendConfig> | false
}
