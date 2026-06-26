/**
 * TypeScript definitions for eurostat-map
 */

// ==================== Core Type Imports (needed for local use in function signatures) ====================

import type { MapConfig } from './core/MapConfig'
import type { MapType } from './layers/MapType'
import type { MapInstance } from './core/MapInstance'

// Choropleth map types
import type { ChoroplethConfig } from './layers/choropleth/ChoroplethConfig'
import type { ChoroplethMap } from './layers/choropleth/ChoroplethMap'
import type { ValueByAlphaConfig } from './layers/choropleth/ValueByAlphaConfig'
import type { ValueByAlphaMap } from './layers/choropleth/ValueByAlphaMap'
import type { BivariateChoroplethConfig } from './layers/choropleth/BivariateChoroplethConfig'
import type { BivariateChoroplethMap } from './layers/choropleth/BivariateChoroplethMap'
import type { TrivariateChoroplethConfig, TrivariateTernarySettings } from './layers/choropleth/TrivariateChoroplethConfig'
import type { TrivariateChoroplethMap } from './layers/choropleth/TrivariateChoroplethMap'

// Categorical map types
import type { CategoricalMapConfig } from './layers/CategoricalMapConfig'
import type { CategoricalMap } from './layers/CategoricalMap'

// Proportional symbol map types
import type { ProportionalSymbolConfig } from './layers/proportional-symbol/ProportionalSymbolConfig'
import type { ProportionalSymbolMap } from './layers/proportional-symbol/ProportionalSymbolMap'
import type { MushroomMapConfig } from './layers/proportional-symbol/mushroom/MushroomMapConfig'
import type { MushroomMap } from './layers/proportional-symbol/mushroom/MushroomMap'

// Composition map types
import type { CompositionStatConfig } from './layers/composition/CompositionStatConfig'
import type { CoxcombMapConfig } from './layers/composition/coxcomb/CoxcombMapConfig'
import type { CoxcombMap } from './layers/composition/coxcomb/CoxcombMap'
import type { CoxcombStatConfig } from './layers/composition/coxcomb/CoxcombStatConfig'
import type { BarMapConfig } from './layers/composition/bar/BarMapConfig'
import type { BarMap } from './layers/composition/bar/BarMap'
import type { PieMapConfig } from './layers/composition/pie/PieMapConfig'
import type { PieMap } from './layers/composition/pie/PieMap'
import type { StripeMapConfig } from './layers/composition/stripe/StripeMapConfig'
import type { StripeMap } from './layers/composition/stripe/StripeMap'
import type { WaffleMapConfig } from './layers/composition/waffle/WaffleMapConfig'
import type { WaffleMap } from './layers/composition/waffle/WaffleMap'

// Spark map types
import type { SparkMapConfig } from './layers/spark/SparkMapConfig'
import type { SparkMap } from './layers/spark/SparkMap'
import type { SparkStatConfig } from './layers/spark/SparkStatConfig'

// Flow map types
import type { FlowMapConfig } from './layers/flow/FlowMapConfig'
import type { FlowMap } from './layers/flow/FlowMap'

// ==================== Core Type Exports ====================

export type { MapConfig, MapType, MapInstance }
export type EurostatMap = MapInstance
export type { TooltipConfig } from './core/TooltipConfig'
export type { LegendConfig } from './legend/LegendConfig'
export type { StatConfig } from './core/stat/StatConfig'
export type { EncodingConfig } from './core/encoding/EncodingConfig'
export type { StatData } from './core/stat/StatData'
export type { InsetConfig } from './core/InsetConfig'
export type { CoastalMarginSettings } from './core/decoration/CoastalMarginSettings'
export type { ScalebarConfig } from './core/decoration/ScalebarConfig'
export type { StampConfig } from './core/decoration/StampConfig'
export type { GridCartogramSettings, GridCartogramMargins } from './core/GridCartogramSettings'
export type { DorlingSettings, DorlingStrength } from './core/DorlingSettings'
export type { MinimapConfig } from './core/minimaps'
export type { LocationConfig } from './core/locations'
export type { GeometriesClass } from './core/geo/geometries'
export type { Layer } from './core/layer/Layer'
export type { LayerConfig } from './core/layer/LayerConfig'
export type { LayerRole } from './core/layer/LayerRole'

