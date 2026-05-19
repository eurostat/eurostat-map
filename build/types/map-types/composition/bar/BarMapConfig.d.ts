import type { MapConfig } from '../../../core/MapConfig'

/**
 * Configuration for bar chart composition maps.
 */
export interface BarMapConfig extends MapConfig {
    barType?: 'stacked' | 'grouped'
    catColors?: Record<string, string>
    catLabels?: Record<string, string>
    showOnlyWhenComplete?: boolean
    noDataFillStyle?: string
    barMinWidth?: number
    barMaxWidth?: number
    barHeight?: number
    barGroupWidth?: number
    barGroupGap?: number
    barGroupMinHeight?: number
    barGroupMaxHeight?: number
    barStrokeFill?: string
    barStrokeWidth?: number
    barCornerRadius?: number
    barOtherColor?: string
    barOtherText?: string
    barTooltipWidth?: number
    barTooltipHeight?: number
    dorling?: boolean
    animateDorling?: boolean
    barTotalCode?: string
    statCodes?: string[]
}
