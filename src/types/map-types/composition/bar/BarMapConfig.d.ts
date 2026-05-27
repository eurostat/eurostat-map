import type { MapConfig } from '../../../core/MapConfig'
import type { BarChartLegendConfig } from '../../../legend/composition/BarChartLegendConfig'

/**
 * Configuration for bar chart composition maps.
 */
export interface BarMapConfig extends MapConfig {
    /** Bar type. */
    barType?: 'stacked' | 'grouped'
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Bar min width. */
    barMinWidth?: number
    /** Bar max width. */
    barMaxWidth?: number
    /** Bar height. */
    barHeight?: number
    /** Bar group width. */
    barGroupWidth?: number
    /** Bar group gap. */
    barGroupGap?: number
    /** Bar group min height. */
    barGroupMinHeight?: number
    /** Bar group max height. */
    barGroupMaxHeight?: number
    /** Bar stroke fill. */
    barStrokeFill?: string
    /** Bar stroke width. */
    barStrokeWidth?: number
    /** Bar corner radius. */
    barCornerRadius?: number
    /** Bar other color. */
    barOtherColor?: string
    /** Bar other text. */
    barOtherText?: string
    /** Bar tooltip width. */
    barTooltipWidth?: number
    /** Bar tooltip height. */
    barTooltipHeight?: number
    /** Dorling. */
    dorling?: boolean
    /** Animate dorling. */
    animateDorling?: boolean
    /** Bar total code. */
    barTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: BarChartLegendConfig | false
}
