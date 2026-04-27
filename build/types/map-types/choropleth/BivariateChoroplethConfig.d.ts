import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for bivariate choropleth maps.
 */
export interface BivariateChoroplethConfig extends MapConfig {
    numberOfClasses?: number
    breaks1?: number[]
    breaks2?: number[]
    startColor?: string
    color1?: string
    color2?: string
    endColor?: string
    noDataFillStyle?: string
}
