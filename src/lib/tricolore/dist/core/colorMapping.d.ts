import { TernaryPoint, TricoloreResult, SextantResult, RGBColor } from '../types';
/**
 * Color mapping functions
 */
export declare class ColorMapping {
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
    static colorMapTricolore(P: TernaryPoint[], center?: TernaryPoint, breaks?: number, hue?: number, chroma?: number, lightness?: number, contrast?: number, spread?: number): TricoloreResult[];
    /**
     * Map ternary compositions to colors using sextant scheme
     *
     * @param P - Array of ternary compositions
     * @param center - Center of sextant division
     * @param values - Array of 6 color values for sextants
     * @returns Array of sextant color results
     */
    static colorMapSextant(P: TernaryPoint[], center?: TernaryPoint, values?: RGBColor[]): SextantResult[];
    /**
     * Convert HCL color to Hex RGB
     *
     * @param h - Hue [0-360]
     * @param c - Chroma [0-200]
     * @param l - Lightness [0-100]
     * @returns Hex RGB string
     */
    static hclToHex(h: number, c: number, l: number): RGBColor;
}
