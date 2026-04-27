import type { MapInstance } from '../../core/MapInstance'
import type {
	FlowGraph,
	FlowCurvatureSettings,
	FlowWidthGradientSettings,
	FlowBundleSettings,
} from './FlowMapConfig'

/**
 * Flow map type.
 */
export interface FlowMap extends MapInstance {
	flowGraph(): FlowGraph
	flowGraph(v: FlowGraph): this

	flowColor(): string
	flowColor(v: string): this

	flowRegionColors(): string[]
	flowRegionColors(v: string[]): this

	flowRegionLabels(): string[]
	flowRegionLabels(v: string[]): this

	flowArrows(): boolean
	flowArrows(v: boolean): this

	flowArrowScale(): number
	flowArrowScale(v: number): this

	flowMaxWidth(): number
	flowMaxWidth(v: number): this

	flowMinWidth(): number
	flowMinWidth(v: number): this

	flowOutlines(): boolean
	flowOutlines(v: boolean): this

	flowOutlineWidth(): number
	flowOutlineWidth(v: number): this

	flowOutlineColor(): string
	flowOutlineColor(v: string): this

	flowColorGradient(): boolean
	flowColorGradient(v: boolean): this

	flowStack(): boolean
	flowStack(v: boolean): this

	flowNodes(): boolean
	flowNodes(v: boolean): this

	flowNodeType(): 'circle' | 'donut'
	flowNodeType(v: 'circle' | 'donut'): this

	flowLabelOffsets(): { x: number; y: number }
	flowLabelOffsets(v: { x: number; y: number }): this

	flowLineType(): 'curved' | 'straight' | 'sankey'
	flowLineType(v: 'curved' | 'straight' | 'sankey'): this

	flowNodeSizeScale(): any
	flowNodeSizeScale(v: any): this

	flowOpacity(): number
	flowOpacity(v: number): this

	flowInternal(): boolean
	flowInternal(v: boolean): this

	flowTopLocations(): number
	flowTopLocations(v: number): this

	flowTopLocationsType(): 'sum' | 'origin' | 'destination'
	flowTopLocationsType(v: 'sum' | 'origin' | 'destination'): this

	flowCurvatureSettings(): FlowCurvatureSettings
	flowCurvatureSettings(v: FlowCurvatureSettings): this

	flowOrder(): any
	flowOrder(v: any): this

	flowWidthGradient(): boolean
	flowWidthGradient(v: boolean): this

	flowOpacityGradient(): boolean
	flowOpacityGradient(v: boolean): this

	flowWidthGradientSettings(): FlowWidthGradientSettings
	flowWidthGradientSettings(v: FlowWidthGradientSettings): this

	flowBidirectional(): boolean
	flowBidirectional(v: boolean): this

	flowEdgeBundling(): boolean
	flowEdgeBundling(v: boolean): this

	flowBundleSettings(): FlowBundleSettings
	flowBundleSettings(v: FlowBundleSettings): this
}
