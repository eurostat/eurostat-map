import type { MapConfig } from '../../../core/MapConfig'

/**
 * Configuration for mushroom maps.
 */
export interface MushroomMapConfig extends MapConfig {
    /** Grouped mushroom settings. */
    mushroomSettings?: {
        codes?: [string, string]
        minSize?: number
        maxSize?: number
        colors?: [string, string]
        orientation?: 'horizontal' | 'vertical'
        sizeScaleFunction?: (value: number) => number
        sizeScaleFunctionV1?: (value: number) => number
        sizeScaleFunctionV2?: (value: number) => number
    }
    /** @deprecated Use mushroomSettings.codes */
    /** Mushroom codes. */
    mushroomCodes?: [string, string]
    /** @deprecated Use mushroomSettings.minSize */
    /** Mushroom min size. */
    mushroomMinSize?: number
    /** @deprecated Use mushroomSettings.maxSize */
    /** Mushroom max size. */
    mushroomMaxSize?: number
    /** @deprecated Use mushroomSettings.colors */
    /** Mushroom colors. */
    mushroomColors?: [string, string]
    /** @deprecated Use mushroomSettings.orientation */
    /** Mushroom orientation. */
    mushroomOrientation?: 'horizontal' | 'vertical'
    /** @deprecated Use mushroomSettings.sizeScaleFunction */
    mushroomSizeScaleFunction?: (value: number) => number
    /** @deprecated Use mushroomSettings.sizeScaleFunctionV1 */
    mushroomSizeScaleFunctionV1?: (value: number) => number
    /** @deprecated Use mushroomSettings.sizeScaleFunctionV2 */
    mushroomSizeScaleFunctionV2?: (value: number) => number
}
