/**
 * Tricolore.js - A library for visualizing ternary compositions
 * Ported from R package: https://github.com/jschoeley/tricolore/
 */
export * from './types';
export { CompositionUtils } from './core/compositionUtils';
export { TernaryGeometry } from './core/ternaryGeometry';
export { ColorMapping } from './core/colorMapping';
import { TricoloreViz } from './viz/tricoloreViz';
export { TricoloreViz };
import type { TernaryPoint, TricoloreOptions, SextantOptions, TricoloreResult, SextantResult } from './types';
/**
 * Calculate tricolore colors for a set of ternary compositions
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of hex color codes
 */
export declare function tricolore(data: TernaryPoint[], options?: TricoloreOptions): (string | null)[];
/**
 * Calculate tricolore colors with full result information
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of detailed color results
 */
export declare function tricoloreDetailed(data: TernaryPoint[], options?: TricoloreOptions): TricoloreResult[];
/**
 * Calculate sextant colors for a set of ternary compositions
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of hex color codes
 */
export declare function tricoloreSextant(data: TernaryPoint[], options?: SextantOptions): (string | null)[];
/**
 * Calculate sextant colors with full result information
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of detailed sextant results
 */
export declare function tricoloreSextantDetailed(data: TernaryPoint[], options?: SextantOptions): SextantResult[];
