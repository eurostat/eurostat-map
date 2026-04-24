import type { MapInstance } from '../MapInstance'

/**
 * Defines the D3 projection for the map based on geographic context.
 * Sets up Robinson projection for world maps or identity projection for regional maps.
 * @param map - The map instance
 */
export function defineProjection(map: MapInstance): void

/**
 * Defines the D3 path function using the map's projection.
 * Used to render geographic features as SVG paths.
 * @param map - The map instance
 */
export function definePathFunction(map: MapInstance): void

/**
 * Sets the default position (center coordinates and zoom level) for the map
 * based on the geographic area and projection.
 * @param map - The map instance
 */
export function defineDefaultPosition(map: MapInstance): void

/**
 * Gets the default zoom level (z value) for a given map configuration.
 * @param map - The map instance
 * @returns The default z value (pixel size in map units)
 */
export function getDefaultZ(map: MapInstance): number
