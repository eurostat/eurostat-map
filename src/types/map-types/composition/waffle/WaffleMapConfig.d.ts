import type { MapConfig } from '../../../core/MapConfig'
import type { WaffleLegendConfig } from '../../../legend/composition/WaffleLegendConfig'

/**
 * Configuration for waffle chart composition maps.
 */
export interface WaffleMapConfig extends MapConfig {
    /** Waffle min size. */
    waffleMinSize?: number
    /** Waffle max size. */
    waffleMaxSize?: number
    /** Waffle grid size. */
    waffleGridSize?: number
    /** Waffle cell padding. */
    waffleCellPadding?: number
    /** Waffle stroke fill. */
    waffleStrokeFill?: string
    /** Waffle stroke width. */
    waffleStrokeWidth?: number
    /** Waffle rounded corners. */
    waffleRoundedCorners?: number
    /** Waffle tooltip size. */
    waffleTooltipSize?: number
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Waffle other color. */
    waffleOtherColor?: string
    /** Waffle other text. */
    waffleOtherText?: string
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Dorling. */
    dorling?: boolean
    /** Animate dorling. */
    animateDorling?: boolean
    /** Waffle total code. */
    waffleTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: WaffleLegendConfig | false
}
