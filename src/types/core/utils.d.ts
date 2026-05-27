import type { MapInstance } from './MapInstance'

/**
 * Ensures a <g> element with the specified class exists within the container.
 * If it exists, clears its contents; if not, creates it.
 */
export function ensureGroup(container: any, className: string): any

/**
 * Updates or creates a CSS rule for a given selector.
 */
export function updateCSSRule(selector: string, property: string, value: string): void

/**
 * Gets the computed font size from a CSS class name.
 */
export function getFontSizeFromClass(className: string): number

/**
 * Gets a computed CSS property value from a CSS class name.
 */
export function getCSSPropertyFromClass(className: string, propertyName: string): string

/**
 * Applies inline styles from computed CSS to an SVG element and its descendants.
 * Useful for exporting SVGs with CSS styles.
 */
export function applyInlineStylesFromCSS(svgElement: SVGElement): void

/**
 * Applies computed styles to an SVG element for export.
 */
export function applyComputedStylesToSVG(svg: SVGElement): void

/**
 * Ensures an SVG element has explicit width and height attributes.
 */
export function ensureSvgSize(svg: SVGSVGElement): void

/**
 * Converts a bounding box array to a GeoJSON polygon.
 */
export function getBBOXAsGeoJSON(bb: [number, number, number, number]): any

/**
 * Converts a JSON-stat object to an index keyed by geographic codes.
 */
export function jsonstatToIndex(jsData: any): Record<string, any>

/**
 * Converts CSV data to an index keyed by geographic codes.
 */
export function csvToIndex(csvData: string, geoCol: string, valueCol: string): Record<string, number>

/**
 * Formats a number with spaces as thousand separators.
 */
export function spaceAsThousandSeparator(number: number): string

/**
 * Base URL for Eurostat REST API.
 */
export const getEstatRestDataURLBase: string

/**
 * Constructs a URL for fetching Eurostat data.
 */
export function getEstatDataURL(datasetCode: string, filters: any, lang?: string, format?: string): string

/**
 * Gets a URL parameter by name.
 */
export function getURLParameterByName(name: string): string | null

/**
 * Gets a URL parameter by name (alias).
 */
export function getParameterByName(name: string): string | null

/**
 * Checks if a map has a diverging color scheme.
 */
export function checkIfDiverging(map: MapInstance): boolean

/**
 * Centers a diverging color function around a point of divergence.
 */
export function centerDivergingColorFunction(colorFunc: any, domain: number[], pointOfDivergence?: number, transform?: (d: number) => number): any

/**
 * Generates a unique ID with an optional prefix.
 */
export function generateUniqueId(prefix: string): string

/**
 * Eurostat flag codes and descriptions.
 */
export const flags: Record<string, string>

/**
 * Executes a function for all insets recursively.
 */
export function executeForAllInsets(
    /** Insets. */
    insets: any,
    /** Main svg id. */
    mainSvgId: string,
    functionToExecute: (inset: MapInstance, ...args: any[]) => void,
    /** Parameter. */
    parameter?: any,
    /** Parameter2. */
    parameter2?: any
): void

/**
 * Converts first letter of a string to uppercase.
 */
export function upperCaseFirstLetter(string: string): string

/**
 * Converts a string to lowercase except for first letters of words.
 */
export function lowerCaseAllWordsExceptFirstLetters(string: string): string

/**
 * Creates a download URL for an SVG element.
 */
export function getDownloadURL(svgNode: SVGElement): string

/**
 * Serializes an SVG element to a string.
 */
export function serialize(svg: SVGElement): string

/**
 * Rasterizes an SVG element to a canvas blob.
 */
export function rasterize(svg: SVGElement): Promise<Blob>

/**
 * Converts hex color to RGB object.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number }

/**
 * Blends multiple colors using multiply blending mode.
 */
export function multiplyBlendMultipleHex(colors: string[]): string

/**
 * Blends colors using average blending.
 */
export function averageBlendHex(colors: string[]): string

/**
 * Interpolates color intensity.
 */
export function interpolateIntensity(baseColor: string, idx: number): string

/**
 * Converts rectangle coordinates to an SVG path string.
 */
export function convertRectanglesToPaths(x: number, y: number, width: number, height: number): string

/**
 * Determines appropriate text color (black/white) for a given background color.
 */
export function getTextColorForBackground(backgroundColor: string): string

/**
 * Gets the CSS selector for data-driven regions on a map.
 */
export function getRegionsSelector(map: MapInstance): string

/**
 * Gets the CSS selector for legend region highlighting.
 */
export function getLegendRegionsSelector(map: MapInstance): string

/**
 * Gets an approximate geographic bounding box for the current map view.
 */
export function getApproxCurrentGeoBbox(map: MapInstance): number[]

/**
 * Gets a region element by ID from the map.
 */
export function getRegionById(map: MapInstance, id: string): any

/**
 * Compact number formatter (e.g., 1000 → "1K").
 */
export const compactFormatter: Intl.NumberFormat

/**
 * Long number formatter.
 */
export const longFormatter: Intl.NumberFormat
