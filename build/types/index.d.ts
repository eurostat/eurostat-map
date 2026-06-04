/**
 * TypeScript definitions for eurostat-map
 */

// ==================== Core Type Imports (needed for local use in function signatures) ====================

import type { MapConfig } from './core/MapConfig'
import type { MapType } from './map-types/MapType'
import type { MapInstance } from './core/MapInstance'

// Choropleth map types
import type { ChoroplethConfig } from './map-types/choropleth/ChoroplethConfig'
import type { ChoroplethMap } from './map-types/choropleth/ChoroplethMap'
import type { ValueByAlphaConfig } from './map-types/choropleth/ValueByAlphaConfig'
import type { ValueByAlphaMap } from './map-types/choropleth/ValueByAlphaMap'
import type { BivariateChoroplethConfig } from './map-types/choropleth/BivariateChoroplethConfig'
import type { BivariateChoroplethMap } from './map-types/choropleth/BivariateChoroplethMap'
import type { TrivariateChoroplethConfig, TrivariateTernarySettings } from './map-types/choropleth/TrivariateChoroplethConfig'
import type { TrivariateChoroplethMap } from './map-types/choropleth/TrivariateChoroplethMap'

// Categorical map types
import type { CategoricalMapConfig } from './map-types/CategoricalMapConfig'
import type { CategoricalMap } from './map-types/CategoricalMap'

// Proportional symbol map types
import type { ProportionalSymbolConfig } from './map-types/proportional-symbol/ProportionalSymbolConfig'
import type { ProportionalSymbolMap } from './map-types/proportional-symbol/ProportionalSymbolMap'
import type { MushroomMapConfig } from './map-types/proportional-symbol/mushroom/MushroomMapConfig'
import type { MushroomMap } from './map-types/proportional-symbol/mushroom/MushroomMap'

// Composition map types
import type { CompositionStatConfig } from './map-types/composition/CompositionStatConfig'
import type { CoxcombMapConfig } from './map-types/composition/coxcomb/CoxcombMapConfig'
import type { CoxcombMap } from './map-types/composition/coxcomb/CoxcombMap'
import type { CoxcombStatConfig } from './map-types/composition/coxcomb/CoxcombStatConfig'
import type { BarMapConfig } from './map-types/composition/bar/BarMapConfig'
import type { BarMap } from './map-types/composition/bar/BarMap'
import type { PieMapConfig } from './map-types/composition/pie/PieMapConfig'
import type { PieMap } from './map-types/composition/pie/PieMap'
import type { StripeMapConfig } from './map-types/composition/stripe/StripeMapConfig'
import type { StripeMap } from './map-types/composition/stripe/StripeMap'
import type { WaffleMapConfig } from './map-types/composition/waffle/WaffleMapConfig'
import type { WaffleMap } from './map-types/composition/waffle/WaffleMap'

// Spark map types
import type { SparkMapConfig } from './map-types/spark/SparkMapConfig'
import type { SparkMap } from './map-types/spark/SparkMap'
import type { SparkStatConfig } from './map-types/spark/SparkStatConfig'

// Flow map types
import type { FlowMapConfig } from './map-types/flow/FlowMapConfig'
import type { FlowMap } from './map-types/flow/FlowMap'

// ==================== Core Type Exports ====================

export type { MapConfig, MapType, MapInstance }
export type EurostatMap = MapInstance
export type { TooltipConfig } from './core/TooltipConfig'
export type { LegendConfig } from './legend/LegendConfig'
export type { StatConfig } from './core/stat/StatConfig'
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
} from './map-types/flow/FlowMapConfig'

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
