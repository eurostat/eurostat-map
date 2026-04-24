import type { MapInstance } from './MapInstance'

/**
 * Configuration for the minimap globe feature.
 */
export interface MinimapConfig {
    /** Size of the minimap in pixels. @default 150 */
    size?: number
    /** Debounce delay in milliseconds for updating the minimap during zoom/pan. @default 3 */
    debounce?: number
    /** Position [x, y] in pixels. If not specified, positioned in top-left corner */
    position?: [number, number]
}

/**
 * Appends a minimap (globe visualization) to the map.
 * Shows the current map viewport on a world globe.
 * @param map - The map instance
 */
export function appendMinimap(map: MapInstance): void
