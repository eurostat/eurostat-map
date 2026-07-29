import { MapConfig } from '../../core/MapConfig'
import type { ChoroplethLegendConfig } from '../../legend/choropleth/ChoroplethLegendConfig'

/**
 * Configuration specific to choropleth maps
 */
export interface ChoroplethConfig extends MapConfig {
    /** Choropleth legend configuration. */
    legend?: ChoroplethLegendConfig | false

    /** Classification. */
    numberOfClasses?: number
    /** Classification method. */
    classificationMethod?: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'
    /** Thresholds. */
    thresholds?: number[]
    /** Make classif nice. */
    makeClassifNice?: boolean

    /** Colors. */
    colors?: string[]
    colorFunction?: (t: number) => string
    /** Color scheme type. */
    colorSchemeType?: 'discrete' | 'continuous'
    /** Class to fill style. */
    classToFillStyle?: { [classIndex: number]: string }

    /** No-data styling. */
    noDataFillStyle?: string

    /** Fill style for extra categorical values mixed into this choropleth's classification,
     * keyed by the raw data value (e.g. `{ '-': '#cccccc' }` for regions whose value is the
     * string '-'). Matching regions get their own legend/tooltip entry instead of being
     * classified numerically or treated as generic "no data". */
    categoryFillStyle?: { [rawValue: string]: string }
    /** Legend/tooltip text for each extra category, keyed by the same raw data value as
     * `categoryFillStyle`. Ex.: `{ '-': 'No railway lines' }` */
    categoryText?: { [rawValue: string]: string }

    /** Value transformation (for continuous schemes). */
    valueTransform?: (x: number) => number
    valueUntransform?: (x: number) => number
    /** Skip normalization. */
    skipNormalization?: boolean

    /** Diverging schemes. */
    pointOfDivergence?: number
}
