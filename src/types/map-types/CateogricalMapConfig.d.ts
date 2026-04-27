import type { MapConfig } from '../core/MapConfig'

/**
 * Configuration for categorical map
 */
export interface CategoricalMapConfig extends MapConfig {
    /** Category-to-color mapping */
    classToFillStyle?: Record<string, string>
    /** Fill style for regions with no data */
    noDataFillStyle?: string
}
