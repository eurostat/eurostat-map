export function ensureGroup(container: any, className: any): any;
export function updateCSSRule(selector: any, property: any, value: any): void;
/**
 * Copy computed styles (a curated property list) into inline styles for all elements
 * so the serialized SVG renders the same as in-browser.
 *
 * Usage: call this right before serialize(svg) or rasterize(svg)
 */
export function applyComputedStylesToSVG(svg: any): void;
export function ensureSvgSize(svg: any): void;
/**
 * Generates a unique DOM ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateUniqueId(prefix: string): string;
export function getDownloadURL(svgNode: any): string;
export function serialize(svg: any): Blob;
export function rasterize(svg: any): Promise<any>;
/**
 * Get a URL parameter by name.
 *
 * @param {string} name
 * @returns {string | null}
 */
export function getParameterByName(name: string): string | null;
export function averageBlendHex(colors: any): string;
/**
 * interpolateIntensity
 *
 * Adjusts the brightness of a base color based on a class index or relative position.
 * Typically used to differentiate quantile levels (e.g., low, medium, high) by making
 * lower classes appear lighter and higher classes closer to the base hue.
 *
 * @param {string} baseColor - The original color to adjust (hex or CSS string).
 * @param {number} idx - The class index (0 for lowest, 1 for mid, 2 for highest in 3-class scales).
 * @returns {string} - The adjusted color as a hex string.
 */
export function interpolateIntensity(baseColor: string, idx: number): string;
export function getRegionById(map: any, id: any): any;
export function getFontSizeFromClass(className: any): number;
export function getCSSPropertyFromClass(className: any, propertyName: any): string;
export function applyInlineStylesFromCSS(svgElement: any): void;
export function getBBOXAsGeoJSON(bb: any): {
    type: string;
    geometry: {
        type: string;
        coordinates: any[][];
    };
};
export function jsonstatToIndex(jsData: any): {};
export function csvToIndex(csvData: any, geoCol: any, valueCol: any): {};
export function spaceAsThousandSeparator(number: number): string;
export const getEstatRestDataURLBase: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";
export function getEstatDataURL(datasetCode: string, filters?: object | undefined, lang?: number | undefined, format?: number | undefined): string;
export function getURLParameterByName(name: string): string;
export function checkIfDiverging(map: any): boolean;
export function centerDivergingColorFunction(colorFunc: Function, domain: [number, number], pointOfDivergence?: number, transform?: Function): Function;
export namespace flags {
    let b: string;
    let c: string;
    let d: string;
    let e: string;
    let f: string;
    let n: string;
    let p: string;
    let r: string;
    let s: string;
    let u: string;
    let z: string;
}
export function executeForAllInsets(insets: any, mainSvgId: any, functionToExecute: any, parameter?: any, parameter2?: any): void;
export function upperCaseFirstLetter(string: any): string;
export function lowerCaseAllWordsExceptFirstLetters(string: any): any;
export function hexToRgb(hex: any): number[];
export function multiplyBlendMultipleHex(colors: any): string;
export function convertRectanglesToPaths(x: any, y: any, width: any, height: any): string;
export function getTextColorForBackground(backgroundColor: any): "black" | "white";
export function getRegionsSelector(map: any): "#em-user-regions path" | "#em-grid-container .em-grid-cell" | "#em-worldrg path" | "#em-mixed-nutsrg path:not(#em-cntrg-RS):not(#em-cntrg-EL), #em-cntrg path:not(#em-cntrg-RS):not(#em-cntrg-EL)" | "#em-mixed-nutsrg path, #em-cntrg path" | "#em-nutsrg path:not(#em-cntrg-RS):not(#em-cntrg-EL), #em-cntrg path:not(#em-cntrg-RS):not(#em-cntrg-EL)" | "#em-nutsrg path, #em-cntrg path";
export function getLegendRegionsSelector(map: any): "#em-user-regions" | "#em-grid-container" | "#em-worldrg" | "#em-mixed-nutsrg, #em-cntrg" | "#em-nutsrg, #em-cntrg";
export function getApproxCurrentGeoBbox(map: any): any[];
export const compactFormatter: Intl.NumberFormat;
export const longFormatter: Intl.NumberFormat;
//# sourceMappingURL=utils.d.ts.map