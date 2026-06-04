import type { MapConfig } from '../../core/MapConfig'
import type { TrivariateLegendConfig } from '../../legend/choropleth/TrivariateLegendConfig'

/**
 * Ternary color settings for trivariate choropleth maps.
 */
export interface TrivariateTernarySettings {
    /** Use sextant color mapping instead of continuous tricolore. */
    sextant?: boolean
    /** Array of 6 colors used when sextant mode is enabled. */
    sextantColors?: [string, string, string, string, string, string]
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
    ternarySettings?: TrivariateTernarySettings
}
