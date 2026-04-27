import type { MapInstance } from '../../core/MapInstance'

/**
 * Trivariate choropleth map type.
 */
export interface TrivariateChoroplethMap extends MapInstance {
    ternaryCodes(): string[]
    ternaryCodes(v: string[]): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    ternarySettings(): any
    ternarySettings(v: any): this
}
