import type { MapInstance } from '../../../core/MapInstance'

/**
 * Mushroom map type.
 */
export interface MushroomMap extends MapInstance {
    mushroomSettings(): {
        codes: [string, string]
        minSize: number
        maxSize: number
        colors: [string, string]
        orientation: 'horizontal' | 'vertical'
        sizeScaleFunction: any
        sizeScaleFunctionV1: any
        sizeScaleFunctionV2: any
    }
    mushroomSettings(v: {
        codes?: [string, string]
        minSize?: number
        maxSize?: number
        colors?: [string, string]
        orientation?: 'horizontal' | 'vertical'
        sizeScaleFunction?: any
        sizeScaleFunctionV1?: any
        sizeScaleFunctionV2?: any
    }): this

    /** @deprecated Use mushroomSettings({ codes }) */
    mushroomCodes(): [string, string]
    /** @deprecated Use mushroomSettings({ codes }) */
    mushroomCodes(v: [string, string]): this

    /** @deprecated Use mushroomSettings({ minSize }) */
    mushroomMinSize(): number
    /** @deprecated Use mushroomSettings({ minSize }) */
    mushroomMinSize(v: number): this

    /** @deprecated Use mushroomSettings({ maxSize }) */
    mushroomMaxSize(): number
    /** @deprecated Use mushroomSettings({ maxSize }) */
    mushroomMaxSize(v: number): this

    /** @deprecated Use mushroomSettings({ colors }) */
    mushroomColors(): [string, string]
    /** @deprecated Use mushroomSettings({ colors }) */
    mushroomColors(v: [string, string]): this

    /** @deprecated Use mushroomSettings({ orientation }) */
    mushroomOrientation(): 'horizontal' | 'vertical'
    /** @deprecated Use mushroomSettings({ orientation }) */
    mushroomOrientation(v: 'horizontal' | 'vertical'): this

    /** @deprecated Use mushroomSettings({ sizeScaleFunction }) */
    mushroomSizeScaleFunction(): any
    /** @deprecated Use mushroomSettings({ sizeScaleFunction }) */
    mushroomSizeScaleFunction(v: any): this

    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV1 }) */
    mushroomSizeScaleFunctionV1(): any
    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV1 }) */
    mushroomSizeScaleFunctionV1(v: any): this

    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV2 }) */
    mushroomSizeScaleFunctionV2(): any
    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV2 }) */
    mushroomSizeScaleFunctionV2(v: any): this
}
