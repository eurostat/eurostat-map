import { LegendConfig } from './LegendConfig'

/**
 * Configuration for size legend in mushroom (dual semi-circle) charts.
 */
export interface MushroomSizeLegendConfig {
    /** Top margin for the size legend in pixels. @default 15 */
    marginTop?: number

    /** Custom values to display in the size legend (when using single scale). Raw data values. */
    values?: number[]

    /** Custom values for variable 1 side (when using independent scales). Raw data values. */
    valuesV1?: number[]

    /** Custom values for variable 2 side (when using independent scales). Raw data values. */
    valuesV2?: number[]

    /** Custom labels for the size legend values. */
    labels?: string[] | null

    /** Custom labels for variable 1 side. */
    labelsV1?: string[] | null

    /** Custom labels for variable 2 side. */
    labelsV2?: string[] | null

    /** Vertical spacing between legend items in pixels. @default 2 */
    shapePadding?: number

    /** Offset adjustments for labels. @default { x: 5, y: 0 } */
    labelOffsets?: { x: number; y: number }
}

/**
 * Configuration for color legend in mushroom (dual semi-circle) charts.
 */
export interface MushroomColorLegendConfig {
    /** Top margin for the color legend in pixels. @default 5 */
    marginTop?: number

    /** Offset adjustments for labels. @default { x: 5, y: 5 } */
    labelOffsets?: { x: number; y: number }
}

/**
 * Configuration for mushroom (dual semi-circle) chart legends.
 * Mushroom charts show two variables as semi-circles forming a circle, with size and color dimensions.
 */
export interface MushroomLegendConfig extends LegendConfig {
    /** Configuration for the mushroom size legend. */
    sizeLegend?: Partial<MushroomSizeLegendConfig>

    /** Configuration for the color/category legend. */
    colorLegend?: Partial<MushroomColorLegendConfig>
}
