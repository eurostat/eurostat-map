/**
 * A single map label (country name, statistical value label, etc.)
 */
export interface Label {
    text: string
    x: number
    y: number
    class?: string
    /** Font size in pixels. @deprecated Use CSS classes instead. */
    size?: number
    rotate?: number | null
    letterSpacing?: number
    /** Country code, when this label represents a country. */
    cc?: string
}

/**
 * Configuration for map labels (country names, statistical values, etc.)
 */
export interface LabelsConfig {
    /**
     * Array of label objects with text and coordinates.
     * Use eurostatmap.getDefaultLabels() to get predefined geographic labels.
     */
    labels?: Label[]

    /**
     * Show statistical values as labels on regions.
     * @default false
     */
    values?: boolean

    /**
     * Apply halo/shadow effect around labels for better readability.
     * @default false
     */
    halos?: boolean

    /**
     * Legacy alias for halos.
     * @deprecated Use halos instead
     */
    shadows?: boolean

    /**
     * Apply solid background rectangles behind labels.
     * Takes precedence over halos when both are set.
     * @default false
     */
    backgrounds?: boolean

    /**
     * Fill color for label background rectangles (CSS color string).
     * Only applies when backgrounds is true.
     * @default '#ffffff'
     * @example 'white'
     * @example '#B19122'
     * @example 'rgba(255, 255, 255, 0.9)'
     */
    backgroundFill?: string

    /**
     * Scale labels when zooming in/out.
     * @default true
     */
    scaleOnZoom?: boolean

    /**
     * Custom formatter function for statistical value labels.
     * @example (value) => value.toFixed(1) + '%'
     */
    valuesFormatter?: (value: number) => string

    /**
     * Filter function to show/hide statistical value labels for specific regions.
     * @param region - GeoJSON feature object
     * @param map - Map instance
     * @returns true to show label, false to hide
     */
    statLabelsFilterFunction?: (region: any, map: any) => boolean

    /**
     * Override default centroid positions for statistical value labels.
     * Keys are region IDs (e.g., 'DE', 'FR01'), values are {x, y} coordinates.
     */
    statLabelsPositions?: Record<string, { x: number; y: number }>

    /**
     * Function to adjust calculated centroids for value labels.
     * @param region - GeoJSON feature object
     * @param centroid - Calculated centroid [x, y]
     * @returns Adjusted centroid [x, y]
     * @example (region, centroid) => [centroid[0] + 10, centroid[1] - 10]
     */
    processValueLabelCentroids?: (region: any, centroid: [number, number]) => [number, number]
}
