import type { MapInstance } from './MapInstance'

/**
 * Available location marker shapes
 */
export const LOCATION_SHAPES: {
    CIRCLE: 'circle'
    SQUARE: 'square'
    PIN: 'pin'
    DIAMOND: 'diamond'
    STAR: 'star'
    CROSS: 'cross'
}

/**
 * Available location marker shapes
 */
export type LocationShape = 'circle' | 'square' | 'pin' | 'diamond' | 'cross' | 'star'

/**
 * Text label style for a location marker
 */
export interface LocationLabelStyle {
    /** CSS font size. @default '12px' */
    fontSize?: string
    /** CSS font family. @default 'inherit' */
    fontFamily?: string
    /** Text fill color. @default '#222' */
    fill?: string
    /** Text opacity. @default 1 */
    opacity?: number
    /** Text stroke color. @default '#fff' */
    stroke?: string
    /** Text stroke width in pixels. @default 3 */
    strokeWidth?: number
    /** SVG paint-order value. @default 'stroke' */
    paintOrder?: string
    /** SVG text-anchor value. @default 'start' */
    textAnchor?: 'start' | 'middle' | 'end'
}

/**
 * Configuration for a single location marker
 */
export interface LocationConfig {
    /** Unique identifier for the location */
    id?: string
    /** Geographic X coordinate (longitude / easting) */
    x: number
    /** Geographic Y coordinate (latitude / northing) */
    y: number
    /** Label text to display */
    label?: string
    /** Marker shape. @default 'circle' */
    shape?: LocationShape
    /** Marker radius in pixels. @default 6 */
    radius?: number
    /** Fill color. @default '#e84040' */
    fill?: string
    /** Fill opacity. @default 1 */
    opacity?: number
    /** Stroke color. @default '#fff' */
    stroke?: string
    /** Stroke width in pixels. @default 1.5 */
    strokeWidth?: number
    /** Label offset from projected point in pixels. @default [7, -4] */
    labelOffset?: [number, number]
    /** Label text style overrides */
    labelStyle?: LocationLabelStyle
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
