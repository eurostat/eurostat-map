import type { MapInstance } from './MapInstance'

/**
 * Builds inset maps based on the configuration in the map instance.
 * Creates sub-maps for specific geographic regions (e.g., islands, overseas territories).
 * @param map - The map instance
 * @param withCenterPoints - Whether to include region centroids
 * @param mapType - The type of map (e.g., 'choropleth', 'proportional-symbol')
 */
export function buildInsets(map: MapInstance, withCenterPoints: boolean, mapType: string): void

/**
 * Removes all existing insets from a map instance.
 * @param map - The map instance
 */
export function removeInsets(map: MapInstance): void
