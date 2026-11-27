import type { MapInstance } from '../MapInstance'
import type { EncodingConfig } from '../encoding/EncodingConfig'
import type { StatData } from '../stat/StatData'
import type { StatConfig } from '../stat/StatConfig'
import type { CompositionStatConfig } from '../../layers/composition/CompositionStatConfig'
import type { LegendConfig } from '../../legend/LegendConfig'
import type { AnyLegendConfig } from '../../legend/AnyLegendConfig'
import type { SparkStatConfig } from '../../layers/spark/SparkStatConfig'
import type { LayerRole } from './LayerRole'

export interface Layer {
    map: MapInstance
    isLayer: true
    id: string
    type: string
    role: LayerRole

    encodings_: Record<string, EncodingConfig>

    encoding(): Record<string, EncodingConfig>
    encoding(channel: string): EncodingConfig | undefined
    encoding(channel: string, config: EncodingConfig): this
    encoding(map: Record<string, EncodingConfig>): this

    getEncodingStat(channel: string, fallback?: string): string | undefined
    getEncodingStats(channel: string, fallback?: string[]): string[] | undefined
    getEncodingStatKey(channel: string, categoryCode?: string, fallbackStat?: string): string
    getEncodingStatData(channel: string, categoryCode?: string, fallbackStat?: string): StatData
    getEncodingValue(channel: string, regionId: string, categoryCode?: string, fallbackStat?: string): number | string | undefined
    getEncodingUnitText(channel: string, categoryCode?: string, fallbackStat?: string): string

    /** Forwards to the owning map's stat() - statistical data is always map-level. */
    stat(): StatConfig | CompositionStatConfig | undefined
    stat(config: StatConfig | CompositionStatConfig | SparkStatConfig): this
    stat(key: string): StatConfig | CompositionStatConfig | undefined
    stat(key: string, config: StatConfig | CompositionStatConfig | SparkStatConfig): this

    /** Forwards to the owning map's statData() - statistical data is always map-level. */
    statData(): StatData
    statData(key: string): StatData
    statData(key: string, data: StatData): this

    /** Get or set this layer's own legend configuration, independent of the map facade's. */
    legend(): LegendConfig | false | undefined
    legend(config: AnyLegendConfig | false): this

    updateClassification(): Layer
    updateStyle(): Layer
    getLegendConstructor(): (map: MapInstance, config?: any) => any
    group(): any // d3 selection
}
