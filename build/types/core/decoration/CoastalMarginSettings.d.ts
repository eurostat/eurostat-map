/**
 * Visual settings for the coastal margin effect.
 */
export interface CoastalMarginSettings {
    /** Gaussian blur standard deviation. */
    standardDeviation: number
    /** Filter x bound (SVG filter coordinate space). */
    x: string
    /** Filter y bound (SVG filter coordinate space). */
    y: string
    /** Filter width (SVG filter coordinate space). */
    width: string
    /** Filter height (SVG filter coordinate space). */
    height: string
    /** Coastal stroke width. */
    strokeWidth: number
    /** Coastal stroke color. */
    color: string
    /** Coastal stroke opacity. */
    opacity: number
}
