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
    /** Country-label rendering settings for grid cartograms. */
    countryLabelSettings?: {
        /** Show country labels as codes, names, or a custom string. */
        countryLabels?: 'code' | 'name' | ((id: string, name: string | undefined, region?: any) => string)
        /** Base font size for country labels in grid cartograms. */
        countryLabelFontSize?: number
        /** Minimum font size allowed when shrinking labels to avoid overlap. */
        countryLabelMinFontSize?: number
        /** Extra padding subtracted from the available label width before fitting. */
        countryLabelPadding?: number
        /** Disable automatic label shrinking/stretching to avoid overlap. @default true */
        countryLabelAvoidOverlap?: boolean
    }
    /** @deprecated Use countryLabelSettings.countryLabels instead. */
    countryLabels?: 'code' | 'name' | ((id: string, name: string | undefined, region?: any) => string)
    /** @deprecated Use countryLabelSettings.countryLabelFontSize instead. */
    countryLabelFontSize?: number
    /** @deprecated Use countryLabelSettings.countryLabelMinFontSize instead. */
    countryLabelMinFontSize?: number
    /** @deprecated Use countryLabelSettings.countryLabelPadding instead. */
    countryLabelPadding?: number
    /** @deprecated Use countryLabelSettings.countryLabelAvoidOverlap instead. */
    countryLabelAvoidOverlap?: boolean
    /** Shared chart offset in grid cells for chart-based map types. */
    chartOffset: GridCartogramChartOffset
    /**
     * Custom grid layout CSV string.
     * If undefined, the built-in layout for the selected shape is used.
     */
    positions?: string
}
