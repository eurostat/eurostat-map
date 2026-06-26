import type { MapInstance } from '../../core/MapInstance'

/**
 * Bivariate choropleth map type.
 */
export interface BivariateChoroplethMap extends MapInstance {
    numberOfClasses(): number
    numberOfClasses(v: number): this

    breaks1(): number[] | undefined
    breaks1(v: number[] | undefined): this

    breaks2(): number[] | undefined
    breaks2(v: number[] | undefined): this

    startColor(): string
    startColor(v: string): this

    color1(): string
    color1(v: string): this

    color2(): string
    color2(v: string): this

    endColor(): string
    endColor(v: string): this

    classToFillStyle(): any
    classToFillStyle(v: any): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    classifier1(): any
    classifier1(v: any): this

    classifier2(): any
    classifier2(v: any): this
}
