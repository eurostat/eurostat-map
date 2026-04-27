import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for stripe composition maps.
 */
export interface StripeMapConfig {
    /** Width of stripe pattern in pixels */
    stripeWidth?: number

    /** Orientation angle of stripes in degrees (0 = vertical) */
    stripeOrientation?: number

    /** Category colors mapping (categoryCode -> color) */
    catColors?: Record<string, string>

    /** Category labels mapping (categoryCode -> label) */
    catLabels?: Record<string, string>

    /** Show only regions with complete data */
    showOnlyWhenComplete?: boolean

    /** Fill style for regions with no data */
    noDataFillStyle?: string

    /** Radius for tooltip pie chart */
    pieChartRadius?: number

    /** Inner radius for tooltip pie chart */
    pieChartInnerRadius?: number

    /** Array of statistical dataset codes */
    statCodes?: string[]
}
