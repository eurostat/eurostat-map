/**
 * Parent configuration for map legends. Each map type will extend this with its own specific properties, but these are the common ones that apply to all legend types.
 */
export interface LegendConfig {
    /** Legend origin x-coordinate in pixels. */
    x?: number
    /** Legend origin y-coordinate in pixels. */
    y?: number
    /** Legend width in pixels. */
    width?: number
    /** Legend height in pixels. */
    height?: number

    /** Legend title text. */
    title?: string
    /** Legend title font size in pixels. */
    titleFontSize?: number

    /** Box styling. */
    /** Inner spacing around legend content. */
    boxPadding?: number

    /** Shape styling (for proportional symbol legends). */
    /** Symbol swatch width in pixels. */
    shapeWidth?: number
    /** Symbol swatch height in pixels. */
    shapeHeight?: number
    /** Horizontal gap between shape and label. */
    shapePadding?: number

    /** Label styling. */
    /** Label font size in pixels. */
    labelFontSize?: number
    /** Pixel offset applied to labels. */
    labelOffset?: number

    /** Legend layout direction. */
    orientation?: 'vertical' | 'horizontal'
    /** Sort legend entries in ascending order when true. */
    ascending?: boolean

    /** Manual legend cell definitions. */
    cells?: any[]

    /** Whether to display the no-data legend item. */
    noData?: boolean
    /** Label used for no-data legend item. */
    noDataText?: string

    [key: string]: any
}
