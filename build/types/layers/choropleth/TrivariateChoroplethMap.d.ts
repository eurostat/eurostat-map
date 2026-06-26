import type { MapInstance } from '../../core/MapInstance'
import type { TrivariateChoroplethConfig, TrivariateTernarySettings } from './TrivariateChoroplethConfig'

type TernarySettings = TrivariateTernarySettings

/**
 * Trivariate choropleth map type.
 */
export interface TrivariateChoroplethMap extends MapInstance {
    ternaryCodes(): string[]
    ternaryCodes(v: string[]): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    ternarySettings(): TernarySettings
    ternarySettings(v: Partial<TernarySettings>): this
}
