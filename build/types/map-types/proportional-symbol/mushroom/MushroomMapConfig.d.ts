import type { MapConfig } from '../../../core/MapConfig'

/**
 * Configuration for mushroom maps.
 */
export interface MushroomMapConfig extends MapConfig {
    mushroomCodes?: [string, string]
    mushroomMinSize?: number
    mushroomMaxSize?: number
    mushroomColors?: [string, string]
    mushroomOrientation?: 'horizontal' | 'vertical'
    mushroomSizeScaleFunction?: (value: number) => number
    mushroomSizeScaleFunctionV1?: (value: number) => number
    mushroomSizeScaleFunctionV2?: (value: number) => number
}
