import type { MapInstance } from '../../../core/MapInstance'
import type { CoxcombStatConfig } from './CoxcombStatConfig'
import type { CoxcombLegendConfig } from '../../../legend/composition/CoxcombLegendConfig'

/**
 * Coxcomb map type.
 */
export interface CoxcombMap extends MapInstance {
    legend(): CoxcombLegendConfig | false
    legend(config: CoxcombLegendConfig | false): this

    coxcombSettings(): {
        minRadius: number
        maxRadius: number
        strokeFill: string
        strokeWidth: number
        rings: boolean
        offsets: { x: number; y: number }
    }
    coxcombSettings(v: {
        minRadius?: number
        maxRadius?: number
        strokeFill?: string
        strokeWidth?: number
        rings?: boolean
        offsets?: { x: number; y: number }
    }): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    /** @deprecated Use coxcombSettings({ maxRadius }) */
    coxcombMaxRadius(): number
    /** @deprecated Use coxcombSettings({ maxRadius }) */
    coxcombMaxRadius(v: number): this

    /** @deprecated Use coxcombSettings({ minRadius }) */
    coxcombMinRadius(): number
    /** @deprecated Use coxcombSettings({ minRadius }) */
    coxcombMinRadius(v: number): this

    /** @deprecated Use coxcombSettings({ rings }) */
    coxcombRings(): boolean
    /** @deprecated Use coxcombSettings({ rings }) */
    coxcombRings(v: boolean): this

    /** @deprecated Use coxcombSettings({ strokeFill }) */
    coxcombStrokeFill(): string
    /** @deprecated Use coxcombSettings({ strokeFill }) */
    coxcombStrokeFill(v: string): this

    /** @deprecated Use coxcombSettings({ strokeWidth }) */
    coxcombStrokeWidth(): number
    /** @deprecated Use coxcombSettings({ strokeWidth }) */
    coxcombStrokeWidth(v: number): this

    hoverColor(): string
    hoverColor(v: string): this

    classifierSize(): any
    classifierSize(v: any): this

    /** @deprecated Use coxcombSettings({ offsets }) */
    coxcombOffsets(): { x: number; y: number }
    /** @deprecated Use coxcombSettings({ offsets }) */
    coxcombOffsets(v: { x: number; y: number }): this

    statCoxcomb(config: CoxcombStatConfig): this
}
