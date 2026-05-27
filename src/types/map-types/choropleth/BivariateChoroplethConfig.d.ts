import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for bivariate choropleth maps.
 */
export interface BivariateChoroplethConfig extends MapConfig {
    /** Number of classes. */
    numberOfClasses?: number
    /** Breaks1. */
    breaks1?: number[]
    /** Breaks2. */
    breaks2?: number[]
    /** Start color. */
    startColor?: string
    /** Color1. */
    color1?: string
    /** Color2. */
    color2?: string
    /** End color. */
    endColor?: string
    /** No data fill style. */
    noDataFillStyle?: string
}
