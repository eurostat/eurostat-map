/**
 * Parent configuration for map legends. Each map type will extend this with its own specific properties, but these are the common ones that apply to all legend types.
 */
export interface LegendConfig {
    x?: number
    y?: number
    width?: number
    height?: number

    title?: string
    titleWidth?: number
    titleFontSize?: number

    // Box styling
    boxWidth?: number
    boxHeight?: number
    boxPadding?: number
    boxCornerRadius?: number

    // Shape styling (for proportional symbol legends)
    shapeWidth?: number
    shapeHeight?: number
    shapePadding?: number

    // Label styling
    labelFontSize?: number
    labelOffset?: number
    labelWrap?: number
    labelDecimalPlaces?: number

    // Orientation
    orientation?: 'vertical' | 'horizontal'
    ascending?: boolean

    // Cells (for manual legend specification)
    cells?: any[]

    // No data label
    noData?: boolean
    noDataText?: string

    [key: string]: any
}
