import type { MapConfig } from '../../../core/MapConfig'
import type { CoxcombLegendConfig } from '../../../legend/composition/CoxcombLegendConfig'

/**
 * Configuration for coxcomb (polar area) chart maps.
 */
export interface CoxcombMapConfig extends MapConfig {
    /** Coxcomb min radius. */
    coxcombMinRadius?: number
    /** Coxcomb max radius. */
    coxcombMaxRadius?: number
    /** Coxcomb stroke fill. */
    coxcombStrokeFill?: string
    /** Coxcomb stroke width. */
    coxcombStrokeWidth?: number
    /** Coxcomb rings. */
    coxcombRings?: boolean
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
