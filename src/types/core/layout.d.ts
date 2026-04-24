import type { MapInstance } from './MapInstance'

/**
 * Creates or retrieves the main SVG element for a map.
 * @param map - The map instance
 * @returns The D3 selection of the SVG element
 */
export function createMapSVG(map: MapInstance): any

/**
 * Wraps the map SVG in a container div to enable HTML overlays
 * (spinner, tooltip) to sit above the SVG.
 * @param svg - The D3 selection of the SVG element
 * @returns The wrapper element
 */
export function wrapMapSvg(svg: any): HTMLElement

/**
 * Recalculates and applies the layout for header, drawing area, and footer.
 * Adjusts clip paths and positioning based on content.
 * @param map - The map instance
 */
export function recalculateLayout(map: MapInstance): void
