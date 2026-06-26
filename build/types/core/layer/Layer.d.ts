import type { MapInstance } from '../MapInstance'
import type { EncodingConfig } from '../encoding/EncodingConfig'
import type { StatData } from '../stat/StatData'
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
    encoding(channel: string, config: EncodingConfig): Layer
    encoding(map: Record<string, EncodingConfig>): Layer

    getEncodingStat(channel: string, fallback?: string): string | undefined
    getEncodingStats(channel: string, fallback?: string[]): string[] | undefined
    getEncodingStatKey(channel: string, categoryCode?: string, fallbackStat?: string): string
    getEncodingStatData(channel: string, categoryCode?: string, fallbackStat?: string): StatData
    getEncodingValue(channel: string, regionId: string, categoryCode?: string, fallbackStat?: string): number | string | undefined
    getEncodingUnitText(channel: string, categoryCode?: string, fallbackStat?: string): string

    updateClassification(): Layer
    updateStyle(): Layer
    getLegendConstructor(): (map: MapInstance, config?: any) => any
    group(): any // d3 selection
}
