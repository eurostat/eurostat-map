import type { MapInstance } from '../../core/MapInstance'
import type { FlowGraph, FlowCurvatureSettings, FlowWidthGradientSettings, FlowBundleSettings } from './FlowMapConfig'

/**
 * Flow map type.
 */
export interface FlowMap extends MapInstance {
    flowGraph(): FlowGraph
    flowGraph(v: FlowGraph): this

    flowSettings(): {
        color: string
        regionColors: string[]
        regionLabels: string[]
        arrows: boolean
        arrowScale: number
        maxWidth: number
        minWidth: number
        outlines: boolean
        outlineWidth: number
        outlineColor: string
        colorGradient: boolean
        stack: boolean
        nodes: boolean
        nodeType: 'circle' | 'donut'
        labelOffsets: { x: number; y: number }
        lineType: 'curved' | 'straight' | 'sankey'
        nodeSizeScale: any
        opacity: number
        internal: boolean
        topLocations: number
        topLocationsType: 'sum' | 'origin' | 'destination'
        curvatureSettings: FlowCurvatureSettings
        order: any
        widthGradient: boolean
        opacityGradient: boolean
        widthGradientSettings: FlowWidthGradientSettings
        bidirectional: boolean
        edgeBundling: boolean
        bundleSettings: FlowBundleSettings
    }
    flowSettings(v: {
        color?: string
        regionColors?: string[]
        regionLabels?: string[]
        arrows?: boolean
        arrowScale?: number
        maxWidth?: number
        minWidth?: number
        outlines?: boolean
        outlineWidth?: number
        outlineColor?: string
        colorGradient?: boolean
        stack?: boolean
        nodes?: boolean
        nodeType?: 'circle' | 'donut'
        labelOffsets?: { x: number; y: number }
        lineType?: 'curved' | 'straight' | 'sankey'
        nodeSizeScale?: any
        opacity?: number
        internal?: boolean
        topLocations?: number
        topLocationsType?: 'sum' | 'origin' | 'destination'
        curvatureSettings?: FlowCurvatureSettings
        order?: any
        widthGradient?: boolean
        opacityGradient?: boolean
        widthGradientSettings?: FlowWidthGradientSettings
        bidirectional?: boolean
        edgeBundling?: boolean
        bundleSettings?: FlowBundleSettings
    }): this

    /** @deprecated Use flowSettings({ color }) */
    flowColor(): string
    /** @deprecated Use flowSettings({ color }) */
    flowColor(v: string): this

    /** @deprecated Use flowSettings({ regionColors }) */
    flowRegionColors(): string[]
    /** @deprecated Use flowSettings({ regionColors }) */
    flowRegionColors(v: string[]): this

    /** @deprecated Use flowSettings({ regionLabels }) */
    flowRegionLabels(): string[]
    /** @deprecated Use flowSettings({ regionLabels }) */
    flowRegionLabels(v: string[]): this

    /** @deprecated Use flowSettings({ arrows }) */
    flowArrows(): boolean
    /** @deprecated Use flowSettings({ arrows }) */
    flowArrows(v: boolean): this

    /** @deprecated Use flowSettings({ arrowScale }) */
    flowArrowScale(): number
    /** @deprecated Use flowSettings({ arrowScale }) */
    flowArrowScale(v: number): this

    /** @deprecated Use flowSettings({ maxWidth }) */
    flowMaxWidth(): number
    /** @deprecated Use flowSettings({ maxWidth }) */
    flowMaxWidth(v: number): this

    /** @deprecated Use flowSettings({ minWidth }) */
    flowMinWidth(): number
    /** @deprecated Use flowSettings({ minWidth }) */
    flowMinWidth(v: number): this

    /** @deprecated Use flowSettings({ outlines }) */
    flowOutlines(): boolean
    /** @deprecated Use flowSettings({ outlines }) */
    flowOutlines(v: boolean): this

    /** @deprecated Use flowSettings({ outlineWidth }) */
    flowOutlineWidth(): number
    /** @deprecated Use flowSettings({ outlineWidth }) */
    flowOutlineWidth(v: number): this

    /** @deprecated Use flowSettings({ outlineColor }) */
    flowOutlineColor(): string
    /** @deprecated Use flowSettings({ outlineColor }) */
    flowOutlineColor(v: string): this

