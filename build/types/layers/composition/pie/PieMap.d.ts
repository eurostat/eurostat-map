import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { PieChartLegendConfig } from '../../../legend/composition/PieChartLegendConfig'

/**
 * Pie map type.
 */
export interface PieMap extends MapInstance {
    legend(): PieChartLegendConfig | false
    legend(config: PieChartLegendConfig | false): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    compositionSettings(): {
        type?: 'flag' | 'pie' | 'ring' | 'segment' | 'radar' | 'agepyramid' | 'halftone'
        /** Radar wedge radius mode: share within symbol (default) or absolute values across map. */
        radarValueMode?: 'share' | 'absolute'
        minSize?: number
        maxSize?: number
        strokeFill?: string
        strokeWidth?: number
        reverseOrder?: boolean
        /** Category code order for composition rendering. */
        order?: string[]
        stripesOrientation?: number
        offsetAngle?: number
        agePyramidHeightFactor?: number
        otherColor?: string
        otherText?: string
    }
    compositionSettings(v: {
        type?: 'flag' | 'pie' | 'ring' | 'segment' | 'radar' | 'agepyramid' | 'halftone'
        /** Radar wedge radius mode: share within symbol (default) or absolute values across map. */
        radarValueMode?: 'share' | 'absolute'
        minSize?: number
        maxSize?: number
        strokeFill?: string
        strokeWidth?: number
        reverseOrder?: boolean
        /** Category code order for composition rendering. */
        order?: string[]
        stripesOrientation?: number
        offsetAngle?: number
        agePyramidHeightFactor?: number
        otherColor?: string
        otherText?: string
    }): this

    dorling(): boolean
    dorling(v: boolean): this

    compositionTotalCode(): string | undefined
    compositionTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statPie(config: CompositionStatConfig): this
    /** @deprecated Legacy positional signature. Prefer statPie({ categoryParameter, categoryCodes, ... }). */
    statPie(
        /** Config. */
        config: CompositionStatConfig,
        /** Category parameter. */
        categoryParameter?: string,
        /** Category codes. */
        categoryCodes?: string[],
        /** Category labels. */
        categoryLabels?: string[],
        /** Category colors. */
        categoryColors?: string[],
        /** Total code. */
        totalCode?: string
    ): this
}
