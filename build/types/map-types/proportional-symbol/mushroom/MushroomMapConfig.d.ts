import type { MapConfig } from '../../../core/MapConfig'

/**
 * Configuration for mushroom maps.
 */
export interface MushroomMapConfig extends MapConfig {
    /** Mushroom codes. */
    mushroomCodes?: [string, string]
    /** Mushroom min size. */
    mushroomMinSize?: number
    /** Mushroom max size. */
    mushroomMaxSize?: number
    /** Mushroom colors. */
    mushroomColors?: [string, string]
    /** Mushroom orientation. */
    mushroomOrientation?: 'horizontal' | 'vertical'
    mushroomSizeScaleFunction?: (value: number) => number
    mushroomSizeScaleFunctionV1?: (value: number) => number
    mushroomSizeScaleFunctionV2?: (value: number) => number
}
