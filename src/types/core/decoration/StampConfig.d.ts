/**
 * Configuration for a stamp/watermark annotation rendered on the map.
 * @example
 * map.stamp({ x: 230, y: 100, text: 'DRAFT', shape: 'circle', size: 60 })
 */
export interface StampConfig {
    /** Text content of the stamp. Use ¶ for forced line breaks, ~ for non-breaking spaces. */
    text: string

    /** Horizontal centre position in SVG pixels. @default 230 */
    x?: number

    /** Vertical centre position in SVG pixels. @default 100 */
    y?: number

    /**
     * Shape of the stamp border.
     * @default 'circle'
     */
    shape?: 'circle' | 'square' | 'rectangle' | 'eu-stars'

    /**
     * Size of the stamp in SVG pixels.
     * For circle/square: diameter. For rectangle: controls text fit height.
     * Ignored when fontSize is set.
     * @default 60
     */
    size?: number

    /**
     * Fix the rendered font size in pixels and let the shape grow to contain
     * the text, instead of scaling text to fit a fixed shape size.
     */
    fontSize?: number

    /** Text colour. @default '#585858' */
    textColor?: string

    /** Border/shape colour. @default '#9e9e9e' */
    stampColor?: string

    /** Border stroke width in pixels. @default 1 */
    strokeWidth?: number

    /** Line height of the unscaled text element in pixels. @default 15 */
    lineHeight?: number

    /**
     * Text horizontal alignment.
     * 'middle': stamp is centred on x (default).
     * 'start': stamp's left edge is at x, growing rightward.
     * @default 'middle'
     */
    textAnchor?: 'middle' | 'start'

    /**
     * Padding between the text and the shape border in pixels.
     * @default 0 for circle/square/eu-stars, 1 for rectangle
     */
    padding?: number

    /** Corner radius for square and rectangle shapes (SVG rx attribute). @default 0 */
    rx?: number

    /**
     * Size multiplier for individual stars in the 'eu-stars' shape.
     * Does not affect the ring radius.
     * @default 1
     */
    starSize?: number
}
