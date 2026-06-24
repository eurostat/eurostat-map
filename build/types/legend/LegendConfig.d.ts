/**
 * Parent configuration for map legends. Each map type will extend this with its own specific properties, but these are the common ones that apply to all legend types.
 */
export interface LegendConfig {
    /** Legend origin x-coordinate in pixels. */
    x?: number
    /** Legend origin y-coordinate in pixels. */
    y?: number
    /** Automatically position the legend in a map corner. Manual x/y coordinates take precedence. */
    position?: 'top right' | 'bottom right' | 'top left' | 'bottom left'
    /** Legend width in pixels. */
    width?: number
    /** Legend height in pixels. */
    height?: number

    /** Legend title text. */
    title?: string
    /** Legend subtitle text. */
    subtitle?: string
    /** Legend title font size in pixels. */
    titleFontSize?: number

    /** Box styling. */
    /** Inner spacing around legend content. */
    boxPadding?: number
    /** Background opacity of the legend box. */
    boxOpacity?: number
    /** Padding between the title block and legend body. */
    titlePadding?: number

    /** Shape styling (for proportional symbol legends). */
    /** Symbol swatch width in pixels. */
    shapeWidth?: number
    /** Symbol swatch height in pixels. */
    shapeHeight?: number
    /** Horizontal gap between shape and label. */
    shapePadding?: number
    /** Length of separator lines in discrete legends. */
    sepLineLength?: number

    /** Label styling. */
    /** Label font size in pixels. */
    labelFontSize?: number
    /** Pixel offsets applied to labels. */
    labelOffsets?: { x: number; y: number }
    /** Custom formatter for legend labels. */
    labelFormatter?: ((value: number, index?: number) => string) | null
    /** Number of decimal places for auto-formatted labels. */
    decimals?: number

    /** Legend layout direction. */
    orientation?: 'vertical' | 'horizontal'
    /** Sort legend entries in ascending order when true. */
    ascending?: boolean
    /** Whether to display the no-data legend item. */
    noData?: boolean
    /** Label used for no-data legend item. */
    noDataText?: string
    /** Vertical gap before the no-data swatch in pixels. */
    noDataPadding?: number
    /** Width of the no-data swatch in pixels. */
    noDataShapeWidth?: number
    /** Height of the no-data swatch in pixels. */
    noDataShapeHeight?: number

    /** Whether to show dataset min/max labels when supported. */
    maxMin?: boolean
    /** Text affixes for min/max labels as [minSuffix, maxSuffix]. */
    maxMinLabels?: [string, string]
}
