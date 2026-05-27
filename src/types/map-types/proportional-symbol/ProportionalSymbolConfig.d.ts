import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for proportional symbol maps
 */
export interface ProportionalSymbolConfig extends MapConfig {
    /** Symbol shape used for markers. */
    symbol?: 'circle' | 'square'
    /** Base symbol size factor. */
    size?: number

    /** Dorling cartogram. */
    dorling?: boolean

    /** Size function. */
    psCustomSize?: (value: number) => number
}