    /** @deprecated Use flowSettings({ colorGradient }) */
    flowColorGradient(): boolean
    /** @deprecated Use flowSettings({ colorGradient }) */
    flowColorGradient(v: boolean): this

    /** @deprecated Use flowSettings({ stack }) */
    flowStack(): boolean
    /** @deprecated Use flowSettings({ stack }) */
    flowStack(v: boolean): this

    /** @deprecated Use flowSettings({ nodes }) */
    flowNodes(): boolean
    /** @deprecated Use flowSettings({ nodes }) */
    flowNodes(v: boolean): this

    /** @deprecated Use flowSettings({ nodeType }) */
    flowNodeType(): 'circle' | 'donut'
    /** @deprecated Use flowSettings({ nodeType }) */
    flowNodeType(v: 'circle' | 'donut'): this

    /** @deprecated Use flowSettings({ labelOffsets }) */
    flowLabelOffsets(): { x: number; y: number }
    /** @deprecated Use flowSettings({ labelOffsets }) */
    flowLabelOffsets(v: { x: number; y: number }): this

    /** @deprecated Use flowSettings({ lineType }) */
    flowLineType(): 'curved' | 'straight' | 'sankey'
    /** @deprecated Use flowSettings({ lineType }) */
    flowLineType(v: 'curved' | 'straight' | 'sankey'): this

    /** @deprecated Use flowSettings({ nodeSizeScale }) */
    flowNodeSizeScale(): any
    /** @deprecated Use flowSettings({ nodeSizeScale }) */
    flowNodeSizeScale(v: any): this

    /** @deprecated Use flowSettings({ opacity }) */
    flowOpacity(): number
    /** @deprecated Use flowSettings({ opacity }) */
    flowOpacity(v: number): this

    /** @deprecated Use flowSettings({ internal }) */
    flowInternal(): boolean
    /** @deprecated Use flowSettings({ internal }) */
    flowInternal(v: boolean): this

    /** @deprecated Use flowSettings({ topLocations }) */
    flowTopLocations(): number
    /** @deprecated Use flowSettings({ topLocations }) */
    flowTopLocations(v: number): this

    /** @deprecated Use flowSettings({ topLocationsType }) */
    flowTopLocationsType(): 'sum' | 'origin' | 'destination'
    /** @deprecated Use flowSettings({ topLocationsType }) */
    flowTopLocationsType(v: 'sum' | 'origin' | 'destination'): this

    /** @deprecated Use flowSettings({ curvatureSettings }) */
    flowCurvatureSettings(): FlowCurvatureSettings
    /** @deprecated Use flowSettings({ curvatureSettings }) */
    flowCurvatureSettings(v: FlowCurvatureSettings): this

    /** @deprecated Use flowSettings({ order }) */
    flowOrder(): any
    /** @deprecated Use flowSettings({ order }) */
    flowOrder(v: any): this

    /** @deprecated Use flowSettings({ widthGradient }) */
    flowWidthGradient(): boolean
    /** @deprecated Use flowSettings({ widthGradient }) */
    flowWidthGradient(v: boolean): this

    /** @deprecated Use flowSettings({ opacityGradient }) */
    flowOpacityGradient(): boolean
    /** @deprecated Use flowSettings({ opacityGradient }) */
    flowOpacityGradient(v: boolean): this

    /** @deprecated Use flowSettings({ widthGradientSettings }) */
    flowWidthGradientSettings(): FlowWidthGradientSettings
    /** @deprecated Use flowSettings({ widthGradientSettings }) */
    flowWidthGradientSettings(v: FlowWidthGradientSettings): this

    /** @deprecated Use flowSettings({ bidirectional }) */
    flowBidirectional(): boolean
    /** @deprecated Use flowSettings({ bidirectional }) */
    flowBidirectional(v: boolean): this

    /** @deprecated Use flowSettings({ edgeBundling }) */
    flowEdgeBundling(): boolean
    /** @deprecated Use flowSettings({ edgeBundling }) */
    flowEdgeBundling(v: boolean): this

    /** @deprecated Use flowSettings({ bundleSettings }) */
    flowBundleSettings(): FlowBundleSettings
    /** @deprecated Use flowSettings({ bundleSettings }) */
    flowBundleSettings(v: FlowBundleSettings): this
}
