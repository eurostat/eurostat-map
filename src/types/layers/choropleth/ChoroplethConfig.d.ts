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

    /** Value transformation (for continuous schemes). */
    valueTransform?: (x: number) => number
    valueUntransform?: (x: number) => number
    /** Skip normalization. */
    skipNormalization?: boolean

    /** Diverging schemes. */
    pointOfDivergence?: number
}
