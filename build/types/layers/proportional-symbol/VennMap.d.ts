import type { MapConfig } from '../../core/MapConfig'
import type { MapInstance } from '../../core/MapInstance'
import type { VennLegendConfig } from '../../legend/proportional-symbol/VennLegendConfig'

export interface VennSettings {
    /** Circle colors in the order of the color encoding. The circles blend by multiplication. */
    colors?: [string, string, string]
    /** Largest circle radius in SVG pixels. @default 18 */
    maxRadius?: number
    /** Value mapped to maxRadius. Defaults to the largest value across the encoded datasets. */
    maxValue?: number
    /** Fill opacity of the circles, from 0 to 1. @default 0.85 */
    opacity?: number
}

export interface VennConfig extends MapConfig {
    vennSettings?: VennSettings
    legend?: VennLegendConfig | false
}

export interface VennMap extends MapInstance {
    vennSettings(): VennSettings
    vennSettings(settings: VennSettings): this
    legend(): VennLegendConfig | false | undefined
    legend(config: VennLegendConfig | false): this
}
