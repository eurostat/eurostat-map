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

    colorSchemeType(): string
    colorSchemeType(type: 'discrete' | 'continuous'): this

    noDataFillStyle(): string
    noDataFillStyle(style: string): this
}
