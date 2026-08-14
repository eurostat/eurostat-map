import type { MapConfig } from '../../core/MapConfig'

export interface ProportionalSymbolSettings {
    /** Symbol shape. Accepted values: 'circle', 'bar', 'square', 'star', 'diamond', 'wye', 'cross', 'triangle', 'spike'. */
    shape?: string
    /** Custom d3-shape symbol type, used when shape is not one of the built-in shapes. */
    customShape?: any
    /** Custom SVG symbol markup/selector to use instead of a built-in shape. */
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
    sizeScale?: 'sqrt' | 'linear'
    minSize?: number
    maxSize?: number
    classes?: number
    colors?: string[] | null
    /** d3-scale-chromatic interpolator used to auto-generate colors when not set explicitly. */
    colorFun?: (t: number) => string
    /** Function mapping a class index and the number of classes to a fill color. */
    classToFillStyle?: (ecl: number, numberOfClasses: number) => string
    thresholds?: number[]
    classificationMethod?: 'quantile' | 'equinter' | 'threshold'
    brightenFactor?: number
    codeLabels?: boolean
}

/**
 * Configuration for proportional symbol maps
 */
export interface ProportionalSymbolConfig extends MapConfig {
    /**
     * Fill styles for categorical exceptions, keyed by raw value - colors the matching region's
     * own polygon, independently of its symbol (which represents a separate, numeric value and
     * doesn't render at all for a region whose value is a category with no magnitude).
     */
    categoryFillStyle?: { [rawValue: string]: string }
    /** Legend and tooltip labels for categorical exceptions, keyed by raw value. */
    categoryText?: { [rawValue: string]: string }

    /** Dorling cartogram. */
    dorling?: boolean

    /** Dorling simulation settings for this layer. Defaults to the map's dorlingSettings. */
    dorlingSettings?: import('../../core/DorlingSettings').DorlingSettings

    /** Grouped proportional symbol style settings. Preferred over the individual `ps*` fields below. */
    psSettings?: ProportionalSymbolSettings

    /** Symbol shape. Accepted values: 'circle', 'bar', 'square', 'star', 'diamond', 'wye', 'cross', 'triangle', 'spike'. @default 'circle' */
    psShape?: string
    /** Custom d3-shape symbol type, used when psShape is not one of the built-in shapes. */
    psCustomShape?: any
    /** Custom SVG symbol markup/selector to use instead of a built-in shape. */
    psCustomSVG?: any
    /** Width in pixels of spike symbols (psShape: 'spike'). @default 7 */
    psSpikeWidth?: number
    /** Pixel offset {x, y} applied to each symbol, scaled with symbol size. */
    psOffset?: { x: number; y: number }
    /** Width in pixels of vertical bar symbols (psShape: 'bar'). @default 10 */
    psBarWidth?: number
    /** Max symbol size in pixels. @default 30 */
    psMaxSize?: number
    /** Min symbol size in pixels. @default 5 */
    psMinSize?: number
    /** Value mapped to psMaxSize. Auto-detected from the data when omitted. */
    psMaxValue?: number
    /** Value mapped to psMinSize. Auto-detected from the data when omitted. */
    psMinValue?: number
    /** Size scale type. @default 'sqrt' */
    psSizeScale?: 'sqrt' | 'linear'
    /** Fill color, used when the symbols are not colored by a classified stat. @default '#009569' */
    psFill?: string
    /** Fill opacity. @default 1 */
    psFillOpacity?: number
    /** Stroke color. @default '#ffffff' */
    psStroke?: string
    /** Stroke width. @default 0.2 */
    psStrokeWidth?: number
    /** Stroke opacity. @default 1 */
    psStrokeOpacity?: number
    /** Number of color classes. @default 5 */
    psClasses?: number
    /** Colors used for the color classes. */
    psColors?: string[] | null
    /** d3-scale-chromatic interpolator used to auto-generate psColors when not set explicitly. */
    psColorFun?: any
    /** Function mapping a class index to a fill color. Auto-derived from psColors/psColorFun when unset. */
    psClassToFillStyle?: any
    /** Thresholds, used when psClassificationMethod is 'threshold'. */
    psThresholds?: number[]
    /** Color classification method. @default 'quantile' */
    psClassificationMethod?: 'quantile' | 'equinter' | 'threshold'
    /** Brighten factor applied to generated color classes. @default 0.9 */
    psBrightenFactor?: number
    /** Show region code labels next to symbols. @default false */
    psCodeLabels?: boolean
    /** The classifier function used for sizing symbols. */
    classifierSize?: any
    /** The classifier function used for coloring symbols. */
    classifierColor?: any
}
