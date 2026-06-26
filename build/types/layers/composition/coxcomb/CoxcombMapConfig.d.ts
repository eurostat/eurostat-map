import type { MapConfig } from '../../../core/MapConfig'
import type { CoxcombLegendConfig } from '../../../legend/composition/CoxcombLegendConfig'

/**
 * Configuration for coxcomb (polar area) chart maps.
 */
export interface CoxcombMapConfig extends MapConfig {
    /** Grouped coxcomb settings. */
    coxcombSettings?: {
        minRadius?: number
        maxRadius?: number
        strokeFill?: string
        strokeWidth?: number
        rings?: boolean
        offsets?: { x: number; y: number }
    }
    /** @deprecated Use coxcombSettings.minRadius */
    /** Coxcomb min radius. */
    coxcombMinRadius?: number
    /** @deprecated Use coxcombSettings.maxRadius */
    /** Coxcomb max radius. */
    coxcombMaxRadius?: number
    /** @deprecated Use coxcombSettings.strokeFill */
    /** Coxcomb stroke fill. */
    coxcombStrokeFill?: string
    /** @deprecated Use coxcombSettings.strokeWidth */
    /** Coxcomb stroke width. */
    coxcombStrokeWidth?: number
    /** @deprecated Use coxcombSettings.rings */
    /** Coxcomb rings. */
    coxcombRings?: boolean
    /** @deprecated Use coxcombSettings.offsets */
    /** Coxcomb offsets. */
    coxcombOffsets?: { x: number; y: number }
    /** Hover color. */
    hoverColor?: string
    /** Cat colors. */
    catColors?: Record<string, string>
    /** Cat labels. */
    catLabels?: Record<string, string>
    /** No data fill style. */
    noDataFillStyle?: string
    /** Classifier size. */
    classifierSize?: any
    /** Legend. */
    legend?: CoxcombLegendConfig | false
}
