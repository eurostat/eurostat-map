/**
 * Statistical configuration for composition maps (pie, bar, coxcomb, waffle, etc.)
 */
export interface CompositionStatConfig {
    /** Array of statistical dataset codes */
    statCodes?: string[]
    /** Array of colors for categories */
    colors?: string[]
    /** Size dataset code for proportional sizing */
    sizeDatasetCode?: string
    /** Maximum size in pixels */
    maxSize?: number
    /** Minimum size in pixels */
    minSize?: number
}
