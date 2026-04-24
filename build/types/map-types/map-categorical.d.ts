import type { MapInstance } from '../core/MapInstance'

/**
 * Configuration for categorical map
 */
export interface CategoricalMapConfig {
    /** Category-to-color mapping */
    classToFillStyle?: Record<string, string>
    /** Fill style for regions with no data */
    noDataFillStyle?: string
}

/**
 * Creates a categorical (qualitative) map instance.
 * Used for displaying qualitative data with distinct categories.
 * @param config - Map configuration
 * @returns Map instance with categorical-specific methods
 */
export function map(config?: CategoricalMapConfig): MapInstance
