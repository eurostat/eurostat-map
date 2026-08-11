import type { MapInstance } from './MapInstance'

/**
 * Configuration for the minimap globe feature.
 */
export interface MinimapConfig {
    /** Diameter of the minimap in pixels. @default 160 (defaults to 150 if unset before first draw) */
    size?: number
    /** Debounce delay in milliseconds for updating the minimap during zoom/pan. @default 3 */
    debounce?: number
    /** X position of the minimap center in pixels. @default 80 */
    x?: number
    /** Y position of the minimap center in pixels. @default 80 */
    y?: number
    /** Orthographic projection scale (globe zoom level) in pixels. @default 160 */
    z?: number
    /** Color of the outer ring and highlighted region(s). @default '#929292ff' */
    color?: string
    /** Region/country IDs to highlight on the globe (e.g. the main map's current country focus). */
    highlightIds?: string[]
}

/**
 * Appends a minimap (globe visualization) to the map.
 * Shows the current map viewport on a world globe.
 * @param map - The map instance
 */
export function appendMinimap(map: MapInstance): void
