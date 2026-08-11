import type { MapInstance } from '../../../core/MapInstance'

/**
 * Mushroom map type.
 */
export interface MushroomMap extends MapInstance {
    /** Returns the resolved [v1, v2] stat codes for the two mushroom sides, honoring any
     * 'left'/'right' or 'v1'/'v2' encodings before falling back to mushroomCodes. */
    getMushroomStatCodes(): [string, string]

    mushroomSettings(): {
        codes: [string, string]
        minSize: number
        maxSize: number
        colors: [string, string]
        orientation: 'horizontal' | 'vertical'
        sizeScaleFunction: ((value: number) => number) | null
        sizeScaleFunctionV1: ((value: number) => number) | null
        sizeScaleFunctionV2: ((value: number) => number) | null
    }
    mushroomSettings(v: {
        codes?: [string, string]
        minSize?: number
        maxSize?: number
        colors?: [string, string]
        orientation?: 'horizontal' | 'vertical'
        sizeScaleFunction?: ((value: number) => number) | null
        sizeScaleFunctionV1?: ((value: number) => number) | null
        sizeScaleFunctionV2?: ((value: number) => number) | null
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
    mushroomSizeScaleFunction(): ((value: number) => number) | null
    /** @deprecated Use mushroomSettings({ sizeScaleFunction }) */
    mushroomSizeScaleFunction(v: (value: number) => number): this

    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV1 }) */
    mushroomSizeScaleFunctionV1(): ((value: number) => number) | null
    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV1 }) */
    mushroomSizeScaleFunctionV1(v: (value: number) => number): this

    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV2 }) */
    mushroomSizeScaleFunctionV2(): ((value: number) => number) | null
    /** @deprecated Use mushroomSettings({ sizeScaleFunctionV2 }) */
    mushroomSizeScaleFunctionV2(v: (value: number) => number): this
}
