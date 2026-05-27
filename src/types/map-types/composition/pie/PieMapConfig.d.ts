import type { MapConfig } from '../../../core/MapConfig'
import type { PieChartLegendConfig } from '../../../legend/composition/PieChartLegendConfig'

/**
 * Configuration for pie chart composition maps.
 */
export interface PieMapConfig extends MapConfig {
    /** Pie min radius. */
    pieMinRadius?: number
    /** Pie max radius. */
    pieMaxRadius?: number
    /** Pie chart inner radius. */
    pieChartInnerRadius?: number
    /** Pie stroke fill. */
    pieStrokeFill?: string
    /** Pie stroke width. */
    pieStrokeWidth?: number
    /** Tooltip pie radius. */
    tooltipPieRadius?: number
    /** Tooltip pie inner radius. */
    tooltipPieInnerRadius?: number
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Pie other color. */
    pieOtherColor?: string
    /** Pie other text. */
    pieOtherText?: string
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Dorling. */
    dorling?: boolean
    /** Pie total code. */
    pieTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: PieChartLegendConfig | false
}
