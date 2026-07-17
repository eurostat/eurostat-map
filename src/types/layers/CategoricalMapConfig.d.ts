import type { MapConfig } from '../core/MapConfig'

/**
 * Configuration for categorical map
 */
export interface CategoricalMapConfig extends MapConfig {
    /** Category-to-color mapping */
    classToFillStyle?: Record<string, string>
    /** Category-to-label mapping, used for legend text and tooltips */
    classToText?: Record<string, string>
    /** Fill style for regions with no data */
    noDataFillStyle?: string
}
