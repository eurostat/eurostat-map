import type { MapType } from '../../layers/MapType'
import type { EncodingConfig } from '../encoding/EncodingConfig'
import type { LegendConfig } from '../../legend/LegendConfig'
import type { LayerRole } from './LayerRole'

export interface LayerConfig {
    /** Stable id; auto-generated if omitted. */
    id?: string
    /** Layer type (same identifiers as map types). */
    type: MapType
    /** Explicit role; defaults from the type. */
    role?: LayerRole
    /** Keyed visual encodings: fill, size, color, stroke, … */
    encoding?: Record<string, EncodingConfig>
    /** Per-layer legend config. */
    legend?: LegendConfig
    /** Type-specific settings are also accepted. */
    [key: string]: any
}
