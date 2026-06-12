/**
 * Margins used to place and center grid cartograms.
 */
export interface GridCartogramMargins {
    /** Top margin in pixels. */
    top: number
    /** Right margin in pixels. */
    right: number
    /** Bottom margin in pixels. */
    bottom: number
    /** Left margin in pixels. */
    left: number
}

/** Shared chart offset for symbols drawn inside each grid cell. */
export interface GridCartogramChartOffset {
    /** Horizontal offset in pixels. Positive moves right. */
    x: number
    /** Vertical offset in pixels. Positive moves down. */
    y: number
}

/**
 * Settings for grid cartogram layout and geometry.
 */
export interface GridCartogramSettings {
    /** Grid cell shape. */
    shape: 'square' | 'hexagon'
    /** Margins around the grid drawing area. */
    margins: GridCartogramMargins
    /** Extra spacing between grid cells in pixels. */
    cellPadding: number
    /** Shared chart offset in grid cells for chart-based map types. */
    chartOffset: GridCartogramChartOffset
    /**
     * Custom grid layout CSV string.
     * If undefined, the built-in layout for the selected shape is used.
     */
    positions?: string
}
