import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for coxcomb (polar area) chart maps.
 */
export interface CoxcombMapConfig {
    /** Minimum radius for coxcomb charts in pixels */
    coxcombMinRadius?: number

    /** Maximum radius for coxcomb charts in pixels */
    coxcombMaxRadius?: number

    /** Stroke color for chart segments */
    coxcombStrokeFill?: string

    /** Stroke width for chart segments */
    coxcombStrokeWidth?: number

    /** Show reference rings around charts */
    coxcombRings?: boolean

    /** Position offsets for chart placement */
    coxcombOffsets?: { x: number; y: number }

    /** Color for hover state */
    hoverColor?: string

    /** Category colors mapping (categoryCode -> color) */
    catColors?: Record<string, string>

    /** Category labels mapping (categoryCode -> label) */
    catLabels?: Record<string, string>

    /** Fill style for regions with no data */
    noDataFillStyle?: string

    /** Internal size classifier (typically set automatically) */
    classifierSize?: any
}
