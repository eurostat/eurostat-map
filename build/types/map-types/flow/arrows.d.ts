/**
 * Ensure <defs> exists on the given SVG root/selection.
 * @param {d3.Selection} svgRoot
 */
export function ensureDefs(svgRoot: d3.Selection): any;
/**
 * Create (once) a trio of arrow markers: normal, hover, outline.
 * Returns their IDs. If they already exist, just returns the same IDs.
 *
 * @param {d3.Selection} svgRoot - your <svg> selection (or top container that can host <defs>)
 * @param {Object} opts
 * @param {string} [opts.cacheKey="default"] - so straight/sankey can keep separate sets if desired
 * @param {number} [opts.scale=1] - multiplies the marker geometry
 * @param {string} [opts.markerUnits="strokeWidth"] - "strokeWidth" to scale with line width, or "userSpaceOnUse"
 * @param {string} [opts.hoverColor="black"]
 * @param {string} [opts.outlineColor="#ffffff"]
 * @param {string} [opts.idBase] - stable base, otherwise generated
 * @param {boolean} [opts.useContextStroke=true] - if true, marker fill = "context-stroke"
 */
export function ensureArrowMarkers(svgRoot: d3.Selection, opts?: {
    cacheKey?: string;
    scale?: number;
    markerUnits?: string;
    hoverColor?: string;
    outlineColor?: string;
    idBase?: string;
    useContextStroke?: boolean;
}): any;
/**
 * Apply a marker-end to a selection (e.g., your line/path).
 * Pass ids from ensureArrowMarkers and one of "normal" | "hover" | "outline".
 */
export function applyArrow(selection: any, ids: any, variant?: string): any;
/**
 * Convenience helpers for hover swapping.
 */
export function setHoverArrow(selection: any, ids: any, on: any): any;
//# sourceMappingURL=arrows.d.ts.map