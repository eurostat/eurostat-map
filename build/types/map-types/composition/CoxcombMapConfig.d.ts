import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for coxcomb (polar area) chart maps.
 */
export interface CoxcombMapConfig extends MapConfig {
    coxcombMinRadius?: number
    coxcombMaxRadius?: number
    coxcombStrokeFill?: string
    coxcombStrokeWidth?: number
    coxcombRings?: boolean
    coxcombOffsets?: { x: number; y: number }
    hoverColor?: string
    catColors?: Record<string, string>
    catLabels?: Record<string, string>
    noDataFillStyle?: string
    classifierSize?: any
}
