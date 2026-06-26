import { MapInstance } from '../../core/MapInstance'

/**
 * Choropleth map object
 */
export interface ChoroplethMap extends MapInstance {
    numberOfClasses(): number
    numberOfClasses(n: number): this

    classificationMethod(): string
    classificationMethod(method: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'): this

    thresholds(): number[]
    thresholds(t: number[]): this

    colors(): string[]
    colors(c: string[]): this

    colorFunction(): (t: number) => string
    colorFunction(fn: (t: number) => string): this

    makeClassifNice(): boolean
    makeClassifNice(v: boolean): this

    classToFillStyle(): any
    classToFillStyle(v: any): this

    classifier(): any
    classifier(v: any): this

    colorSchemeType(): string
    colorSchemeType(type: 'discrete' | 'continuous'): this

    valueTransform(): (x: number) => number
    valueTransform(v: (x: number) => number): this

    valueUntransform(): (x: number) => number
    valueUntransform(v: (x: number) => number): this

    pointOfDivergence(): number | null
    pointOfDivergence(v: number | null): this

    skipNormalization(): boolean
    skipNormalization(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(style: string): this
}
