import type { MapInstance } from '../core/MapInstance'

/**
 * Categorical map type.
 */
export interface CategoricalMap extends MapInstance {
    classToFillStyle(): any
    classToFillStyle(v: any): this

    classToText(): any
    classToText(v: any): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    tooltipText(): any
    tooltipText(v: any): this

    classifier(): any
    classifier(v: any): this
}
