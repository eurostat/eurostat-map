import { MapInstance } from '../../core/MapInstance'

/**
 * Proportional symbol map object
 */
export interface ProportionalSymbolMap extends MapInstance {
    psMaxSize(): number
    psMaxSize(v: number): this

    psMinSize(): number
    psMinSize(v: number): this

    psMaxValue(): number | undefined
    psMaxValue(v: number | undefined): this

    psMinValue(): number | undefined
    psMinValue(v: number | undefined): this

    psFill(): string
    psFill(v: string): this

    psFillOpacity(): number
    psFillOpacity(v: number): this

    psStrokeOpacity(): number
    psStrokeOpacity(v: number): this

    psStroke(): string
    psStroke(v: string): this

    psStrokeWidth(): number
    psStrokeWidth(v: number): this

    classifierSize(): any
    classifierSize(v: any): this

    classifierColor(): any
    classifierColor(v: any): this

    psShape(): string
    psShape(v: string): this

    psCustomShape(): any
    psCustomShape(v: any): this

    psBarWidth(): number
    psBarWidth(v: number): this

    psClassToFillStyle(): any
    psClassToFillStyle(v: any): this

    psColorFun(): any
    psColorFun(v: any): this

    psSizeScale(): any
    psSizeScale(v: any): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    psThresholds(): number[]
    psThresholds(v: number[]): this

    psColors(): string[] | null
    psColors(v: string[] | null): this

    psCustomSVG(): any
    psCustomSVG(v: any): this

    psOffset(): { x: number; y: number }
    psOffset(v: { x: number; y: number }): this

    psClassificationMethod(): string
    psClassificationMethod(v: string): this

    psClasses(): number
    psClasses(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    dorlingStrength(): any
    dorlingStrength(v: any): this

    dorlingIterations(): number
    dorlingIterations(v: number): this

    animateDorling(): boolean
    animateDorling(v: boolean): this

    psSpikeWidth(): number
    psSpikeWidth(v: number): this

    psCodeLabels(): boolean
    psCodeLabels(v: boolean): this

    psBrightenFactor(): number
    psBrightenFactor(v: number): this
}
