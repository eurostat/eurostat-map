import type { ChoroplethMap } from './ChoroplethMap'

/**
 * Value-by-alpha choropleth map type. Extends the choropleth map API (it reuses
 * decorateChoroplethLayer internally) with an opacity channel driven by a second stat.
 */
export interface ValueByAlphaMap extends ChoroplethMap {
    opacityScale(): ((value: number) => number) | null
    opacityScale(v: ((value: number) => number) | null): this
}
