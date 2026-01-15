import { TernaryPoint } from '../types';

/**
 * Utility functions for compositional data analysis
 */
export class CompositionUtils {
  /**
   * Calculate geometric mean of an array of numbers
   *
   * @param x - Array of numeric values
   * @param removeZeros - Whether to remove zeros before calculation
   * @returns The geometric mean
   */
  static geometricMean(x: number[], removeZeros: boolean = true): number {
    const values = removeZeros ? x.filter((v) => v !== 0) : x;
    if (values.length === 0) {
      return 0;
    }
    return Math.exp(values.reduce((sum, val) => sum + Math.log(val), 0) / values.length);
  }

  /**
   * Calculate the center of a compositional dataset
   *
   * @param P - Array of ternary points
   * @returns The center point
   */
  static centre(P: TernaryPoint[]): TernaryPoint {
    // Calculate geometric mean for each component
    const g1 = this.geometricMean(P.map((p) => p[0]));
    const g2 = this.geometricMean(P.map((p) => p[1]));
    const g3 = this.geometricMean(P.map((p) => p[2]));

    // Close the vector of geometric means
    const sum = g1 + g2 + g3;
    return [g1 / sum, g2 / sum, g3 / sum];
  }

  /**
   * Perturbe a compositional dataset by a compositional vector
   *
   * @param P - Array of ternary points
   * @param c - Perturbation vector
   * @returns Perturbated compositions
   */
  static perturbe(
    P: (TernaryPoint | null)[],
    c: TernaryPoint = [1 / 3, 1 / 3, 1 / 3]
  ): (TernaryPoint | null)[] {
    return P.map((p) => {
      if (!p) return null;
      const raw = [p[0] * c[0], p[1] * c[1], p[2] * c[2]];
      const sum = raw.reduce((a, b) => a + b, 0);
      return [raw[0] / sum, raw[1] / sum, raw[2] / sum];
    });
  }

  /**
   * Power scaling of compositions
   *
   * @param P - Array of ternary points
   * @param scale - Power scalar
   * @returns Scaled compositions
   */
  static powerScale(P: (TernaryPoint | null)[], scale: number = 1): (TernaryPoint | null)[] {
    return P.map((p) => {
      if (!p) return null;
      const raw = [Math.pow(p[0], scale), Math.pow(p[1], scale), Math.pow(p[2], scale)];
      const sum = raw.reduce((a, b) => a + b, 0);
      return [raw[0] / sum, raw[1] / sum, raw[2] / sum];
    });
  }

  /**
   * Close compositions to ensure they sum to 1
   *
   * @param P - Array of ternary points
   * @returns Closed compositions
   */
  static close(P: TernaryPoint[]): (TernaryPoint | null)[] {
    return P.map((p) => {
      if (!this.isValidTernary(p)) {
        return null;
      }
      const sum = p[0] + p[1] + p[2];
      return [p[0] / sum, p[1] / sum, p[2] / sum];
    });
  }

  /**
   * Validate ternary points
   *
   * @param P - Array of ternary points to validate
   * @throws Error if any point has negative values or values don't sum to approximately 1
   */
  static validateTernaryPoints(P: (TernaryPoint | null)[]): void {
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (!p) {
        continue;
      }
      if (p.length !== 3) {
        throw new Error(`Ternary point must have exactly 3 components, got ${p.length}`);
      }

      if (p.some((val) => val < 0)) {
        throw new Error(`Ternary point contains negative values: [${p}]`);
      }

      const sum = p[0] + p[1] + p[2];
      if (Math.abs(sum - 1) > 1e-9) {
        throw new Error(`Ternary point components must sum to 1, got ${sum}: [${p}]`);
      }
    }
  }

  /**
   * Validate that a point is a valid ternary point (i.e., has three non-null components)
   */
  static isValidTernary(point: TernaryPoint): boolean {
    return (
      Array.isArray(point) &&
      point.length === 3 &&
      point.every((v) => typeof v === 'number' && !Number.isNaN(v))
    );
  }
}
