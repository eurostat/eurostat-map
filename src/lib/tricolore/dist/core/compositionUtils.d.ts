import { TernaryPoint } from '../types';
/**
 * Utility functions for compositional data analysis
 */
export declare class CompositionUtils {
    /**
     * Calculate geometric mean of an array of numbers
     *
     * @param x - Array of numeric values
     * @param removeZeros - Whether to remove zeros before calculation
     * @returns The geometric mean
     */
    static geometricMean(x: number[], removeZeros?: boolean): number;
    /**
     * Calculate the center of a compositional dataset
     *
     * @param P - Array of ternary points
     * @returns The center point
     */
    static centre(P: TernaryPoint[]): TernaryPoint;
    /**
     * Perturbe a compositional dataset by a compositional vector
     *
     * @param P - Array of ternary points
     * @param c - Perturbation vector
     * @returns Perturbated compositions
     */
    static perturbe(P: (TernaryPoint | null)[], c?: TernaryPoint): (TernaryPoint | null)[];
    /**
     * Power scaling of compositions
     *
     * @param P - Array of ternary points
     * @param scale - Power scalar
     * @returns Scaled compositions
     */
    static powerScale(P: (TernaryPoint | null)[], scale?: number): (TernaryPoint | null)[];
    /**
     * Close compositions to ensure they sum to 1
     *
     * @param P - Array of ternary points
     * @returns Closed compositions
     */
    static close(P: TernaryPoint[]): (TernaryPoint | null)[];
    /**
     * Validate ternary points
     *
     * @param P - Array of ternary points to validate
     * @throws Error if any point has negative values or values don't sum to approximately 1
     */
    static validateTernaryPoints(P: (TernaryPoint | null)[]): void;
    /**
     * Validate that a point is a valid ternary point (i.e., has three non-null components)
     */
    static isValidTernary(point: TernaryPoint): boolean;
}
