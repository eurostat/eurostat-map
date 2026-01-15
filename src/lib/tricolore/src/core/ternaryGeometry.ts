import { TernaryPoint, TernaryCentroid, TernaryVertex } from '../types';

/**
 * Ternary geometry functions
 */
export class TernaryGeometry {
  /**
   * Calculate centroids of subtriangles in a segmented equilateral triangle
   *
   * @param k - Number of rows in the segmented equilateral triangle
   * @returns Array of centroid information
   */
  static ternaryMeshCentroids(k: number): TernaryCentroid[] {
    const K = k * k;
    const centroids: TernaryCentroid[] = [];

    for (let id = 1; id <= K; id++) {
      const g = Math.floor(Math.sqrt(K - id));
      const gsq = g * g;

      const c1 = (((-K + id + g * (g + 2) + 1) % 2) - 3 * gsq - 3 * id + 3 * K + 1) / (6 * k);
      const c2 = -(((-K + gsq + id + 2 * g + 1) % 2) + 3 * g - 3 * k + 1) / (3 * k);
      const c3 =
        (((-K + gsq + id + 2 * g + 1) % 2) + 3 * gsq + 6 * g + 3 * id - 3 * K + 1) / (6 * k);

      centroids.push({ id, p1: c1, p2: c2, p3: c3 });
    }

    return centroids;
  }

  /**
   * Calculate vertices of sub-triangles in a segmented equilateral triangle
   *
   * @param centroids - Centroids of sub-triangles
   * @returns Array of vertex information
   */
  static ternaryMeshVertices(centroids: TernaryCentroid[]): TernaryVertex[] {
    const k = Math.sqrt(centroids.length);
    const vertices: TernaryVertex[] = [];

    centroids.forEach((c) => {
      const j = k - Math.floor(Math.sqrt(k * k - c.id));
      const i = c.id - (j - 1) * (2 * k - j + 1);
      const term1 = (Math.pow(-1, i % 2) * 2) / (3 * k);
      const term2 = Math.pow(-1, i % 2) / (3 * k);

      vertices.push({
        id: c.id,
        vertex: 1,
        p1: c.p1 - term1,
        p2: c.p2 + term2,
        p3: c.p3 + term2,
      });

      vertices.push({
        id: c.id,
        vertex: 2,
        p1: c.p1 + term2,
        p2: c.p2 - term1,
        p3: c.p3 + term2,
      });

      vertices.push({
        id: c.id,
        vertex: 3,
        p1: c.p1 + term2,
        p2: c.p2 + term2,
        p3: c.p3 - term1,
      });
    });

    return vertices;
  }

  /**
   * Calculate distance between points in ternary space
   *
   * @param p - Reference ternary point
   * @param C - Array of ternary points to measure distance to
   * @returns Array of distances
   */
  static ternaryDistance(p: TernaryPoint, C: TernaryPoint[]): number[] {
    return C.map((c) => {
      const q1 = p[0] - c[0];
      const q2 = p[1] - c[1];
      const q3 = p[2] - c[2];
      return -(q2 * q3 + q3 * q1 + q1 * q2);
    });
  }

  /**
   * Find nearest coordinate in set C for each point in P
   *
   * @param P - Array of ternary points
   * @param C - Array of reference ternary points
   * @returns Array of nearest ternary points
   */
  static ternaryNearest(P: (TernaryPoint | null)[], C: TernaryPoint[]): (TernaryPoint | null)[] {
    return P.map((p) => {
      if (!p) return null;
      const distances = this.ternaryDistance(p, C);
      const minIndex = distances.indexOf(Math.min(...distances));
      return C[minIndex];
    });
  }

