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
    /** Grouped bar settings object. */
    barSettings?: {
        type?: 'stacked' | 'grouped'
        minWidth?: number
        maxWidth?: number
        height?: number
        groupWidth?: number
        groupMinWidth?: number
        groupMaxWidth?: number
        groupGap?: number
        groupMinHeight?: number
        groupMaxHeight?: number
        groupMaxValue?: number
        groupMaxWidthValue?: number
        strokeFill?: string
        strokeWidth?: number
        cornerRadius?: number
        otherColor?: string
        otherText?: string
        tooltipWidth?: number
        tooltipHeight?: number
    }
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
    /** Bar total code. */
    barTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: BarChartLegendConfig | false
}
