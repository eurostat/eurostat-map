import type { MapInstance } from '../../core/MapInstance'
import type { Layer } from '../../core/layer/Layer'
import type { TrivariateLegendConfig } from '../../legend/choropleth/TrivariateLegendConfig'
import type { TrivariateTernarySettings, TrivariateVennSettings } from './TrivariateChoroplethConfig'

type TernarySettings = TrivariateTernarySettings

/**
 * Trivariate choropleth map type.
 */
export interface TrivariateChoroplethMap extends MapInstance {
    /** Returns the resolved [v1, v2, v3] stat codes for the three ternary variables, honoring
     * any 'color' encoding before falling back to ternaryCodes. */
    getTernaryStatCodes(): [string, string, string]

    ternaryCodes(): string[]
    ternaryCodes(v: string[]): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    ternarySettings(): TernarySettings
    ternarySettings(v: Partial<TernarySettings>): this

    vennSettings(): TrivariateVennSettings | false
    vennSettings(v: TrivariateVennSettings | false): this
}

/** Trivariate layer with ternary and Venn choropleth modes. */
export interface TrivariateChoroplethLayer extends Layer {
    vennSettings(): TrivariateVennSettings | false
    vennSettings(v: TrivariateVennSettings | false): this
    legend(): TrivariateLegendConfig | false | undefined
    legend(config: TrivariateLegendConfig | false): this
}
