import { MapConfig } from '../../core/MapConfig'

/**
 * Configuration specific to choropleth maps
 */
export interface ChoroplethConfig extends MapConfig {
    // Classification
    numberOfClasses?: number
    classificationMethod?: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'
    thresholds?: number[]
    makeClassifNice?: boolean

    // Colors
    colors?: string[]
    colorFunction?: (t: number) => string
    colorSchemeType?: 'discrete' | 'continuous'
    classToFillStyle?: { [classIndex: number]: string }

    // No data styling
    noDataFillStyle?: string

    // Value transformation (for continuous schemes)
    valueTransform?: (x: number) => number
    valueUntransform?: (x: number) => number
    skipNormalization?: boolean

    // Diverging schemes
    pointOfDivergence?: number
}
