import type { MapConfig } from '../../core/MapConfig'

export interface ProportionalSymbolSettings {
    stroke?: string
    strokeWidth?: number
    sizeScale?: 'sqrt' | 'linear' | any
    minSize?: number
    maxSize?: number
    codeLabels?: boolean
}

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

    /** Grouped proportional symbol style settings. */
    psSettings?: ProportionalSymbolSettings
}
