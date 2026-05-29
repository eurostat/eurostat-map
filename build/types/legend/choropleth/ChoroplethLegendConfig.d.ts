import type { LegendConfig } from '../LegendConfig'
import type { HistogramLegendConfig } from './HistogramLegendConfig'

/**
 * Configuration for choropleth map legends.
 * Supports discrete, continuous, diverging, and histogram legend variants.
 */
export interface ChoroplethLegendConfig extends LegendConfig {
    /** Padding between the legend title and the legend body in pixels. @default 5 */
    titlePadding?: number

    /** Label style for discrete legends. @default 'thresholds' */
    labelType?: 'thresholds' | 'ranges'

    /** Length of the separator line in pixels for discrete legends. @default shapeWidth */
    sepLineLength?: number

    /** Length of threshold tick marks in pixels. @default 4 */
    tickLength?: number

    /** Number of decimal places for auto-formatted labels. Auto-detected when undefined. */
    decimals?: number

    /** Offset adjustments for labels. @default { x: 3, y: 0 } */
    labelOffsets?: { x: number; y: number }

    /** Custom formatter for legend labels. */
    labelFormatter?: ((value: number, classIndex?: number) => string) | null

    /** User-defined labels for classes in discrete legends. */
    labels?: string[] | null

    /** Histogram legend configuration. Set to null/undefined to disable histogram mode. */
    histogram?: Partial<HistogramLegendConfig> | null

    /** Label shown at the divergence point for diverging legends. */
    pointOfDivergenceLabel?: string

    /** Class index/value position used for diverging legends. */
    pointOfDivergence?: number

    /** Extra padding around the divergence marker in pixels. @default 7 */
    pointOfDivergencePadding?: number

    /** Explicit diverging guide line length in pixels. */
    divergingLineLength?: number

    /** Explicit diverging arrow length in pixels. */
    divergingArrowLength?: number

    /** Label shown at the low end of continuous legends. @default 'Low' */
    lowLabel?: string

    /** Label shown at the high end of continuous legends. @default 'High' */
    highLabel?: string

    /** Number of ticks to show on continuous legends. Use 0 to disable. @default 0 */
    ticks?: number

    /** Explicit tick values for continuous legends. */
    tickValues?: number[]

    /** Explicit tick labels for continuous legends. */
    tickLabels?: Array<string | number>

    /** Pixel tolerance used when hovering continuous legends to highlight nearby regions. @default 10 */
    highlightTolerance?: number

    /** Whether to show dataset min/max labels where supported. @default true */
    maxMin?: boolean

    /** Text affixes for min/max labels as [minSuffix, maxSuffix]. @default ['', ''] */
    maxMinLabels?: [string, string]

    /** Length of min/max tick marks in pixels. Defaults to tickLength when omitted. */
    maxMinTickLength?: number

    /** Whether to append region names to min/max labels. */
    maxMinRegionLabels?: boolean
}
