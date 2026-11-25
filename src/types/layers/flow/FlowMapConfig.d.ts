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
    /** Where this node's label sits relative to its circle, overriding `flowSettings({ nodeLabelPosition })`. */
    labelPosition?: 'top' | 'bottom' | 'left' | 'right'
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

/** A CSS color or a function that chooses a color for each direction. */
export type FlowColor = string | ((link: FlowLink & { source: FlowNode; target: FlowNode }) => string)

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

/** Shape of straight flow routes. */
export type FlowLineGeometry = 'straight' | 'greatCircle'

/**
 * Force settings for optional edge bundling.
 */
export interface FlowBundleSettings {
    /** Alpha decay. */
    alphaDecay?: number
    /**
     * Charge strength of the bundling force. Positive values attract routes to each other (bundling, the default is 10);
     * negative values repel them (un-bundling: routes fan out into arcs, try -10 to -40); 0 leaves them straight.
     */
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
        color?: FlowColor
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
        /** Size circles by total traffic or by self-loop traffic. Defaults to total. */
        nodeSizeBy?: 'total' | 'internal'
        /** Label each circle node with its `name` (or id). Style with `.em-flow-node-label-text`. @default false */
        nodeLabels?: boolean
        /** Where node labels sit relative to their circle. A node can override it with `labelPosition`. @default 'top' */
        nodeLabelPosition?: 'top' | 'bottom' | 'left' | 'right'
        labelOffsets?: { x?: number; y?: number }
        lineType?: 'curved' | 'straight' | 'sankey'
        /** Shape of straight routes: `'straight'` (a line in the map projection) or `'greatCircle'` (the shortest path on the globe, which curves on world maps). Not applied to tapered (`widthGradient`) or parallel routes. @default 'straight' */
        lineGeometry?: FlowLineGeometry
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
        /** Layout for reciprocal straight flows. Defaults to midpoint. */
        bidirectionalLayout?: 'midpoint' | 'parallel'
        edgeBundling?: boolean
        bundleSettings?: FlowBundleSettings
    }

    /** @deprecated Use flowSettings.color */
    /** Flow color. */
    flowColor?: FlowColor
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
