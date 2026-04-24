import type { MapInstance } from './MapInstance'

/**
 * Available location marker shapes
 */
export const LOCATION_SHAPES: {
    CIRCLE: 'circle'
    SQUARE: 'square'
    DIAMOND: 'diamond'
    TRIANGLE: 'triangle'
    STAR: 'star'
    CROSS: 'cross'
    PLUS: 'plus'
}

/**
 * Configuration for a single location marker
 */
export interface LocationConfig {
    /** Unique identifier for the location */
    id?: string
    /** Longitude coordinate */
    lon: number
    /** Latitude coordinate */
    lat: number
    /** Label text to display */
    label?: string
    /** Marker shape. @default 'circle' */
    shape?: 'circle' | 'square' | 'diamond' | 'triangle' | 'star' | 'cross' | 'plus'
    /** Marker size in pixels. @default 8 */
    size?: number
    /** Fill color. @default '#e74c3c' */
    color?: string
    /** Stroke color. @default '#fff' */
    stroke?: string
    /** Stroke width in pixels. @default 1 */
    strokeWidth?: number
    /** Custom CSS class */
    class?: string
    /** Custom data attached to the location */
    data?: any
}

/**
 * Updates and redraws location markers on the map.
 * @param map - The map instance
 */
export function updateLocations(map: MapInstance): void

/**
 * Attaches the locations API methods to a map instance.
 * Adds methods like addLocation(), removeLocation(), etc.
 * @param map - The map instance
 */
export function attachLocationsApi(map: MapInstance): void
