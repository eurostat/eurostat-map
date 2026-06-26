import type { MapConfig } from '../../core/MapConfig'

export interface ProportionalSymbolSettings {
    shape?: string
    customShape?: any
    customSVG?: any
    spikeWidth?: number
    offset?: { x: number; y: number }
    barWidth?: number
    minValue?: number | undefined
    maxValue?: number | undefined
    fill?: string
    fillOpacity?: number
    stroke?: string
    strokeWidth?: number
    strokeOpacity?: number
    sizeScale?: 'sqrt' | 'linear' | any
    minSize?: number
    maxSize?: number
    classes?: number
    colors?: string[] | null
    colorFun?: any
    classToFillStyle?: any
    thresholds?: number[]
    classificationMethod?: string
    brightenFactor?: number
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
