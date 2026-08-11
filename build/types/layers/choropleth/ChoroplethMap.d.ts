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

    /** Function mapping a class index (or category ecl code) and the number of classes to a fill color. */
    classToFillStyle(): (ecl: number | string, numberOfClasses: number) => string
    classToFillStyle(v: (ecl: number | string, numberOfClasses: number) => string): this

    /** The classifier function/scale mapping a stat value to a class number. */
    classifier(): (value: number) => number
    classifier(v: (value: number) => number): this

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

    categoryFillStyle(): { [rawValue: string]: string } | undefined
    categoryFillStyle(v: { [rawValue: string]: string }): this

    categoryText(): { [rawValue: string]: string } | undefined
    categoryText(v: { [rawValue: string]: string }): this

    /** SVG filter/pattern definition function used for fill patterns (e.g. dot density). */
    filtersDefinitionFunction(): ((svg: any, numberOfClasses: number) => void) | undefined
    filtersDefinitionFunction(fn: (svg: any, numberOfClasses: number) => void): this

    /** Manually highlight a region by ID, simulating a mouseover (fill + tooltip). */
    highlightRegion(regionId: string): this

    /** Clear any region highlighted via highlightRegion(), simulating a mouseout. */
    clearHighlight(): this
}
