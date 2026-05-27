/**
 * TypeScript definitions for eurostat-map
 */

export { MapConfig } from './core/MapConfig'
export { MapType } from './map-types/MapType'
export { TooltipConfig } from './core/TooltipConfig'
export { LegendConfig } from './legend/LegendConfig'
export { StatConfig } from './core/stat/StatConfig'
export { InsetConfig } from './core/InsetConfig'
export { MapInstance } from './core/MapInstance'

// ==================== Legend Configuration Types ====================

// Main legend types
export { CategoricalLegendConfig } from './legend/CategoricalLegendConfig'
export { CoxcombLegendConfig } from './legend/CoxcombLegendConfig'
export { MushroomLegendConfig } from './legend/MushroomLegendConfig'
export { PieChartLegendConfig } from './legend/PieChartLegendConfig'
export { SparklineLegendConfig } from './legend/SparklineLegendConfig'
export { WaffleLegendConfig } from './legend/WaffleLegendConfig'
export { StripeCompositionLegendConfig } from './legend/StripeCompositionLegendConfig'
export { PatternFillLegendConfig } from './legend/PatternFillLegendConfig'

// Choropleth legend types
export { BivariateLegendConfig } from './legend/choropleth/BivariateLegendConfig'
export { HistogramLegendConfig } from './legend/choropleth/HistogramLegendConfig'

// Composition legend types
export { BarChartLegendConfig } from './legend/composition/BarChartLegendConfig'

// Flow legend types
export { FlowMapLegendConfig } from './legend/flow/FlowMapLegendConfig'

// Proportional symbol legend types
export { ProportionalSymbolsLegendConfig } from './legend/proportional-symbol/ProportionalSymbolsLegendConfig'

// ==================== Categorical Map Types ====================

/**
 * Configuration for categorical maps
 */
export interface CategoricalConfig extends MapConfig {
    classToStyle?: { [className: string]: { fill?: string; stroke?: string; strokeWidth?: number } }
    classToText?: { [className: string]: string }
    category?: string // Column name in data containing categories
}

/**
 * Categorical map object
 */
export interface CategoricalMap extends EurostatMap {
    classToStyle(): { [className: string]: any }
    classToStyle(mapping: { [className: string]: any }): this

    classToText(): { [className: string]: string }
    classToText(mapping: { [className: string]: string }): this
}

// ==================== Bivariate Choropleth Map Types ====================

/**
 * Configuration for bivariate choropleth maps
 */
export interface BivariateChoroplethConfig extends MapConfig {
    // Two statistical datasets
    stat1?: StatConfig
    stat2?: StatConfig

    // Classification for both variables
    numberOfClasses?: number
    classificationMethod?: 'quantile' | 'ckmeans' | 'jenks' | 'equinter'

    // Color schemes
    colors?: string[][]
    startColor?: string
    endColor1?: string
    endColor2?: string
}

/**
 * Bivariate choropleth map object
 */
export interface BivariateChoroplethMap extends EurostatMap {
    stat1(): StatConfig
    stat1(config: StatConfig): this

    stat2(): StatConfig
    stat2(config: StatConfig): this
}

// ==================== Trivariate Choropleth Map Types ====================

/**
 * Configuration for trivariate (ternary) choropleth maps
 */
export interface TrivariateChoroplethConfig extends MapConfig {
    // Three statistical datasets
    stat1?: StatConfig
    stat2?: StatConfig
    stat3?: StatConfig

    // Ternary color scheme
    colors?: [string, string, string] // Three corner colors
}

// ==================== Composition Map Types ====================

/**
 * Configuration for pie chart maps
 */
export interface PieChartConfig extends MapConfig {
    // Size settings
    size?: number
    sizeMax?: number
    sizeMin?: number

    // Pie settings
    pieChartFillFunction?: (category: string) => string
    pieChartInnerRadius?: number

    // Categories
    categories?: string[]
}

/**
 * Configuration for sparkline maps
 */
export interface SparklineConfig extends MapConfig {
    sparklineYears?: number[]
    sparklineWidth?: number
    sparklineHeight?: number
    sparklineStrokeWidth?: number
    sparklineMinValue?: number
    sparklineMaxValue?: number
}

