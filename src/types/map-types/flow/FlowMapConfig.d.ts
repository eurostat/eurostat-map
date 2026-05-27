import type { MapConfig } from '../../core/MapConfig'

/**
 * A flow node in the flow graph.
 */
export interface FlowNode {
    /** Id. */
    id: string
    /** Name. */
    name?: string
    /** X. */
    x?: number
    /** Y. */
    y?: number
    /** Value. */
    value?: number
    [key: string]: any
}

/**
 * A flow link between two nodes.
 */
export interface FlowLink {
    /** Source. */
    source: string | FlowNode
    /** Target. */
    target: string | FlowNode
    /** Value. */
    value: number
    /** Origin id. */
    originId?: string
    /** Dest id. */
    destId?: string
    [key: string]: any
}

/**
 * Graph input used by flow maps.
 */
export interface FlowGraph {
    /** Nodes. */
    nodes: FlowNode[]
    /** Links. */
    links: FlowLink[]
}

/**
 * Curvature settings used for curved/sankey flow rendering.
 */
export interface FlowCurvatureSettings {
    /** Gap x. */
    gapX?: number
    /** Pad x. */
    padX?: number
    /** Pad y. */
    padY?: number
    /** Bump y. */
    bumpY?: number
    /** Curvature. */
    curvature?: number
}

/**
 * Width gradient settings for tapered flows.
 */
export interface FlowWidthGradientSettings {
    /** Start ratio. */
    startRatio?: number
    /** Samples. */
    samples?: number
    /** Min start width. */
    minStartWidth?: number
    /** Cap end. */
    capEnd?: boolean
    /** Curvature follow. */
    curvatureFollow?: boolean
}

/**
 * Force settings for optional edge bundling.
 */
export interface FlowBundleSettings {
    /** Alpha decay. */
    alphaDecay?: number
    /** Charge strength. */
    chargeStrength?: number
    /** Distance max. */
    distanceMax?: number | null
    /** Link strength. */
    linkStrength?: number
    /** Link iterations. */
    linkIterations?: number
}

/**
 * Configuration for flow maps.
 */
export interface FlowMapConfig extends MapConfig {
    /** Flow graph. */
    flowGraph?: FlowGraph

    /** Flow color. */
    flowColor?: string
    /** Flow region colors. */
    flowRegionColors?: string[]
    /** Flow region labels. */
    flowRegionLabels?: string[]
    /** Flow arrows. */
    flowArrows?: boolean
    /** Flow arrow scale. */
    flowArrowScale?: number
    /** Flow max width. */
    flowMaxWidth?: number
    /** Flow min width. */
    flowMinWidth?: number
    /** Flow outlines. */
    flowOutlines?: boolean
    /** Flow outline width. */
    flowOutlineWidth?: number
    /** Flow outline color. */
    flowOutlineColor?: string
    /** Flow color gradient. */
    flowColorGradient?: boolean
    /** Flow stack. */
    flowStack?: boolean
    /** Flow nodes. */
    flowNodes?: boolean
    /** Flow node type. */
    flowNodeType?: 'circle' | 'donut'
    /** Flow label offsets. */
    flowLabelOffsets?: { x?: number; y?: number }
    /** Flow line type. */
    flowLineType?: 'curved' | 'straight' | 'sankey'
    flowNodeSizeScale?: (value: number) => number
    /** Flow opacity. */
    flowOpacity?: number
    /** Flow internal. */
    flowInternal?: boolean
    /** Flow top locations. */
    flowTopLocations?: number
    /** Flow top locations type. */
    flowTopLocationsType?: 'sum' | 'origin' | 'destination'
    /** Flow curvature settings. */
    flowCurvatureSettings?: FlowCurvatureSettings
    flowOrder?: (a: any, b: any) => number
    /** Flow width gradient. */
    flowWidthGradient?: boolean
    /** Flow opacity gradient. */
    flowOpacityGradient?: boolean
    /** Flow width gradient settings. */
    flowWidthGradientSettings?: FlowWidthGradientSettings
    /** Flow bidirectional. */
    flowBidirectional?: boolean
    /** Flow edge bundling. */
    flowEdgeBundling?: boolean
    /** Flow bundle settings. */
    flowBundleSettings?: FlowBundleSettings
}
