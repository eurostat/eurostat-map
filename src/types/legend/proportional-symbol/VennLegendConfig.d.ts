import type { LegendConfig } from '../LegendConfig'

/** Settings for the Venn diagram and the proportional circle size legend. */
export interface VennLegendConfig extends LegendConfig {
    /** Override the stat labels in encoding order. */
    labels?: string[]
    /** Radius of the diagram circles in SVG pixels. @default 26 */
    radius?: number
    /** Reference values for the size legend. An empty array hides the size legend. */
    sizeValues?: number[]
    /** Highlight the matching circles on hover or keyboard focus. @default true */
    interactive?: boolean
}
