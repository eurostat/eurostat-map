import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for trivariate choropleth maps.
 */
export interface TrivariateChoroplethConfig extends MapConfig {
    ternaryCodes?: [string, string, string]
    noDataFillStyle?: string
    ternarySettings?: {
        hue?: number
        chroma?: number
        lightness?: number
        contrast?: number
        spread?: number
        breaks?: number
        meanCentering?: boolean
    }
}
