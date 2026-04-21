/**
 * TypeScript definitions for eurostat-map
 * Comprehensive type definitions for all map types and configurations
 */

// ==================== Core Configuration Types ====================

/**
 * Base configuration for all map types
 */
export interface MapConfig {
    // Container settings
    svgId?: string
    containerId?: string

    // Geographic settings
    proj?: string // Projection: '3035', '3857', '4326', 'laea', 'web', etc.
    scale?: number | string
    nutsLevel?: number // 0, 1, 2, 3
    nutsYear?: number | string
    geoCenter?: [number, number]
    pixSize?: number

    // Geometry settings
    geo?: string // Geographic focus (e.g., 'EUR', 'ES', 'FR')

    // Map dimensions
    width?: number
    height?: number

    // Visual settings
    title?: string
    subtitle?: string
    backgroundColor?: string
    backgroundStyle?: string

    // Statistical data configuration
    stat?: StatConfig

    // Legend configuration
    legend?: LegendConfig

    // Tooltip configuration
    tooltip?: TooltipConfig

    // Insets (small additional maps)
    insets?: InsetConfig[]

    // Zoom and pan settings
    zoomExtent?: [number, number]

    // UI Controls
    showBtns?: boolean // Show zoom buttons

    // Coastal margin
    coastal?: boolean
    coastalMarginWidth?: number
    coastalMarginColor?: string

    // Graticule
    drawGraticule?: boolean
    graticuleStyle?: any

    // Borders
    borderWidth?: number
    borderColor?: string

    // Labels
    labelling?: boolean
    labelSizeThreshold?: number
    labelOpacity?: number

    // Bottom text
    bottomText?: string
    botTxtFontSize?: number
    botTxtPadding?: number
    botTxtTooltipMessage?: string

    // Source and footnote
    footnote?: string
    source?: string

    // Logo
    logoURL?: string

    // Callbacks
    onBuild?: (map: EurostatMap) => void

    // Allow additional properties for extensibility
    [key: string]: any
}

/**
 * All supported map types
 */
export type MapType =
    | 'choropleth'
    | 'ch'
    | 'proportionalSymbol'
    | 'proportionalSymbols'
    | 'ps'
    | 'categorical'
    | 'ct'
    | 'bivariateChoropleth'
    | 'chbi'
    | 'trivariateChoropleth'
    | 'ternary'
    | 'chtri'
    | 'stripeComposition'
    | 'scomp'
    | 'stripe'
    | 'pieChart'
    | 'pie'
    | 'sparkline'
    | 'spark'
    | 'sparklines'
    | 'flow'
    | 'flowmap'
    | 'coxcomb'
    | 'polar'
    | 'alpha'
    | 'valueByAlpha'
    | 'mushroom'
    | 'waffle'
    | 'bar'
    | 'barComposition'

// ==================== Statistical Data Configuration ====================

/**
 * Configuration for statistical data sources
 */
export interface StatConfig {
    // Eurostat API data
    eurostatDatasetCode?: string
    filters?: { [key: string]: string }
    unitText?: string

    // CSV data
    csvURL?: string
    geoCol?: string
    valueCol?: string

    // Custom data (set via statData().setData())

    [key: string]: any
}

// ==================== Legend Configuration ====================

/**
 * Configuration for map legends
 */
export interface LegendConfig {
    x?: number
    y?: number
    width?: number
    height?: number

    title?: string
    titleWidth?: number
    titleFontSize?: number

    // Box styling
    boxWidth?: number
    boxHeight?: number
    boxPadding?: number
    boxCornerRadius?: number

    // Shape styling (for proportional symbol legends)
    shapeWidth?: number
    shapeHeight?: number
    shapePadding?: number

    // Label styling
    labelFontSize?: number
    labelOffset?: number
    labelWrap?: number
    labelDecimalPlaces?: number

    // Orientation
    orientation?: 'vertical' | 'horizontal'
    ascending?: boolean

    // Cells (for manual legend specification)
    cells?: any[]

    // No data label
    noData?: boolean
    noDataText?: string

    [key: string]: any
}

// ==================== Tooltip Configuration ====================

/**
 * Configuration for tooltips
 */
export interface TooltipConfig {
    textFunction?: (region: any, map: EurostatMap) => string
    omitRegions?: string[]
    maxWidth?: number
    fontSize?: number

