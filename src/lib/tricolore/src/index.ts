/**
 * Tricolore.js - A library for visualizing ternary compositions
 * Ported from R package: https://github.com/jschoeley/tricolore/
 */

// Export types
export * from './types';

// Export core functionality
export { CompositionUtils } from './core/compositionUtils';
export { TernaryGeometry } from './core/ternaryGeometry';
export { ColorMapping } from './core/colorMapping';

// Export visualization (only if d3 is available)
import { TricoloreViz } from './viz/tricoloreViz';
export { TricoloreViz };

// Main tricolore functions
import { ColorMapping } from './core/colorMapping';
import type {
  TernaryPoint,
  TricoloreOptions,
  SextantOptions,
  TricoloreResult,
  SextantResult,
} from './types';

/**
 * Calculate tricolore colors for a set of ternary compositions
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of hex color codes
 */
export function tricolore(data: TernaryPoint[], options: TricoloreOptions = {}): (string | null)[] {
  const {
    center = [1 / 3, 1 / 3, 1 / 3],
    breaks = 4,
    hue = 80,
    chroma = 140,
    lightness = 80,
    contrast = 0.4,
    spread = 1,
  } = options;

  return ColorMapping.colorMapTricolore(
    data,
    center,
    breaks,
    hue,
    chroma,
    lightness,
    contrast,
    spread
  ).map((result) => result.rgb);
}

/**
 * Calculate tricolore colors with full result information
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of detailed color results
 */
export function tricoloreDetailed(
  data: TernaryPoint[],
  options: TricoloreOptions = {}
): TricoloreResult[] {
  const {
    center = [1 / 3, 1 / 3, 1 / 3],
    breaks = 4,
    hue = 80,
    chroma = 140,
    lightness = 80,
    contrast = 0.4,
    spread = 1,
  } = options;

  return ColorMapping.colorMapTricolore(
    data,
    center,
    breaks,
    hue,
    chroma,
    lightness,
    contrast,
    spread
  );
}

/**
 * Calculate sextant colors for a set of ternary compositions
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of hex color codes
 */
export function tricoloreSextant(
  data: TernaryPoint[],
  options: SextantOptions = {}
): (string | null)[] {
  const {
    center = [1 / 3, 1 / 3, 1 / 3],
    values = ['#FFFF00', '#B3DCC3', '#01A0C6', '#B8B3D8', '#F11D8C', '#FFB3B3'],
  } = options;

  return ColorMapping.colorMapSextant(data, center, values).map((result) => result.rgb);
}

/**
 * Calculate sextant colors with full result information
 *
 * @param data - Array of ternary compositions
 * @param options - Configuration options
 * @returns Array of detailed sextant results
 */
export function tricoloreSextantDetailed(
  data: TernaryPoint[],
  options: SextantOptions = {}
): SextantResult[] {
  const {
    center = [1 / 3, 1 / 3, 1 / 3],
    values = ['#FFFF00', '#B3DCC3', '#01A0C6', '#B8B3D8', '#F11D8C', '#FFB3B3'],
  } = options;

  return ColorMapping.colorMapSextant(data, center, values);
}
