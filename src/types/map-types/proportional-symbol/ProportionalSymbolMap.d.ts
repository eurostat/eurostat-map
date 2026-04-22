import { MapInstance } from '../../core/MapInstance'

/**
 * Proportional symbol map object
 */
export interface ProportionalSymbolMap extends MapInstance {
    symbol(): string
    symbol(s: 'circle' | 'square'): this

    size(): number
    size(s: number): this

    sizeMax(): number
    sizeMax(s: number): this

    sizeMin(): number
    sizeMin(s: number): this

    symbolFillStyle(): string
    symbolFillStyle(style: string): this

    symbolStrokeStyle(): string
    symbolStrokeStyle(style: string): this
}
