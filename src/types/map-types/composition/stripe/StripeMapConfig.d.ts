import type { MapConfig } from '../../../core/MapConfig'
import type { StripeCompositionLegendConfig } from '../../../legend/composition/StripeCompositionLegendConfig'

/**
 * Configuration for stripe composition maps.
 */
export interface StripeMapConfig extends MapConfig {
    stripeWidth?: number
    stripeOrientation?: number
    catColors?: Record<string, string>
    catLabels?: Record<string, string>
    showOnlyWhenComplete?: boolean
    noDataFillStyle?: string
    pieChartRadius?: number
    pieChartInnerRadius?: number
    statCodes?: string[]
    legend?: StripeCompositionLegendConfig | false
}
