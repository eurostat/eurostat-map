import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { BarChartLegendConfig } from '../../../legend/composition/BarChartLegendConfig'

/**
 * Bar map type.
 */
export interface BarMap extends MapInstance {
    legend(): BarChartLegendConfig | false
    legend(config: BarChartLegendConfig | false): this

    /** @deprecated Use barSettings({ type }) */
    barType(): 'stacked' | 'grouped'
    /** @deprecated Use barSettings({ type }) */
    barType(v: 'stacked' | 'grouped'): this

    catColors(): Record<string, string> | undefined
    catColors(v: Record<string, string>): this

    catLabels(): Record<string, string> | undefined
    catLabels(v: Record<string, string>): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    /** @deprecated Use barSettings({ maxWidth }) */
    barMaxWidth(): number
    /** @deprecated Use barSettings({ maxWidth }) */
    barMaxWidth(v: number): this

    /** @deprecated Use barSettings({ minWidth }) */
    barMinWidth(): number
    /** @deprecated Use barSettings({ minWidth }) */
    barMinWidth(v: number): this

    /** @deprecated Use barSettings({ height }) */
    barHeight(): number
    /** @deprecated Use barSettings({ height }) */
    barHeight(v: number): this

    /** @deprecated Use barSettings({ groupWidth }) */
    barGroupWidth(): number
    /** @deprecated Use barSettings({ groupWidth }) */
    barGroupWidth(v: number): this

    /** Consolidated bar chart style settings. */
    barSettings(): {
        type?: 'stacked' | 'grouped'
        minWidth?: number
        maxWidth?: number
        height?: number
        groupWidth?: number
        groupMinWidth?: number
        groupMaxWidth?: number
        groupGap?: number
        groupMinHeight?: number
        groupMaxHeight?: number
        groupMaxValue?: number
        groupMaxWidthValue?: number
        strokeFill?: string
        strokeWidth?: number
        cornerRadius?: number
        otherColor?: string
        otherText?: string
        tooltipWidth?: number
        tooltipHeight?: number
        showCategoryLabels?: boolean
    }
    barSettings(v: {
        type?: 'stacked' | 'grouped'
        minWidth?: number
        maxWidth?: number
        height?: number
        groupWidth?: number
        groupMinWidth?: number
        groupMaxWidth?: number
        groupGap?: number
        groupMinHeight?: number
        groupMaxHeight?: number
        groupMaxValue?: number
        groupMaxWidthValue?: number
        strokeFill?: string
        strokeWidth?: number
        cornerRadius?: number
        otherColor?: string
        otherText?: string
        tooltipWidth?: number
        tooltipHeight?: number
        showCategoryLabels?: boolean
    }): this

    /** @deprecated Use barSettings({ groupGap }) */
    barGroupGap(): number
    /** @deprecated Use barSettings({ groupGap }) */
    barGroupGap(v: number): this

    /** @deprecated Use barSettings({ groupMinHeight }) */
    barGroupMinHeight(): number
    /** @deprecated Use barSettings({ groupMinHeight }) */
    barGroupMinHeight(v: number): this

    /** @deprecated Use barSettings({ groupMaxHeight }) */
    barGroupMaxHeight(): number
    /** @deprecated Use barSettings({ groupMaxHeight }) */
    barGroupMaxHeight(v: number): this

    /** @deprecated Use barSettings({ strokeFill }) */
    barStrokeFill(): string
    /** @deprecated Use barSettings({ strokeFill }) */
    barStrokeFill(v: string): this

    /** @deprecated Use barSettings({ strokeWidth }) */
    barStrokeWidth(): number
    /** @deprecated Use barSettings({ strokeWidth }) */
    barStrokeWidth(v: number): this

    /** @deprecated Use barSettings({ cornerRadius }) */
    barCornerRadius(): number
    /** @deprecated Use barSettings({ cornerRadius }) */
    barCornerRadius(v: number): this

    /** @deprecated Use barSettings({ otherColor }) */
    barOtherColor(): string
    /** @deprecated Use barSettings({ otherColor }) */
    barOtherColor(v: string): this

    /** @deprecated Use barSettings({ otherText }) */
    barOtherText(): string
    /** @deprecated Use barSettings({ otherText }) */
    barOtherText(v: string): this

    /** @deprecated Use barSettings({ tooltipWidth }) */
    barTooltipWidth(): number
    /** @deprecated Use barSettings({ tooltipWidth }) */
    barTooltipWidth(v: number): this

    /** @deprecated Use barSettings({ tooltipHeight }) */
    barTooltipHeight(): number
    /** @deprecated Use barSettings({ tooltipHeight }) */
    barTooltipHeight(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    barTotalCode(): string | undefined
    barTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statBar(config: CompositionStatConfig): this
    /** @deprecated Legacy positional signature. Prefer statBar({ categoryParameter, categoryCodes, ... }). */
    statBar(
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
