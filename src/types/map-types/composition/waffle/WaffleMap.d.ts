import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'

/**
 * Waffle map type.
 */
export interface WaffleMap extends MapInstance {
    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    waffleMaxSize(): number
    waffleMaxSize(v: number): this

    waffleMinSize(): number
    waffleMinSize(v: number): this

    waffleGridSize(): number
    waffleGridSize(v: number): this

    waffleCellPadding(): number
    waffleCellPadding(v: number): this

    waffleOtherColor(): string
    waffleOtherColor(v: string): this

    waffleOtherText(): string
    waffleOtherText(v: string): this

    waffleStrokeFill(): string
    waffleStrokeFill(v: string): this

    waffleStrokeWidth(): number
    waffleStrokeWidth(v: number): this

    waffleRoundedCorners(): number
    waffleRoundedCorners(v: number): this

    waffleTooltipSize(): number
    waffleTooltipSize(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    animateDorling(): boolean
    animateDorling(v: boolean): this

    waffleTotalCode(): string | undefined
    waffleTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statWaffle(config: CompositionStatConfig): this
    statWaffle(
        config: CompositionStatConfig,
        categoryParameter?: string,
        categoryCodes?: string[],
        categoryLabels?: string[],
        categoryColors?: string[],
        totalCode?: string
    ): this
}
