import type { MapConfig } from '../../../core/MapConfig'

/**
 * Configuration for waffle chart composition maps.
 */
export interface WaffleMapConfig extends MapConfig {
    waffleMinSize?: number
    waffleMaxSize?: number
    waffleGridSize?: number
    waffleCellPadding?: number
    waffleStrokeFill?: string
    waffleStrokeWidth?: number
    waffleRoundedCorners?: number
    waffleTooltipSize?: number
    catColors?: Record<string, string>
    catLabels?: Record<string, string>
    waffleOtherColor?: string
    waffleOtherText?: string
    showOnlyWhenComplete?: boolean
    noDataFillStyle?: string
    dorling?: boolean
    animateDorling?: boolean
    waffleTotalCode?: string
    statCodes?: string[]
}
