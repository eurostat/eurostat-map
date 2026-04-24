import type { MapInstance } from '../MapInstance'

/**
 * Initializes proj4 with common projection definitions.
 * Loads EPSG definitions for dynamic minimap projections and placename labels.
 */
export function initProj4(): void

/**
 * Projects geographic coordinates (lon, lat) to map coordinates (x, y)
 * based on the map's projection.
 * @param map - The map instance
 * @param lon - Longitude in degrees
 * @param lat - Latitude in degrees
 * @returns Projected coordinates [x, y] or null if projection fails
 */
export function projectToMap(map: MapInstance, lon: number, lat: number): [number, number] | null

/**
 * Inverse projects map coordinates (x, y) to geographic coordinates (lon, lat).
 * @param map - The map instance
 * @param x - X coordinate in the map's projection
 * @param y - Y coordinate in the map's projection
 * @returns Geographic coordinates [lon, lat] or null if projection fails
 */
export function projectFromMap(map: MapInstance, x: number, y: number): [number, number] | null
