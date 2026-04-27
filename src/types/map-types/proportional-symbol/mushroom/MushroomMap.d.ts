import type { MapInstance } from '../../../core/MapInstance'

/**
 * Mushroom map type.
 */
export interface MushroomMap extends MapInstance {
    mushroomCodes(): [string, string]
    mushroomCodes(v: [string, string]): this

    mushroomMinSize(): number
    mushroomMinSize(v: number): this

    mushroomMaxSize(): number
    mushroomMaxSize(v: number): this

    mushroomColors(): [string, string]
    mushroomColors(v: [string, string]): this

    mushroomOrientation(): 'horizontal' | 'vertical'
    mushroomOrientation(v: 'horizontal' | 'vertical'): this

    mushroomSizeScaleFunction(): any
    mushroomSizeScaleFunction(v: any): this

    mushroomSizeScaleFunctionV1(): any
    mushroomSizeScaleFunctionV1(v: any): this

    mushroomSizeScaleFunctionV2(): any
    mushroomSizeScaleFunctionV2(v: any): this
}
