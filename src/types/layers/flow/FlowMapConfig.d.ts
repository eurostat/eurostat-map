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

    /** Grouped flow settings object. */
    flowSettings?: {
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
        labelOffsets?: { x?: number; y?: number }
        lineType?: 'curved' | 'straight' | 'sankey'
        nodeSizeScale?: (value: number) => number
        opacity?: number
        internal?: boolean
        topLocations?: number
        topLocationsType?: 'sum' | 'origin' | 'destination'
        curvatureSettings?: FlowCurvatureSettings
        order?: (a: any, b: any) => number
        widthGradient?: boolean
        opacityGradient?: boolean
        widthGradientSettings?: FlowWidthGradientSettings
        bidirectional?: boolean
        edgeBundling?: boolean
        bundleSettings?: FlowBundleSettings
    }

    /** @deprecated Use flowSettings.color */
    /** Flow color. */
    flowColor?: string
    /** @deprecated Use flowSettings.regionColors */
    /** Flow region colors. */
    flowRegionColors?: string[]
    /** @deprecated Use flowSettings.regionLabels */
    /** Flow region labels. */
    flowRegionLabels?: string[]
    /** @deprecated Use flowSettings.arrows */
    /** Flow arrows. */
    flowArrows?: boolean
    /** @deprecated Use flowSettings.arrowScale */
    /** Flow arrow scale. */
    flowArrowScale?: number
    /** @deprecated Use flowSettings.maxWidth */
    /** Flow max width. */
    flowMaxWidth?: number
    /** @deprecated Use flowSettings.minWidth */
    /** Flow min width. */
    flowMinWidth?: number
    /** @deprecated Use flowSettings.outlines */
    /** Flow outlines. */
    flowOutlines?: boolean
    /** @deprecated Use flowSettings.outlineWidth */
    /** Flow outline width. */
    flowOutlineWidth?: number
    /** @deprecated Use flowSettings.outlineColor */
    /** Flow outline color. */
    flowOutlineColor?: string
    /** @deprecated Use flowSettings.colorGradient */
    /** Flow color gradient. */
    flowColorGradient?: boolean
    /** @deprecated Use flowSettings.stack */
    /** Flow stack. */
    flowStack?: boolean
    /** @deprecated Use flowSettings.nodes */
    /** Flow nodes. */
    flowNodes?: boolean
    /** @deprecated Use flowSettings.nodeType */
    /** Flow node type. */
    flowNodeType?: 'circle' | 'donut'
    /** @deprecated Use flowSettings.labelOffsets */
    /** Flow label offsets. */
    flowLabelOffsets?: { x?: number; y?: number }
    /** @deprecated Use flowSettings.lineType */
    /** Flow line type. */
    flowLineType?: 'curved' | 'straight' | 'sankey'
    /** @deprecated Use flowSettings.nodeSizeScale */
    flowNodeSizeScale?: (value: number) => number
    /** @deprecated Use flowSettings.opacity */
    /** Flow opacity. */
    flowOpacity?: number
    /** @deprecated Use flowSettings.internal */
    /** Flow internal. */
    flowInternal?: boolean
    /** @deprecated Use flowSettings.topLocations */
    /** Flow top locations. */
    flowTopLocations?: number
    /** @deprecated Use flowSettings.topLocationsType */
    /** Flow top locations type. */
    flowTopLocationsType?: 'sum' | 'origin' | 'destination'
    /** @deprecated Use flowSettings.curvatureSettings */
    /** Flow curvature settings. */
    flowCurvatureSettings?: FlowCurvatureSettings
    /** @deprecated Use flowSettings.order */
    flowOrder?: (a: any, b: any) => number
    /** @deprecated Use flowSettings.widthGradient */
    /** Flow width gradient. */
    flowWidthGradient?: boolean
    /** @deprecated Use flowSettings.opacityGradient */
    /** Flow opacity gradient. */
    flowOpacityGradient?: boolean
    /** @deprecated Use flowSettings.widthGradientSettings */
    /** Flow width gradient settings. */
    flowWidthGradientSettings?: FlowWidthGradientSettings
    /** @deprecated Use flowSettings.bidirectional */
    /** Flow bidirectional. */
    flowBidirectional?: boolean
    /** @deprecated Use flowSettings.edgeBundling */
    /** Flow edge bundling. */
    flowEdgeBundling?: boolean
    /** @deprecated Use flowSettings.bundleSettings */
    /** Flow bundle settings. */
    flowBundleSettings?: FlowBundleSettings
}
