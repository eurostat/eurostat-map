import type { MapInstance } from '../../core/MapInstance'

/**
 * Bar map type.
 */
export interface BarMap extends MapInstance {
    barType(): 'stacked' | 'grouped'
    barType(v: 'stacked' | 'grouped'): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    barMaxWidth(): number
    barMaxWidth(v: number): this

    barMinWidth(): number
    barMinWidth(v: number): this

    barHeight(): number
    barHeight(v: number): this

    barGroupWidth(): number
    barGroupWidth(v: number): this

    barGroupGap(): number
    barGroupGap(v: number): this

    barGroupMinHeight(): number
    barGroupMinHeight(v: number): this

    barGroupMaxHeight(): number
    barGroupMaxHeight(v: number): this

    barStrokeFill(): string
    barStrokeFill(v: string): this

    barStrokeWidth(): number
    barStrokeWidth(v: number): this

    barCornerRadius(): number
    barCornerRadius(v: number): this

    barOtherColor(): string
    barOtherColor(v: string): this

    barOtherText(): string
    barOtherText(v: string): this

    barTooltipWidth(): number
    barTooltipWidth(v: number): this

    barTooltipHeight(): number
    barTooltipHeight(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    animateDorling(): boolean
    animateDorling(v: boolean): this

    barTotalCode(): string | undefined
    barTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this
}
