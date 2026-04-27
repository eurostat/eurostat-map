import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for waffle chart composition maps.
 */
export interface WaffleMapConfig {
    /** Minimum size for waffle charts in pixels */
    waffleMinSize?: number

    /** Maximum size for waffle charts in pixels */
    waffleMaxSize?: number

    /** Grid size (number of cells per side, e.g., 10 = 10x10 grid) */
    waffleGridSize?: number

    /** Padding between cells in pixels */
    waffleCellPadding?: number

    /** Stroke color for cells */
    waffleStrokeFill?: string

    /** Stroke width for cells */
    waffleStrokeWidth?: number

    /** Border radius for rounded corners on cells */
    waffleRoundedCorners?: number

    /** Size of waffle chart in tooltip */
    waffleTooltipSize?: number

    /** Category colors mapping (categoryCode -> color) */
    catColors?: Record<string, string>

    /** Category labels mapping (categoryCode -> label) */
    catLabels?: Record<string, string>

    /** Color for "other" category */
    waffleOtherColor?: string

    /** Label for "other" category */
    waffleOtherText?: string

    /** Show only regions with complete data */
    showOnlyWhenComplete?: boolean

    /** Fill style for regions with no data */
    noDataFillStyle?: string

    /** Enable Dorling cartogram layout */
    dorling?: boolean

    /** Animate Dorling layout transitions */
    animateDorling?: boolean

    // Internal (can be set directly but typically set via statWaffle())
    /** Total code for calculating "other" category */
    waffleTotalCode?: string

    /** Array of statistical dataset codes */
    statCodes?: string[]
}
