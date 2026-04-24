import type { MapInstance } from '../MapInstance'

/**
 * Adds centroid features to the map for proportional symbol rendering.
 * Centroids are either loaded from pre-computed data or calculated from geometries.
 * @param map - The map instance
 */
export function addCentroidsToMap(map: MapInstance): void

/**
 * Returns the D3 selection for the proportional symbols (centroids) container.
 * Uses a map-specific ID to avoid collisions with insets.
 * @param map - The map instance
 * @returns D3 selection of the centroids group
 */
export function getCentroidsGroup(map: MapInstance): any

/**
 * Refreshes the centroids display by filtering to only show regions with statistical data.
 * Removes centroids without data and adds centroids for regions that just received data.
 * @param map - The map instance
 * @returns The map instance for chaining
 */
export function refreshCentroids(map: MapInstance): MapInstance

/**
 * Checks if a region has statistical data attached.
 * Used to filter which centroids should be displayed.
 * @param id - The region ID
 * @param map - The map instance
 * @returns True if the region has statistical data
 */
export function centroidHasStatData(id: string, map: MapInstance): boolean
