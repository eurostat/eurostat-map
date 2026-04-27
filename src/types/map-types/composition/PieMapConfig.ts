import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for pie chart composition maps.
 */
export interface PieMapConfig {
    /** Minimum radius for pie charts in pixels */
    pieMinRadius?: number

    /** Maximum radius for pie charts in pixels */
    pieMaxRadius?: number

    /** Inner radius for donut-style charts (0 for full pie) */
    pieChartInnerRadius?: number

    /** Stroke color for pie segments */
    pieStrokeFill?: string

    /** Stroke width for pie segments */
    pieStrokeWidth?: number

    /** Radius for tooltip pie chart */
    tooltipPieRadius?: number

    /** Inner radius for tooltip pie chart */
    tooltipPieInnerRadius?: number

    /** Category colors mapping (categoryCode -> color) */
    catColors?: Record<string, string>

    /** Category labels mapping (categoryCode -> label) */
    catLabels?: Record<string, string>

    /** Color for "other" category */
    pieOtherColor?: string

    /** Label for "other" category */
    pieOtherText?: string

    /** Show only regions with complete data */
    showOnlyWhenComplete?: boolean

    /** Fill style for regions with no data */
    noDataFillStyle?: string

    /** Enable Dorling cartogram layout */
    dorling?: boolean

    /** Animate Dorling layout transitions */
    animateDorling?: boolean

    // Internal (can be set directly but typically set via statPie())
    /** Total code for calculating "other" category */
    pieTotalCode?: string

    /** Array of statistical dataset codes */
    statCodes?: string[]
}
