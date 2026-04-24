import type { MapInstance } from '../../core/MapInstance'
import type { CompositionMapConfig } from './composition-map'

/**
 * Creates a pie chart map instance.
 * Displays pie charts at region centroids showing composition data.
 * @param config - Map configuration
 * @returns Map instance with pie chart methods
 */
export function map(config?: CompositionMapConfig): MapInstance
