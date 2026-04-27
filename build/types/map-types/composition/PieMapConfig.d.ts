import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for pie chart composition maps.
 */
export interface PieMapConfig extends MapConfig {
    pieMinRadius?: number
    pieMaxRadius?: number
    pieChartInnerRadius?: number
    pieStrokeFill?: string
    pieStrokeWidth?: number
    tooltipPieRadius?: number
    tooltipPieInnerRadius?: number
    catColors?: Record<string, string>
    catLabels?: Record<string, string>
    pieOtherColor?: string
    pieOtherText?: string
    showOnlyWhenComplete?: boolean
    noDataFillStyle?: string
    dorling?: boolean
    animateDorling?: boolean
    pieTotalCode?: string
    statCodes?: string[]
}
