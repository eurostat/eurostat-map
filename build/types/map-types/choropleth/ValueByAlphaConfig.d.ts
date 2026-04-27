import type { ChoroplethConfig } from './ChoroplethConfig'

/**
 * Configuration for value-by-alpha choropleth maps.
 */
export interface ValueByAlphaConfig extends ChoroplethConfig {
    opacityScale?: (value: number) => number
}
