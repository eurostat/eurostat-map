import type { MapConfig } from '../../../core/MapConfig'
import type { BarChartLegendConfig } from '../../../legend/composition/BarChartLegendConfig'

/**
 * Configuration for bar chart composition maps.
 */
export interface BarMapConfig extends MapConfig {
    /** @deprecated Use barSettings.type */
    barType?: 'stacked' | 'grouped'
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** @deprecated Use barSettings.minWidth */
    barMinWidth?: number
    /** @deprecated Use barSettings.maxWidth */
    barMaxWidth?: number
    /** @deprecated Use barSettings.height */
    barHeight?: number
    /** @deprecated Use barSettings.groupWidth */
    barGroupWidth?: number
    /** Consolidated bar chart style settings. */
    barSettings?: {
        /** 'stacked': one bar per region, category segments stacked; 'grouped': category bars
         * side-by-side. @default 'grouped' */
        type?: 'stacked' | 'grouped'
        minWidth?: number
        maxWidth?: number
        height?: number
        /** Width of each grouped bar. Defaults to cell width / number of categories. */
        groupWidth?: number
        groupMinWidth?: number
        groupMaxWidth?: number
        groupGap?: number
        groupMinHeight?: number
        groupMaxHeight?: number
        /** Optional override for the grouped-mode max value, for sharing scales across maps. */
        groupMaxValue?: number
        /** Optional override for the grouped-mode max width-encoded value. */
        groupMaxWidthValue?: number
        strokeFill?: string
        strokeWidth?: number
        cornerRadius?: number
        otherColor?: string
        otherText?: string
        tooltipWidth?: number
        tooltipHeight?: number
        /** Show the category name (e.g. "Cities:") before each tooltip value. @default true */
        showCategoryLabels?: boolean
    }
    /** @deprecated Use barSettings.groupGap */
    barGroupGap?: number
    /** @deprecated Use barSettings.groupMinHeight */
    barGroupMinHeight?: number
    /** @deprecated Use barSettings.groupMaxHeight */
    barGroupMaxHeight?: number
    /** @deprecated Use barSettings.strokeFill */
    barStrokeFill?: string
    /** @deprecated Use barSettings.strokeWidth */
    barStrokeWidth?: number
    /** @deprecated Use barSettings.cornerRadius */
    barCornerRadius?: number
    /** @deprecated Use barSettings.otherColor */
    barOtherColor?: string
    /** @deprecated Use barSettings.otherText */
    barOtherText?: string
    /** @deprecated Use barSettings.tooltipWidth */
    barTooltipWidth?: number
    /** @deprecated Use barSettings.tooltipHeight */
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
