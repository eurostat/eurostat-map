import type { MapInstance } from '../../core/MapInstance'

/**
 * Base configuration for composition maps (pie, bar, coxcomb, waffle, etc.)
 */
export interface CompositionMapConfig {
    /** Array of statistical dataset codes */
    statCodes?: string[]
    /** Array of colors for categories */
    colors?: string[]
    /** Size dataset code for proportional sizing */
    sizeDatasetCode?: string
    /** Maximum size in pixels */
    maxSize?: number
    /** Minimum size in pixels */
    minSize?: number
}

/**
 * Creates a composition map base instance.
 * @param config - Map configuration
 * @param mapType - Type of composition map
 * @returns Map instance with composition-specific methods
 */
export function createCompositionMap(config?: CompositionMapConfig, mapType?: string): MapInstance
