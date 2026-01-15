import { TernaryPoint, TernaryCentroid, TernaryVertex } from '../types';
/**
 * Ternary geometry functions
 */
export declare class TernaryGeometry {
    /**
     * Calculate centroids of subtriangles in a segmented equilateral triangle
     *
     * @param k - Number of rows in the segmented equilateral triangle
     * @returns Array of centroid information
     */
    static ternaryMeshCentroids(k: number): TernaryCentroid[];
    /**
     * Calculate vertices of sub-triangles in a segmented equilateral triangle
     *
     * @param centroids - Centroids of sub-triangles
     * @returns Array of vertex information
     */
    static ternaryMeshVertices(centroids: TernaryCentroid[]): TernaryVertex[];
    /**
     * Calculate distance between points in ternary space
     *
     * @param p - Reference ternary point
     * @param C - Array of ternary points to measure distance to
     * @returns Array of distances
     */
    static ternaryDistance(p: TernaryPoint, C: TernaryPoint[]): number[];
    /**
     * Find nearest coordinate in set C for each point in P
     *
     * @param P - Array of ternary points
     * @param C - Array of reference ternary points
     * @returns Array of nearest ternary points
     */
    static ternaryNearest(P: (TernaryPoint | null)[], C: TernaryPoint[]): (TernaryPoint | null)[];
    /**
     * Calculate vertices of sextant regions
     *
     * @param center - Center point of the sextants
     * @returns Array of sextant vertex information
     */
    static ternarySextantVertices(center: TernaryPoint): TernaryVertex[];
    /**
     * Determine which sextant a point belongs to
     *
     * @param P - Array of ternary points
     * @param center - Center point of the sextants
     * @returns Array of sextant ids (1-6) or null
     */
    static ternarySurroundingSextant(P: (TernaryPoint | null)[], center: TernaryPoint): (number | null)[];
    /**
     * Convert ternary coordinates to cartesian coordinates for plotting
     *
     * @param p - Ternary point
     * @returns Cartesian coordinates [x, y]
     */
    static ternaryToCartesian(p: TernaryPoint): [number, number];
    /**
     * Convert cartesian coordinates to ternary coordinates
     *
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns Ternary point
     */
    static cartesianToTernary(x: number, y: number): TernaryPoint;
    /**
     * Calculate ternary limits (min/max for each component)
     *
     * @param P - Array of ternary points
     * @returns Object with lower and upper limits
     */
    static ternaryLimits(P: TernaryPoint[]): {
        lower: TernaryPoint;
        upper: TernaryPoint;
    };
}
