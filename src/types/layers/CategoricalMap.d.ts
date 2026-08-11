import type { MapInstance } from '../core/MapInstance'

/**
 * Categorical map type.
 */
export interface CategoricalMap extends MapInstance {
    /** Fill color for each category value. Auto-generated from a default palette when unset. */
    classToFillStyle(): Record<string, string> | undefined
    classToFillStyle(v: Record<string, string>): this

    /** Legend/tooltip label for each category value. */
    classToText(): Record<string, string> | undefined
    classToText(v: Record<string, string>): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    /** The classifier (d3 ordinal scale) mapping a category value to a class number. */
    classifier(): ((value: string | number) => number) & { domain: (d?: (string | number)[]) => any }
    classifier(v: ((value: string | number) => number) & { domain?: (d?: (string | number)[]) => any }): this
}