/**
 * Configuration for waffle maps
 */
export interface WaffleConfig extends MapConfig {
    waffleSize?: number
    waffleSpacing?: number
    waffleRows?: number
    waffleCols?: number
}

// ==================== Flow Map Types ====================

/**
 * Configuration for flow maps
 */
export interface FlowMapConfig extends MapConfig {
    // Flow data structure: array of { from: string, to: string, value: number }
    flowData?: Array<{ from: string; to: string; value: number; [key: string]: any }>

    // Flow styling
    flowWidthMax?: number
    flowWidthMin?: number
    flowColor?: string
    flowOpacity?: number

    // Arrow settings
    showArrows?: boolean
    arrowSize?: number
}

// ==================== Pattern Fill Options ====================

/**
 * Options for fill pattern definitions
 */
export interface FillPatternOptions {
    shape?: 'circle' | 'square'
    patternSize?: number
    minSize?: number
    maxSize?: number
    bckColor?: string
    symbColor?: string
}

// ==================== Main Factory Function ====================

/**
 * Main factory function to create maps
 *
 * @param type - The type of map to create
 * @param config - Configuration object
 * @returns A map object with builder pattern methods
 *
 * @example
 * ```typescript
 * import eurostatmap from 'eurostatmap';
 *
 * const map = eurostatmap.map('choropleth', {
 *   title: 'Population Density',
 *   stat: { eurostatDatasetCode: 'demo_r_d3dens' }
 * });
 * map.build();
 * ```
 */
export function map(type: 'choropleth' | 'ch', config?: ChoroplethConfig): ChoroplethMap
export function map(type: 'proportionalSymbol' | 'proportionalSymbols' | 'ps', config?: ProportionalSymbolConfig): ProportionalSymbolMap
export function map(type: 'categorical' | 'ct', config?: CategoricalConfig): CategoricalMap
export function map(type: 'bivariateChoropleth' | 'chbi', config?: BivariateChoroplethConfig): BivariateChoroplethMap
export function map(type: 'trivariateChoropleth' | 'ternary' | 'chtri', config?: TrivariateChoroplethConfig): EurostatMap
export function map(type: 'pieChart' | 'pie', config?: PieChartConfig): EurostatMap
export function map(type: 'sparkline' | 'spark' | 'sparklines', config?: SparklineConfig): EurostatMap
export function map(type: 'flow' | 'flowmap', config?: FlowMapConfig): EurostatMap
export function map(type: MapType, config?: MapConfig): EurostatMap

// ==================== Utility Functions ====================

/**
 * Get a function that defines fill patterns for legends
 *
 * @param opts - Pattern options
 * @returns Function that creates pattern definitions
 */
export function getFillPatternDefinitionFunction(opts?: FillPatternOptions): (svg: any, numberOfClasses: number) => void

/**
 * @deprecated Use getFillPatternDefinitionFunction instead
 */
export function getFillPatternDefinitionFun(opts?: FillPatternOptions): (svg: any, numberOfClasses: number) => void

/**
 * Get default labels for the map
 */
export function getDefaultLabels(): { [key: string]: string }

/**
 * Project coordinates from map pixel space to geographic coordinates
 *
 * @param map - The map object
 * @param x - X pixel coordinate
 * @param y - Y pixel coordinate
 * @returns [longitude, latitude]
 */
export function projectFromMap(map: EurostatMap, x: number, y: number): [number, number]

/**
 * Project geographic coordinates to map pixel space
 *
 * @param map - The map object
 * @param lon - Longitude
 * @param lat - Latitude
 * @returns [x, y] pixel coordinates
 */
export function projectToMap(map: EurostatMap, lon: number, lat: number): [number, number]

/**
 * Library version
 */
export const version: string

// ==================== Default Export ====================

declare const eurostatmap: {
    map: typeof map
    getFillPatternDefinitionFunction: typeof getFillPatternDefinitionFunction
    getFillPatternDefinitionFun: typeof getFillPatternDefinitionFun
    getDefaultLabels: typeof getDefaultLabels
    projectFromMap: typeof projectFromMap
    projectToMap: typeof projectToMap
    version: typeof version
}

export default eurostatmap
