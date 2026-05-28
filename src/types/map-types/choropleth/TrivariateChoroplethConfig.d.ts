import type { MapConfig } from '../../core/MapConfig'
import type { TrivariateLegendConfig } from '../../legend/choropleth/TrivariateLegendConfig'

/**
 * Configuration for trivariate choropleth maps.
 */
export interface TrivariateChoroplethConfig extends MapConfig {
    /** Trivariate choropleth legend configuration. */
    legend?: TrivariateLegendConfig | false

    /** Ternary codes. */
    ternaryCodes?: [string, string, string]
    /** No data fill style. */
    noDataFillStyle?: string
    /** Ternary settings. */
    ternarySettings?: {
        /** Hue. */
        hue?: number
        /** Chroma. */
        chroma?: number
        /** Lightness. */
        lightness?: number
        /** Contrast. */
        contrast?: number
        /** Spread. */
        spread?: number
        /** Breaks. */
        breaks?: number
        /** Mean centering. */
        meanCentering?: boolean
    }
}