// ==================== Legend Configuration Type Exports ====================

// Main legend types
export type { CategoricalLegendConfig } from './legend/CategoricalLegendConfig'
export type { MushroomLegendConfig } from './legend/MushroomLegendConfig'
export type { MushroomSizeLegendConfig, MushroomColorLegendConfig } from './legend/MushroomLegendConfig'
export type { PatternFillLegendConfig } from './legend/PatternFillLegendConfig'

// Choropleth legend types
export type { ChoroplethLegendConfig } from './legend/choropleth/ChoroplethLegendConfig'
export type { BivariateLegendConfig } from './legend/choropleth/BivariateLegendConfig'
export type { HistogramLegendConfig } from './legend/choropleth/HistogramLegendConfig'
export type { TrivariateLegendConfig } from './legend/choropleth/TrivariateLegendConfig'

// Composition legend types
export type { BarChartLegendConfig } from './legend/composition/BarChartLegendConfig'
export type { BarChartSizeLegendConfig, BarChartColorLegendConfig } from './legend/composition/BarChartLegendConfig'
export type { CoxcombLegendConfig } from './legend/composition/CoxcombLegendConfig'
export type { CoxcombSizeLegendConfig, CoxcombColorLegendConfig, CoxcombTimeLegendConfig } from './legend/composition/CoxcombLegendConfig'
export type { PieChartLegendConfig } from './legend/composition/PieChartLegendConfig'
export type { PieChartSizeLegendConfig, PieChartColorLegendConfig } from './legend/composition/PieChartLegendConfig'
export type { WaffleLegendConfig } from './legend/composition/WaffleLegendConfig'
export type { WaffleSizeLegendConfig, WaffleColorLegendConfig } from './legend/composition/WaffleLegendConfig'
export type { StripeCompositionLegendConfig } from './legend/composition/StripeCompositionLegendConfig'
export type {
    SparklineLegendConfig,
    SparklineScaleLegendConfig,
    SparklineColorLegendConfig,
    SparklineNoDataLegendConfig,
} from './legend/composition/SparklineLegendConfig'

// Flow legend types
export type { FlowMapLegendConfig } from './legend/flow/FlowMapLegendConfig'
export type { FlowWidthLegendConfig, NodeSizeLegendConfig, FlowColorLegendConfig, RegionColorLegendConfig } from './legend/flow/FlowMapLegendConfig'

// Proportional symbol legend types
export type { ProportionalSymbolsLegendConfig } from './legend/proportional-symbol/ProportionalSymbolsLegendConfig'
export type {
    ProportionalSymbolSizeLegendConfig,
    ProportionalSymbolColorLegendConfig,
} from './legend/proportional-symbol/ProportionalSymbolsLegendConfig'

// ==================== Map Type Exports ====================

// Choropleth map types
export type {
    ChoroplethConfig,
    ChoroplethMap,
    ValueByAlphaConfig,
    ValueByAlphaMap,
    BivariateChoroplethConfig,
    BivariateChoroplethMap,
    TrivariateChoroplethConfig,
    TrivariateTernarySettings,
    TrivariateChoroplethMap,
}

// Categorical map types
export type { CategoricalMapConfig, CategoricalMap }

// Proportional symbol map types
export type { ProportionalSymbolConfig, ProportionalSymbolMap, MushroomMapConfig, MushroomMap }

// Composition map types
export type {
    CompositionStatConfig,
    CoxcombMapConfig,
    CoxcombMap,
    CoxcombStatConfig,
    BarMapConfig,
    BarMap,
    PieMapConfig,
    PieMap,
    StripeMapConfig,
    StripeMap,
    WaffleMapConfig,
    WaffleMap,
}

