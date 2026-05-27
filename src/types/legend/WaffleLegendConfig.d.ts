import { LegendConfig } from './LegendConfig'

/**
 * Configuration for size legend in waffle chart maps.
 */
export interface WaffleSizeLegendConfig {
    /** Title for the size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 10 */
    titlePadding?: number

    /** Custom values to display in the size legend. If not specified, values are auto-generated. */
    values?: number[] | null

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** Simplified grid size for size legend examples (e.g., 5 means 5x5 = 25 cells). @default 5 */
    gridSize?: number

    /** Padding between cells in size legend in pixels. @default 0.5 */
    cellPadding?: number

    /** Whether to show a "no data" item. @default false */
    noData?: boolean

    /** Text label for "no data" item. @default 'No data' */
    noDataText?: string
}

/**
 * Configuration for color legend in waffle chart maps.
 */
export interface WaffleColorLegendConfig {
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
 * Configuration for waffle chart map legends.
 * Waffle charts display data as grids of small squares, with colors representing categories.
 */
export interface WaffleLegendConfig extends LegendConfig {
    /** Configuration for the waffle size legend. */
    sizeLegend?: Partial<WaffleSizeLegendConfig>

    /** Configuration for the color/category legend. Set to false to hide. */
    colorLegend?: Partial<WaffleColorLegendConfig> | false
}
