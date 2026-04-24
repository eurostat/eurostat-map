import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for choropleth map
 */
export interface ChoroplethMapConfig {
    /** Number of classes for classification. @default 7 */
    numberOfClasses?: number
    /** Classification method: 'quantile', 'ckmeans', 'jenks', 'equinter', 'threshold'. @default 'quantile' */
    classificationMethod?: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'
    /** Threshold values when classificationMethod is 'threshold'. @default [0] */
    thresholds?: number[]
    /** Array of colors for classes */
    colors?: string[]
    /** Ensure nice rounded threshold values. @default true */
    makeClassifNice?: boolean
    /** Color function mapping [0,1] to color */
    colorFunction?: (t: number) => string
    /** Function returning color from class index */
    classToFillStyle?: (i: number) => string
    /** Classifier function returning class number from stat value */
    classifier?: (value: number) => number
    /** Fill style for regions with no data. @default '#bcbcbc' */
    noDataFillStyle?: string
}

/**
 * Creates a choropleth map instance.
 * @param config - Map configuration
 * @returns Map instance with choropleth-specific methods
 */
export function map(config?: ChoroplethMapConfig): MapInstance

/**
 * Gets a color function from interpolator and color array.
 * @param colorFunction - D3 color interpolator function
 * @param colorArray - Array of colors to interpolate
 * @param schemeType - 'discrete' or 'continuous'. @default 'discrete'
 * @returns Color function
 */
export function getColorFunction(colorFunction: any, colorArray: string[], schemeType?: 'discrete' | 'continuous'): (t: number) => string

/**
 * Gets a fill pattern legend function.
 * @returns Function that returns pattern for a region
 */
export function getFillPatternLegend(): (ecl: string) => any
