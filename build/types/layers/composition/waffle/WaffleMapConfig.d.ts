import type { MapConfig } from '../../../core/MapConfig'
import type { WaffleLegendConfig } from '../../../legend/composition/WaffleLegendConfig'

/**
 * Configuration for waffle chart composition maps.
 */
export interface WaffleMapConfig extends MapConfig {
    /** Consolidated waffle chart settings. */
    waffleSettings?: {
        minSize?: number
        maxSize?: number
        gridSize?: number
        cellPadding?: number
        strokeFill?: string
        strokeWidth?: number
        roundedCorners?: number
        tooltipSize?: number
        otherColor?: string
        otherText?: string
    }

    /** @deprecated Use waffleSettings.minSize */
    waffleMinSize?: number
    /** @deprecated Use waffleSettings.maxSize */
    waffleMaxSize?: number
    /** @deprecated Use waffleSettings.gridSize */
    waffleGridSize?: number
    /** @deprecated Use waffleSettings.cellPadding */
    waffleCellPadding?: number
    /** @deprecated Use waffleSettings.strokeFill */
    waffleStrokeFill?: string
    /** @deprecated Use waffleSettings.strokeWidth */
    waffleStrokeWidth?: number
    /** @deprecated Use waffleSettings.roundedCorners */
    waffleRoundedCorners?: number
    /** @deprecated Use waffleSettings.tooltipSize */
    waffleTooltipSize?: number
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** @deprecated Use waffleSettings.otherColor */
    waffleOtherColor?: string
    /** @deprecated Use waffleSettings.otherText */
    waffleOtherText?: string
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Dorling. */
    dorling?: boolean
    /** Waffle total code. */
    waffleTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: WaffleLegendConfig | false
}