    [key: string]: any
}

// ==================== Inset Configuration ====================

/**
 * Configuration for map insets (smaller additional maps)
 */
export interface InsetConfig {
    geo?: string // Geographic code (e.g., 'MT', 'PT20', 'CARIB')
    title?: string
    scale?: string | number
    width?: number
    height?: number
    x?: number
    y?: number
    proj?: string

    [key: string]: any
}

// ==================== Main Map Interface ====================

/**
 * Main EurostatMap object with builder pattern methods
 */
export interface EurostatMap {
    // Container methods
    svgId(): string
    svgId(id: string): this

    containerId(): string
    containerId(id: string): this

    // Dimension methods
    width(): number
    width(w: number): this

    height(): number
    height(h: number): this

    // Geographic methods
    scale(): number | string
    scale(s: number | string): this

    proj(): string
    proj(p: string): this

    nutsLevel(): number
    nutsLevel(level: number): this

    nutsYear(): number | string
    nutsYear(year: number | string): this

    geo(): string
    geo(g: string): this

    geoCenter(): [number, number]
    geoCenter(center: [number, number]): this

    pixSize(): number
    pixSize(size: number): this

    // Visual methods
    title(): string
    title(t: string): this

    subtitle(): string
    subtitle(t: string): this

    backgroundColor(): string
    backgroundColor(color: string): this

    // Statistical data methods (overloaded)
    stat(): StatConfig
    stat(config: StatConfig): this
    stat(key: string): any
    stat(key: string, value: any): this

    // Legend methods
    legend(): LegendConfig
    legend(config: LegendConfig): this

    // Tooltip methods
    tooltip(): TooltipConfig
    tooltip(config: TooltipConfig): this

    // Zoom methods
    zoomExtent(): [number, number]
    zoomExtent(extent: [number, number]): this

    // Build and update methods
    build(): this
    update(): this
    updateClassification(): this

    // Data methods
    statData(): StatData
    statData(key: string): StatData

    // Language
    language(): string
    language(lang: string): this

    // Callbacks
    onBuild(): ((map: EurostatMap) => void) | undefined
    onBuild(callback: (map: EurostatMap) => void): this

    // Export methods
    exportSVG(): void

    // Allow additional properties
    [key: string]: any
}

/**
 * Statistical data object
 */
export interface StatData {
    setData(data: { [regionId: string]: number }): this
    getData(): { [regionId: string]: number }
    set(regionId: string, value: number): this
    get(regionId: string): number | undefined

    [key: string]: any
}

// ==================== Choropleth Map Types ====================

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

/**
 * Choropleth map object
 */
export interface ChoroplethMap extends EurostatMap {
    numberOfClasses(): number
    numberOfClasses(n: number): this

    classificationMethod(): string
    classificationMethod(method: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'): this

    thresholds(): number[]
    thresholds(t: number[]): this

    colors(): string[]
    colors(c: string[]): this

    colorFunction(): (t: number) => string
    colorFunction(fn: (t: number) => string): this

    colorSchemeType(): string
    colorSchemeType(type: 'discrete' | 'continuous'): this

    noDataFillStyle(): string
    noDataFillStyle(style: string): this
}

// ==================== Proportional Symbol Map Types ====================

/**
 * Configuration for proportional symbol maps
 */
export interface ProportionalSymbolConfig extends MapConfig {
    symbol?: 'circle' | 'square'
    size?: number
    sizeMin?: number
    sizeMax?: number
    symbolFillStyle?: string
    symbolStrokeStyle?: string
    symbolStrokeWidth?: number

    // Dorling cartogram
    dorling?: boolean
    dorlingIterations?: number

    // Size function
    psCustomSize?: (value: number) => number

    // Scaling
    psScale?: 'sqrt' | 'linear' | 'radial'
}

/**
 * Proportional symbol map object
 */
export interface ProportionalSymbolMap extends EurostatMap {
    symbol(): string
    symbol(s: 'circle' | 'square'): this

    size(): number
    size(s: number): this

    sizeMax(): number
    sizeMax(s: number): this

    sizeMin(): number
    sizeMin(s: number): this

    symbolFillStyle(): string
    symbolFillStyle(style: string): this

    symbolStrokeStyle(): string
    symbolStrokeStyle(style: string): this
}

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
