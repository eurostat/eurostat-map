import type { MapConfig } from '../../../core/MapConfig'
import type { StripeCompositionLegendConfig } from '../../../legend/composition/StripeCompositionLegendConfig'

/**
 * Configuration for stripe composition maps.
 */
export interface StripeMapConfig extends MapConfig {
    /** Stripe width. */
    stripeWidth?: number
    /** Stripe orientation. */
    stripeOrientation?: number
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** Stripe other color. */
    stripeOtherColor?: string
    /** Stripe other text. */
    stripeOtherText?: string
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    /** No data fill style. */
    noDataFillStyle?: string
    /** Pie chart radius. */
    pieChartRadius?: number
    /** Pie chart inner radius. */
    pieChartInnerRadius?: number
    /** Stripe total code. */
    stripeTotalCode?: string
    /** Stat codes. */
    statCodes?: string[]
    /** Legend. */
    legend?: StripeCompositionLegendConfig | false
}