  /**
   * Calculate vertices of sextant regions
   *
   * @param center - Center point of the sextants
   * @returns Array of sextant vertex information
   */
  static ternarySextantVertices(center: TernaryPoint): TernaryVertex[] {
    const vertices: TernaryVertex[] = [];

    // corner points
    const p1: TernaryPoint = [1, 0, 0];
    const p2: TernaryPoint = [0, 1, 0];
    const p3: TernaryPoint = [0, 0, 1];

    const a1: TernaryPoint = [center[0], 1 - center[0], 0];
    const a2: TernaryPoint = [center[0], 0, 1 - center[0]];
    const b1: TernaryPoint = [0, center[1], 1 - center[1]];
    const b2: TernaryPoint = [1 - center[1], center[1], 0];
    const c1: TernaryPoint = [1 - center[2], 0, center[2]];
    const c2: TernaryPoint = [0, 1 - center[2], center[2]];

    // sextant vertices
    const sextantPoints = [
      // sextant 1: 5 vertices
      [center, c1, p1, b2, center],
      // sextant 2: 4 vertices
      [center, b2, a1, center],
      // sextant 3: 5 vertices
      [center, a1, p2, c2, center],
      // sextant 4: 4 vertices
      [center, c2, b1, center],
      // sextant 5: 5 vertices
      [center, b1, p3, a2, center],
      // sextant 6: 4 vertices
      [center, a2, c1, center],
    ];

    for (let id = 1; id <= 6; id++) {
      const points = sextantPoints[id - 1];
      for (let v = 0; v < points.length; v++) {
        vertices.push({
          id,
          vertex: v + 1,
          p1: points[v][0],
          p2: points[v][1],
          p3: points[v][2],
        });
      }
    }

    return vertices;
  }

  /**
   * Determine which sextant a point belongs to
   *
   * @param P - Array of ternary points
   * @param center - Center point of the sextants
   * @returns Array of sextant ids (1-6) or null
   */
  static ternarySurroundingSextant(
    P: (TernaryPoint | null)[],
    center: TernaryPoint
  ): (number | null)[] {
    return P.map((p) => {
      if (!p) return null;

      const isLarger = [p[0] > center[0], p[1] > center[1], p[2] > center[2]];

      if (isLarger[0] && !isLarger[1] && !isLarger[2]) return 1;
      if (isLarger[0] && isLarger[1] && !isLarger[2]) return 2;
      if (!isLarger[0] && isLarger[1] && !isLarger[2]) return 3;
      if (!isLarger[0] && isLarger[1] && isLarger[2]) return 4;
      if (!isLarger[0] && !isLarger[1] && isLarger[2]) return 5;
      if (isLarger[0] && !isLarger[1] && isLarger[2]) return 6;

      // Otherwise the point is exactly at the center, or invalid
      return null;
    });
  }

  /**
   * Convert ternary coordinates to cartesian coordinates for plotting
   *
   * @param p - Ternary point
   * @returns Cartesian coordinates [x, y]
   */
  static ternaryToCartesian(p: TernaryPoint): [number, number] {
    const x = 0.5 * (2 * p[2] + p[1]);
    const y = (Math.sqrt(3) / 2) * p[1];
    return [x, y];
  }

  /**
   * Convert cartesian coordinates to ternary coordinates
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Ternary point
   */
  static cartesianToTernary(x: number, y: number): TernaryPoint {
    const p2 = (2 * y) / Math.sqrt(3);
    const p3 = x - p2 / 2;
    const p1 = 1 - p2 - p3;
    return [p1, p2, p3];
  }

  /**
   * Calculate ternary limits (min/max for each component)
   *
   * @param P - Array of ternary points
   * @returns Object with lower and upper limits
   */
  static ternaryLimits(P: TernaryPoint[]): { lower: TernaryPoint; upper: TernaryPoint } {
    // Initialize with extreme values...
    const lower: TernaryPoint = [1, 1, 1];
    const upper: TernaryPoint = [0, 0, 0];

    // and find min/max for each component
    P.forEach((p) => {
      lower[0] = Math.min(lower[0], p[0]);
      lower[1] = Math.min(lower[1], p[1]);
      lower[2] = Math.min(lower[2], p[2]);

      upper[0] = Math.max(upper[0], p[0]);
      upper[1] = Math.max(upper[1], p[1]);
      upper[2] = Math.max(upper[2], p[2]);
    });

    return { lower, upper };
  }
}
