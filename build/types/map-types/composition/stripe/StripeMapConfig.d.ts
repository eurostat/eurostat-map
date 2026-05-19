import type { MapConfig } from '../../../core/MapConfig'

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
}
