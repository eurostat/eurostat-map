import { LegendConfig } from '../LegendConfig'

/**
 * Configuration for flow width legend in flow maps.
 */
export interface FlowWidthLegendConfig {
    /** Title for the flow width legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 20 */
    titlePadding?: number

    /** Custom values to display in the flow width legend. If null, values are auto-generated. */
    values?: number[] | null

    /** Top margin for the flow width legend in pixels. @default 15 */
    marginTop?: number

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined

    /** Manual override for legend labels. */
    labels?: string[] | null

    /** Color of the flow lines in the legend. @default '#616161' */
    color?: string

    /** Orientation of the flow width legend. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'

    /** Number of segments to display. @default 3 */
    segments?: number

    /** Width of the legend in pixels. @default 150 */
    width?: number

    /** Whether to show max/min labels. @default false */
    maxMin?: boolean
}

/**
 * Configuration for node size legend in flow maps.
 */
export interface NodeSizeLegendConfig {
    /** Title for the node size legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 25 */
    titlePadding?: number

    /** Custom values to display in the node size legend. If null, values are auto-generated. */
    values?: number[] | null

    /** Manual override for legend labels. */
    labels?: string[] | null

    /** Top margin for the node size legend in pixels. @default 20 */
    marginTop?: number

    /** Custom formatter function for legend labels. */
    labelFormatter?: ((value: number) => string) | undefined
}

/**
 * Configuration for flow color legend in flow maps.
 */
export interface FlowColorLegendConfig {
    /** Title for the flow color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 0 */
    titlePadding?: number

    /** Top margin for the flow color legend in pixels. @default 50 */
    marginTop?: number

    /** User-defined legend items for custom flow color function. */
    items?: Array<{ label: string; color: string }>

    /** Whether to use labels as ticks. @default false */
    ticks?: boolean
}

/**
 * Configuration for region color legend in flow maps.
 */
export interface RegionColorLegendConfig {
    /** Title for the region color legend. */
    title?: string | null

    /** Padding between title and legend content in pixels. @default 15 */
    titlePadding?: number

    /** Top margin for the region color legend in pixels. @default 40 */
    marginTop?: number

    /** Labels for the region types. @default ['Exporter', 'Importer'] */
    labels?: string[]
}

/**
 * Configuration for flow map legends.
 * Flow maps can display multiple legend types: flow width, node size, flow color, and region color.
 */
export interface FlowMapLegendConfig extends LegendConfig {
    /** Configuration for the flow width legend. */
    flowWidthLegend?: Partial<FlowWidthLegendConfig>

    /** Configuration for the node size legend. */
    nodeSizeLegend?: Partial<NodeSizeLegendConfig>

    /** Configuration for the flow color legend. */
    flowColorLegend?: Partial<FlowColorLegendConfig>

    /** Configuration for the region color legend. */
    regionColorLegend?: Partial<RegionColorLegendConfig>
}
