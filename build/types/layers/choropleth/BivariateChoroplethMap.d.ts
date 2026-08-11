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

    /** Function mapping the two class indices (ecl1, ecl2) to a fill color. */
    classToFillStyle(): (ecl1: number, ecl2: number) => string | null
    classToFillStyle(v: (ecl1: number, ecl2: number) => string | null): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    /** The classifier (d3 scale) mapping the first variable's stat value to a class number. */
    classifier1(): ((value: number) => number) | undefined
    classifier1(v: (value: number) => number): this

    /** The classifier (d3 scale) mapping the second variable's stat value to a class number. */
    classifier2(): ((value: number) => number) | undefined
    classifier2(v: (value: number) => number): this
}
