import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for bar chart composition maps.
 */
export interface BarMapConfig {
    /** Layout mode: 'stacked' (horizontal proportional) or 'grouped' (vertical absolute) */
    barType?: 'stacked' | 'grouped'

    /** Category colors mapping (categoryCode -> color) */
    catColors?: Record<string, string>

    /** Category labels mapping (categoryCode -> label) */
    catLabels?: Record<string, string>

    /** Show only regions with complete data */
    showOnlyWhenComplete?: boolean

    /** Fill style for regions with no data */
    noDataFillStyle?: string

    // Stacked mode sizing
    /** Minimum total bar width in pixels (stacked mode) */
    barMinWidth?: number

    /** Maximum total bar width in pixels (stacked mode) */
    barMaxWidth?: number

    /** Fixed bar height in pixels (stacked mode) */
    barHeight?: number

    // Grouped mode sizing
    /** Width of each individual bar in pixels (grouped mode) */
    barGroupWidth?: number

    /** Gap between bars in pixels (grouped mode) */
    barGroupGap?: number

    /** Minimum bar height in pixels (grouped mode) */
    barGroupMinHeight?: number

    /** Maximum bar height in pixels (grouped mode) */
    barGroupMaxHeight?: number

    // Visual style
    /** Stroke color for bars */
    barStrokeFill?: string

    /** Stroke width for bars */
    barStrokeWidth?: number

    /** Corner radius for bars */
    barCornerRadius?: number

    /** Color for "other" category */
    barOtherColor?: string

    /** Label for "other" category */
    barOtherText?: string

    // Tooltip
    /** Tooltip chart width */
    barTooltipWidth?: number

    /** Tooltip chart height */
    barTooltipHeight?: number

    // Dorling
    /** Enable Dorling cartogram layout */
    dorling?: boolean

    /** Animate Dorling layout transitions */
    animateDorling?: boolean

    // Internal (can be set directly but typically set via statBar())
    /** Total code for calculating "other" category */
    barTotalCode?: string

    /** Array of statistical dataset codes */
    statCodes?: string[]
}
