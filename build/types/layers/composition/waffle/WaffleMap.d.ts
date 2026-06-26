import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { WaffleLegendConfig } from '../../../legend/composition/WaffleLegendConfig'

/**
 * Waffle map type.
 */
export interface WaffleMap extends MapInstance {
    legend(): WaffleLegendConfig | false
    legend(config: WaffleLegendConfig | false): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    waffleSettings(): {
        minSize?: number
        maxSize?: number
        gridSize?: number
        cellPadding?: number
        strokeFill?: string
        strokeWidth?: number
        roundedCorners?: number
        tooltipSize?: number
        otherColor?: string
        otherText?: string
    }
    waffleSettings(v: {
        minSize?: number
        maxSize?: number
        gridSize?: number
        cellPadding?: number
        strokeFill?: string
        strokeWidth?: number
        roundedCorners?: number
        tooltipSize?: number
        otherColor?: string
        otherText?: string
    }): this

    /** @deprecated Use waffleSettings({ maxSize }) */
    waffleMaxSize(): number
    /** @deprecated Use waffleSettings({ maxSize }) */
    waffleMaxSize(v: number): this

    /** @deprecated Use waffleSettings({ minSize }) */
    waffleMinSize(): number
    /** @deprecated Use waffleSettings({ minSize }) */
    waffleMinSize(v: number): this

    /** @deprecated Use waffleSettings({ gridSize }) */
    waffleGridSize(): number
    /** @deprecated Use waffleSettings({ gridSize }) */
    waffleGridSize(v: number): this

    /** @deprecated Use waffleSettings({ cellPadding }) */
    waffleCellPadding(): number
    /** @deprecated Use waffleSettings({ cellPadding }) */
    waffleCellPadding(v: number): this

    /** @deprecated Use waffleSettings({ otherColor }) */
    waffleOtherColor(): string
    /** @deprecated Use waffleSettings({ otherColor }) */
    waffleOtherColor(v: string): this

    /** @deprecated Use waffleSettings({ otherText }) */
    waffleOtherText(): string
    /** @deprecated Use waffleSettings({ otherText }) */
    waffleOtherText(v: string): this

    /** @deprecated Use waffleSettings({ strokeFill }) */
    waffleStrokeFill(): string
    /** @deprecated Use waffleSettings({ strokeFill }) */
    waffleStrokeFill(v: string): this

    /** @deprecated Use waffleSettings({ strokeWidth }) */
    waffleStrokeWidth(): number
    /** @deprecated Use waffleSettings({ strokeWidth }) */
    waffleStrokeWidth(v: number): this

    /** @deprecated Use waffleSettings({ roundedCorners }) */
    waffleRoundedCorners(): number
    /** @deprecated Use waffleSettings({ roundedCorners }) */
    waffleRoundedCorners(v: number): this

    /** @deprecated Use waffleSettings({ tooltipSize }) */
    waffleTooltipSize(): number
    /** @deprecated Use waffleSettings({ tooltipSize }) */
    waffleTooltipSize(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    waffleTotalCode(): string | undefined
    waffleTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statWaffle(config: CompositionStatConfig): this
    /** @deprecated Legacy positional signature. Prefer statWaffle({ categoryParameter, categoryCodes, ... }). */
    statWaffle(
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
