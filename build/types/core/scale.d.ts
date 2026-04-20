/**
 * Create a proportional circle radius scale (area ∝ value)
 *
 * @param {Array<number>} rawData  Raw statistical values
 * @param {number} maxSize         Maximum radius in px
 * @param {number} minSize         Minimum visible radius for positive values
 */
export function createSqrtScale(rawData?: Array<number>, maxSize?: number, minSize?: number): {
    (v: any): number;
    domain(): any[];
    maxSize(): number;
    minSize(): number;
    baseScale(): any;
};
/**
 * Create a radial scale (area ∝ value) using D3's scaleRadial
 * Equivalent to createSqrtScale but uses scaleRadial as the base
 *
 * @param {Array<number>} rawData  Raw statistical values
 * @param {number} maxSize         Maximum radius in px
 * @param {number} minSize         Minimum visible radius for positive values
 */
export function createRadialScale(rawData?: Array<number>, maxSize?: number, minSize?: number): {
    (v: any): number;
    domain(): any[];
    maxSize(): number;
    minSize(): number;
    baseScale(): any;
};
/**
 * Create a linear scale (e.g for line widths)
 *
 * @param {Array<number>} rawData  Raw statistical values
 * @param {number} maxSize         Maximum width in px
 * @param {number} minSize         Minimum visible width for positive values
 */
export function createLinearScale(rawData?: Array<number>, maxSize?: number, minSize?: number): {
    (v: any): number;
    domain(): any[];
    maxSize(): number;
    minSize(): number;
    baseScale(): any;
};
//# sourceMappingURL=scale.d.ts.map