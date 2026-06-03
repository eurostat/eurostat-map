import type { MapConfig } from '../../../core/MapConfig'
import type { PieChartLegendConfig } from '../../../legend/composition/PieChartLegendConfig'

/**
 * Configuration for pie chart composition maps.
 */
export interface PieMapConfig extends MapConfig {
    /** Pie-specific rendering settings. */
    pieSettings?: {
        innerRadius?: number
    }
    /** Consolidated composition symbol settings. */
    compositionSettings?: {
        type?: 'flag' | 'pie' | 'ring' | 'segment' | 'radar' | 'agepyramid' | 'halftone'
        minSize?: number
        maxSize?: number
        strokeFill?: string
        strokeWidth?: number
        reverseOrder?: boolean
        stripesOrientation?: number
        offsetAngle?: number
        agePyramidHeightFactor?: number
        otherColor?: string
        otherText?: string
    }
    /** Tooltip pie radius. */
    tooltipPieRadius?: number
    /** Tooltip pie inner radius. */
    tooltipPieInnerRadius?: number
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Dorling. */
    dorling?: boolean
    /** Total code used to compute optional 'other' composition share. */
    compositionTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: PieChartLegendConfig | false
}