// Spark map types
export type { SparkMapConfig, SparkMap, SparkStatConfig }

// Flow map types
export type { FlowMapConfig, FlowMap }
export type {
    FlowNode,
    FlowLink,
    FlowGraph,
    FlowCurvatureSettings,
    FlowWidthGradientSettings,
    FlowBundleSettings,
} from './layers/flow/FlowMapConfig'

// ==================== Pattern Fill Options ====================

/**
 * Options for fill pattern definitions
 */
export interface FillPatternOptions {
    /** Shape. */
    shape?: 'circle' | 'square'
    /** Pattern size. */
    patternSize?: number
    /** Min size. */
    minSize?: number
    /** Max size. */
    maxSize?: number
    /** Bck color. */
    bckColor?: string
    /** Symb color. */
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
export function map(): MapInstance
export function map(type: 'choropleth' | 'ch', config?: ChoroplethConfig): ChoroplethMap
export function map(type: 'proportionalSymbol' | 'proportionalSymbols' | 'ps', config?: ProportionalSymbolConfig): ProportionalSymbolMap
export function map(type: 'categorical' | 'ct', config?: CategoricalMapConfig): CategoricalMap
export function map(type: 'bivariateChoropleth' | 'chbi', config?: BivariateChoroplethConfig): BivariateChoroplethMap
export function map(type: 'trivariateChoropleth' | 'ternary' | 'chtri', config?: TrivariateChoroplethConfig): TrivariateChoroplethMap
export function map(type: 'alpha' | 'valueByAlpha', config?: ValueByAlphaConfig): ValueByAlphaMap
export function map(type: 'coxcomb' | 'polar', config?: CoxcombMapConfig): CoxcombMap
export function map(type: 'bar' | 'barComposition', config?: BarMapConfig): BarMap
export function map(type: 'stripeComposition' | 'scomp' | 'stripe', config?: StripeMapConfig): StripeMap
export function map(type: 'waffle', config?: WaffleMapConfig): WaffleMap
export function map(type: 'mushroom', config?: MushroomMapConfig): MushroomMap
export function map(type: 'pieChart' | 'pie', config?: PieMapConfig): PieMap
export function map(type: 'sparkline' | 'spark' | 'sparklines', config?: SparkMapConfig): SparkMap
export function map(type: 'flow' | 'flowmap', config?: FlowMapConfig): FlowMap
export function map(type: MapType, config?: MapConfig): MapInstance

// ==================== Utility Functions ====================

/**
 * Get a function that defines fill patterns for legends
 *
 * @param opts - Pattern options
 * @returns Function that creates pattern definitions
 */
export function getFillPatternDefinitionFunction(opts?: FillPatternOptions): (svg: any, numberOfClasses: number) => void

/**
 * Get default labels for the map
 */
export function getDefaultLabels(): { [key: string]: any }

/**
 * Project coordinates from map pixel space to geographic coordinates
 *
 * @param map - The map object
 * @param x - X pixel coordinate
 * @param y - Y pixel coordinate
 * @returns [longitude, latitude]
 */
export function projectFromMap(map: MapInstance, x: number, y: number): [number, number]

/**
 * Project geographic coordinates to map pixel space
 *
 * @param map - The map object
 * @param lon - Longitude
 * @param lat - Latitude
 * @returns [x, y] pixel coordinates
 */
export function projectToMap(map: MapInstance, lon: number, lat: number): [number, number]

/**
 * Library version
 */
export const version: string

// ==================== Default Export ====================

declare const eurostatmap: {
    /** Map. */
    map: typeof map
    /** Get fill pattern definition function. */
    getFillPatternDefinitionFunction: typeof getFillPatternDefinitionFunction
    /** Get default labels. */
    getDefaultLabels: typeof getDefaultLabels
    /** Project from map. */
    projectFromMap: typeof projectFromMap
    /** Project to map. */
    projectToMap: typeof projectToMap
    /** Version. */
    version: typeof version
}

export default eurostatmap
