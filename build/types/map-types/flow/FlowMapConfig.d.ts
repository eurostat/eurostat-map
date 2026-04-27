import type { MapConfig } from '../../core/MapConfig'

/**
 * A flow node in the flow graph.
 */
export interface FlowNode {
    id: string
    name?: string
    x?: number
    y?: number
    value?: number
    [key: string]: any
}

/**
 * A flow link between two nodes.
 */
export interface FlowLink {
    source: string | FlowNode
    target: string | FlowNode
    value: number
    originId?: string
    destId?: string
    [key: string]: any
}

/**
 * Graph input used by flow maps.
 */
export interface FlowGraph {
    nodes: FlowNode[]
    links: FlowLink[]
}

/**
 * Curvature settings used for curved/sankey flow rendering.
 */
export interface FlowCurvatureSettings {
    gapX?: number
    padX?: number
    padY?: number
    bumpY?: number
    curvature?: number
}

/**
 * Width gradient settings for tapered flows.
 */
export interface FlowWidthGradientSettings {
    startRatio?: number
    samples?: number
    minStartWidth?: number
    capEnd?: boolean
    curvatureFollow?: boolean
}

/**
 * Force settings for optional edge bundling.
 */
export interface FlowBundleSettings {
    alphaDecay?: number
    chargeStrength?: number
    distanceMax?: number | null
    linkStrength?: number
    linkIterations?: number
}

/**
 * Configuration for flow maps.
 */
export interface FlowMapConfig extends MapConfig {
    flowGraph?: FlowGraph

    flowColor?: string
    flowRegionColors?: string[]
    flowRegionLabels?: string[]
    flowArrows?: boolean
    flowArrowScale?: number
    flowMaxWidth?: number
    flowMinWidth?: number
    flowOutlines?: boolean
    flowOutlineWidth?: number
    flowOutlineColor?: string
    flowColorGradient?: boolean
    flowStack?: boolean
    flowNodes?: boolean
    flowNodeType?: 'circle' | 'donut'
    flowLabelOffsets?: { x?: number; y?: number }
    flowLineType?: 'curved' | 'straight' | 'sankey'
    flowNodeSizeScale?: (value: number) => number
    flowOpacity?: number
    flowInternal?: boolean
    flowTopLocations?: number
    flowTopLocationsType?: 'sum' | 'origin' | 'destination'
    flowCurvatureSettings?: FlowCurvatureSettings
    flowOrder?: (a: any, b: any) => number
    flowWidthGradient?: boolean
    flowOpacityGradient?: boolean
    flowWidthGradientSettings?: FlowWidthGradientSettings
    flowBidirectional?: boolean
    flowEdgeBundling?: boolean
    flowBundleSettings?: FlowBundleSettings
}
