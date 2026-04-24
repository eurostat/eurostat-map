import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for proportional symbol map
 */
export interface ProportionalSymbolMapConfig {
    /** Proportional symbol type: 'circle', 'square', 'spike', etc. */
    symbolType?: string
    /** Size attribute: 'radius', 'area', etc. */
    sizeAttribute?: string
    /** Maximum symbol size in pixels */
    symbolMaxSize?: number
    /** Minimum symbol size in pixels */
    symbolMinSize?: number
    /** Size dataset code */
    sizeDatasetCode?: string
    /** Symbol fill color */
    symbolFillStyle?: string
    /** Symbol fill opacity */
    symbolFillOpacity?: number
    /** Symbol stroke color */
    symbolStrokeStyle?: string
    /** Symbol stroke width */
    symbolStrokeWidth?: number
    /** Center symbol on region centroid */
    centerOnCentroid?: boolean
}

/**
 * Creates a proportional symbol map instance.
 * Displays symbols (circles, squares, etc.) sized by statistical values.
 * @param config - Map configuration
 * @returns Map instance with proportional symbol methods
 */
export function map(config?: ProportionalSymbolMapConfig): MapInstance
