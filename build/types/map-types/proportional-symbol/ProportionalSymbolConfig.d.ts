import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for proportional symbol maps
 */
export interface ProportionalSymbolConfig extends MapConfig {
    symbol?: 'circle' | 'square'
    size?: number
    sizeMin?: number
    sizeMax?: number
    symbolFillStyle?: string
    symbolStrokeStyle?: string
    symbolStrokeWidth?: number

    // Dorling cartogram
    dorling?: boolean
    dorlingIterations?: number

    // Size function
    psCustomSize?: (value: number) => number

    // Scaling
    psScale?: 'sqrt' | 'linear' | 'radial'
}
