/**
 * Type definitions for the tricolore library
 */

/**
 * Represents a ternary point with three components that sum to 1
 * [p1, p2, p3] where p1 + p2 + p3 = 1
 */
export type TernaryPoint = [number, number, number];

/**
 * RGB color in hex format (e.g. "#FF0000")
 */
export type RGBColor = string;

/**
 * Options for the tricolore color mapping
 */
export interface TricoloreOptions {
  /** Center of the ternary color scale (default: [1/3, 1/3, 1/3]) */
  center?: TernaryPoint;

  /** Number of breaks in the discrete color scale (default: 4) */
  breaks?: number;

  /** Whether to use discrete color mapping (default: false) */
  discrete?: boolean;

  /** Primary hue for the color scale in degrees [0-360] */
  hue?: number;

  /** Maximum chroma for the colors [0-200] */
  chroma?: number;

  /** Lightness of the colors [0-100] */
  lightness?: number;

  /** Contrast of the color scale [0-1] */
  contrast?: number;

  /** Spread of the color scale around center (>0) */
  spread?: number;
}

/**
 * Options for the sextant color mapping
 */
export interface SextantOptions {
  /** Center of the ternary color scale (default: [1/3, 1/3, 1/3]) */
  center?: TernaryPoint;

  /** Array of 6 RGB color strings for the sextants */
  values?: RGBColor[];
}

export interface DataPointHandlers {
    mouseover?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
    mousemove?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
    mouseout?: (e: MouseEvent, d: { point: TernaryPoint; index: number }) => void
}

/**
 * Visualization options for ternary plots
 */
export interface VisualizationOptions extends TricoloreOptions {
  /** Labels for the three axes */
  labels?: [string, string, string];

  /** Show center point on the visualization */
  showCenter?: boolean;

  /** Show data points on the visualization */
  showData?: boolean;

  /** Show grid lines on the ternary plot */
  showLines?: boolean;

  /** The position of the axis labels: 'corner' | 'edge' (default: 'corner') */
  labelPosition?: 'corner' | 'edge';

  dataPointHandlers?: DataPointHandlers

  legendTriangleHandlers?: {
    mouseover?: (e: MouseEvent, color: string) => void
    mouseout?: (e: MouseEvent) => void
}
}

/**
 * Result of tricolore color mapping
 */
export interface TricoloreResult {
  p1: number;
  p2: number;
  p3: number;
  h: number | null;
  c: number | null;
  l: number | null;
  rgb: RGBColor | null;
}

/**
 * Result of sextant color mapping
 */
export interface SextantResult {
  p1: number;
  p2: number;
  p3: number;
  sextant: number | null;
  rgb: RGBColor | null;
}

/**
 * Centroid of a sub-triangle in a ternary mesh
 */
export interface TernaryCentroid {
  id: number;
  p1: number;
  p2: number;
  p3: number;
}

/**
 * Vertex of a sub-triangle in a ternary mesh
 */
export interface TernaryVertex {
  id: number;
  vertex: number;
  p1: number;
  p2: number;
  p3: number;
}
