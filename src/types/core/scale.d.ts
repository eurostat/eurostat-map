/**
 * Creates a square root scale for proportional symbol sizing.
 * Good for area-based symbols like circles where visual size should be
 * proportional to the square root of the data value.
 * @param rawData - Array of numeric values to scale
 * @param maxSize - Maximum output size in pixels. @default 20
 * @param minSize - Minimum output size in pixels. @default 0
 * @returns D3 scale function
 */
export function createSqrtScale(rawData?: number[], maxSize?: number, minSize?: number): any

/**
 * Creates a radial scale for circular symbol sizing.
 * Maps data values directly to radii.
 * @param rawData - Array of numeric values to scale
 * @param maxSize - Maximum output radius in pixels. @default 20
 * @param minSize - Minimum output radius in pixels. @default 0
 * @returns D3 scale function
 */
export function createRadialScale(rawData?: number[], maxSize?: number, minSize?: number): any

/**
 * Creates a linear scale for proportional symbol sizing.
 * Maps data values linearly to visual sizes.
 * @param rawData - Array of numeric values to scale
 * @param maxSize - Maximum output size in pixels. @default 20
 * @param minSize - Minimum output size in pixels. @default 0
 * @returns D3 scale function
 */
export function createLinearScale(rawData?: number[], maxSize?: number, minSize?: number): any
