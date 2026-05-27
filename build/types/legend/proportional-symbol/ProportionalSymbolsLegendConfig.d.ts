import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for size legend in proportional symbol maps.
 */
export interface ProportionalSymbolSizeLegendConfig {
    /** Title for the size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 15 */
    titlePadding?: number

    /** Manually defined raw data values for the size legend. */
    values?: number[]

    /** Number of elements to display in the legend. @default 3 */
    cellNb?: number

    /** Vertical distance between consecutive legend shape elements in pixels. @default 15 */
    shapePadding?: number

    /** Offset adjustments for shapes. @default { x: 0, y: 0 } */
    shapeOffsets?: { x: number; y: number }

    /** Fill color for shapes in the legend. @default 'white' */
    shapeFill?: string

    /** Stroke color for shapes in the legend. */
    shapeStroke?: string | null

    /** Stroke width for shapes in the legend in pixels. */
    shapeStrokeWidth?: number | null

    /** Offset adjustments for labels. @default { x: 10, y: 0 } */
    labelOffsets?: { x: number; y: number }

    /** Number of decimal places for legend labels. @default 0 */
    decimals?: number

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** User-defined labels for each size. */
    labels?: string[] | null

    /** Whether to show a "no data" item. @default false */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string
}

/**
 * Configuration for color legend in proportional symbol maps.
 */
export interface ProportionalSymbolColorLegendConfig {
    /** Title for the color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Top margin (distance from size legend) in pixels. @default 30 */
    marginTop?: number

    /** Width of color swatches in pixels. @default 25 */
    shapeWidth?: number

    /** Height of color swatches in pixels. @default 20 */
    shapeHeight?: number

    /** Padding between swatches in pixels. @default 1 */
    shapePadding?: number

    /** Offset adjustments for labels. @default { x: 5, y: 0 } */
    labelOffsets?: { x: number; y: number }

    /** Number of decimal places for legend labels. @default 0 */
    decimals?: number

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** Type of labels to show. @default 'thresholds' */
    labelType?: 'thresholds' | 'ranges'

    /** User-defined labels for each class. */
    labels?: string[] | null

    /** Whether to show a "no data" item. @default true */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string

    /** Length of separation line in pixels. @default 24 */
    sepLineLength?: number

    /** Color of separation line. @default 'black' */
    sepLineStroke?: string

    /** Width of separation line in pixels. @default 1 */
    sepLineStrokeWidth?: number

    /** Length of threshold ticks in pixels. @default 5 */
    tickLength?: number

    /** Label for the point of divergence in diverging legends. */
    pointOfDivergenceLabel?: string

    /** Value at the point of divergence in diverging legends. */
    pointOfDivergence?: number

    /** Padding around divergence point in pixels. @default 7 */
    pointOfDivergencePadding?: number

    /** Length of diverging line in pixels. */
    divergingLineLength?: number

    /** Length of diverging arrows in pixels. */
    divergingArrowLength?: number
}

/**
 * Configuration for proportional symbol map legends.
 * Shows both symbol size and color classifications.
 */
export interface ProportionalSymbolsLegendConfig extends LegendConfig {
    /** Configuration for the symbol size legend. */
    sizeLegend?: Partial<ProportionalSymbolSizeLegendConfig>

    /** Configuration for the color classification legend. Set to false to hide. */
    colorLegend?: Partial<ProportionalSymbolColorLegendConfig> | false
}
