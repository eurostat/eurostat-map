export interface ScalebarConfig {
    /**
     * Whether to show the scalebar.
     * Replaces showScalebar(true/false).
     */
    show?: boolean

    /**
     * Scalebar anchor position in SVG pixels: [x, y]
     */
    position?: [number, number]

    /**
     * Label suffix, usually " km", but can also be " m", " mi", etc.
     * Note: current implementation still computes values in metres internally.
     */
    units?: string

    /**
     * Label offset from the tick position: [x, y]
     */
    textOffset?: [number, number]

    /**
     * Maximum width of the scalebar in pixels.
     */
    maxWidth?: number

    /**
     * Total height reserved for the scalebar group in pixels.
     */
    height?: number

    /**
     * Stroke width used by scalebar lines.
     */
    strokeWidth?: number

    /**
     * Height of the horizontal middle segment line.
     */
    segmentHeight?: number

    /**
     * Height of the vertical ticks.
     */
    tickHeight?: number
}
