import { MapInstance } from '../../core/MapInstance'
import type { ProportionalSymbolSettings } from './ProportionalSymbolConfig'

/**
 * Proportional symbol map object
 */
export interface ProportionalSymbolMap extends MapInstance {
    categoryFillStyle(): { [rawValue: string]: string } | undefined
    categoryFillStyle(v: { [rawValue: string]: string }): this

    categoryText(): { [rawValue: string]: string } | undefined
    categoryText(v: { [rawValue: string]: string }): this

    psSettings(): ProportionalSymbolSettings
    psSettings(v: ProportionalSymbolSettings): this

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

    /** D3 scale mapping a stat value to a symbol size in pixels. */
    classifierSize(): ((value: number) => number) & { domain: (d?: number[]) => any }
    classifierSize(v: ((value: number) => number) & { domain?: (d?: number[]) => any }): this

    /** D3 scale mapping a stat value to a color class index. */
    classifierColor(): ((value: number) => number) | undefined
    classifierColor(v: (value: number) => number): this

    psShape(): string
    psShape(v: string): this

    psCustomShape(): any
    psCustomShape(v: any): this

    psBarWidth(): number
    psBarWidth(v: number): this

    /** Function mapping a class index and the number of classes to a fill color. */
    psClassToFillStyle(): (ecl: number, numberOfClasses: number) => string
    psClassToFillStyle(v: (ecl: number, numberOfClasses: number) => string): this

    /** d3-scale-chromatic interpolator used to auto-generate psColors when not set explicitly. */
    psColorFun(): (t: number) => string
    psColorFun(v: (t: number) => string): this

    psSizeScale(): 'sqrt' | 'linear' | undefined
    psSizeScale(v: 'sqrt' | 'linear'): this

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

    psSpikeWidth(): number
    psSpikeWidth(v: number): this

    psCodeLabels(): boolean
    psCodeLabels(v: boolean): this

    psBrightenFactor(): number
    psBrightenFactor(v: number): this
}
