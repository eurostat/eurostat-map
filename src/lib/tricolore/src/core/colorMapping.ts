import { TernaryPoint, TricoloreResult, SextantResult, RGBColor } from '../types';
import { CompositionUtils } from './compositionUtils';
import { TernaryGeometry } from './ternaryGeometry';

/**
 * Color mapping functions
 */
export class ColorMapping {
  /**
   * Map ternary compositions to colors using balance scheme
   *
   * @param P - Array of ternary compositions
   * @param center - Center of color scale
   * @param breaks - Number of breaks for discretization
   *  (use Infinity or null or a value > 100 for continuous scale)
   * @param hue - Primary hue in degrees [0-360]
   * @param chroma - Maximum chroma [0-200]
   * @param lightness - Lightness [0-100]
   * @param contrast - Contrast [0-1]
   * @param spread - Spread around center (>0)
   * @returns Array of color results
   */
  static colorMapTricolore(
    P: TernaryPoint[],
    center: TernaryPoint = [1 / 3, 1 / 3, 1 / 3],
    breaks: number = 4,
    hue: number = 80,
    chroma: number = 140,
    lightness: number = 80,
    contrast: number = 0.4,
    spread: number = 1
  ): TricoloreResult[] {
    // Copy input and ensure compositions are closed
    const P_notrans = CompositionUtils.close([...P]);

    // Close compositions (i.e. ensure they sum to 1)
    let closed = CompositionUtils.close([...P]);

    // Discretize if breaks < 100 and breaks is finite
    // (i.e. use breaks = Infinity for continuous scale)
    if (Number.isFinite(breaks) && breaks < 100) {
      const centroids = TernaryGeometry.ternaryMeshCentroids(breaks).map(
        (c) => [c.p1, c.p2, c.p3] as TernaryPoint
      );
      closed = TernaryGeometry.ternaryNearest(closed, centroids);
    }

    // Center and scale
    const centered = CompositionUtils.perturbe(closed, [
      1 / center[0],
      1 / center[1],
      1 / center[2],
    ]);
    const scaled = CompositionUtils.powerScale(centered, spread);

    // Calculate colors
    return scaled.map((p, i) => {
      // Handle invalid compositions
      // (i.e. composition that contains null/undefined/NaN values)
      if (!p) {
        return {
          p1: P[i][0],
          p2: P[i][1],
          p3: P[i][2],
          h: null,
          c: null,
          l: null,
          rgb: null,
        } as TricoloreResult;
      }

      // Scale proportions by maximum chroma
      const C = p.map((v) => v * chroma);

      // Generate primary colors with equidistant hues
      const phi = [hue, hue + 120, hue + 240].map((h) => (h * Math.PI) / 180);

      // Create complex values for each color component
      const Z = phi.map((angle, j) => {
        return { re: C[j] * Math.cos(angle), im: C[j] * Math.sin(angle) };
      });

      // Sum the complex values
      const z = Z.reduce(
        (sum, val) => {
          return { re: sum.re + val.re, im: sum.im + val.im };
        },
        { re: 0, im: 0 }
      );

      // Convert to polar coordinates
      const h = ((Math.atan2(z.im, z.re) * 180) / Math.PI + 360) % 360;
      const c = Math.sqrt(z.re * z.re + z.im * z.im);

      // Adjust lightness and chroma based on contrast
      const cfactor = (c * contrast) / chroma + 1 - contrast;
      const l = cfactor * lightness;
      const adjustedC = cfactor * c;

      // Convert to hex RGB
      const rgb = this.hclToHex(h, adjustedC, l);

      return {
        p1: P_notrans[i]![0],
        p2: P_notrans[i]![1],
        p3: P_notrans[i]![2],
        h,
        c: adjustedC,
        l,
        rgb,
      };
    });
  }

  /**
   * Map ternary compositions to colors using sextant scheme
   *
   * @param P - Array of ternary compositions
   * @param center - Center of sextant division
   * @param values - Array of 6 color values for sextants
   * @returns Array of sextant color results
   */
  static colorMapSextant(
    P: TernaryPoint[],
    center: TernaryPoint = [1 / 3, 1 / 3, 1 / 3],
    values: RGBColor[] = ['#FFFF00', '#B3DCC3', '#01A0C6', '#B8B3D8', '#F11D8C', '#FFB3B3']
  ): SextantResult[] {
    if (values.length !== 6) {
      throw new Error('Sextant values array must have exactly 6 elements');
    }

    // Close compositions (i.e. ensure they sum to 1)
    const closed = CompositionUtils.close([...P]);

    // Assign points to sextants
    const sextants = TernaryGeometry.ternarySurroundingSextant(closed, center);

    return closed.map((p, i) => {
      // Handle invalid compositions
      // (i.e. composition that contains null/undefined/NaN values)
      if (!p) {
        return {
          p1: P[i][0],
          p2: P[i][1],
          p3: P[i][2],
          sextant: null,
          rgb: null,
        } as SextantResult;
      }

      const sextant = sextants[i];
      const rgb = sextant !== null ? values[sextant - 1] : null;

      return {
        p1: p[0],
        p2: p[1],
        p3: p[2],
        sextant,
        rgb,
      };
    });
  }

  /**
   * Convert HCL color to Hex RGB
   *
   * @param h - Hue [0-360]
   * @param c - Chroma [0-200]
   * @param l - Lightness [0-100]
   * @returns Hex RGB string
   */
  static hclToHex(h: number, c: number, l: number): RGBColor {
    // Implementation based on d3-color conversions
    // First normalize values
    h = h % 360;
    if (h < 0) h += 360;

    // Scale c and L to typical ranges
    c = Math.max(0, Math.min(c, 230)); // Max ~230
    l = Math.max(0, Math.min(l, 100));

    // Convert HCL to LAB
    const hRad = (h * Math.PI) / 180;
    const a = Math.cos(hRad) * c;
    const _b = Math.sin(hRad) * c;

    // Convert LAB to XYZ
    const y = (l + 16) / 116;
    const x = a / 500 + y;
    const z = y - _b / 200;

    // D65 illuminant constants
    const X_n = 0.95047;
    const Y_n = 1.0;
    const Z_n = 1.08883;

    const fx = x > 0.206893034 ? x ** 3 : (x - 16 / 116) / 7.787;
    const fy = y > 0.206893034 ? y ** 3 : (y - 16 / 116) / 7.787;
    const fz = z > 0.206893034 ? z ** 3 : (z - 16 / 116) / 7.787;

    const X = X_n * fx;
    const Y = Y_n * fy;
    const Z = Z_n * fz;

    // Convert XYZ to sRGB
    let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
    let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
    let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;

    // Apply gamma correction and clamp
    const gamma = (v: number) => {
      return v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v;
    };

    r = gamma(r);
    g = gamma(g);
    b = gamma(b);

    // Clamp and convert to 8-bit
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const to8bit = (v: number) => Math.round(clamp(v) * 255);

    // Convert to hex
    const toHex = (v: number) => {
      const hex = to8bit(v).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
