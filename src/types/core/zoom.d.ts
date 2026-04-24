import type { MapInstance } from './MapInstance'

/**
 * Defines the D3 zoom behavior for a map instance.
 * Handles both geographic zoom and grid cartogram zoom.
 * @param map - The map instance to add zoom behavior to
 */
export function defineMapZoom(map: MapInstance): void

/**
 * Defines geographic zoom behavior with pan locking and snap-back.
 * @param map - The map instance
 */
export function defineGeographicZoom(map: MapInstance): void

/**
 * Sets the map view to a specific position and zoom level.
 * @param map - The map instance
 * @param pos - Position object with x, y coordinates and z zoom level
 */
export function setMapView(map: MapInstance, pos: { x?: number; y?: number; z?: number }): void
