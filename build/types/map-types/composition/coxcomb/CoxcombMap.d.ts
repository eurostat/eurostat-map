import type { MapInstance } from '../../../core/MapInstance'
import type { CoxcombStatConfig } from './CoxcombStatConfig'
import type { CoxcombLegendConfig } from '../../../legend/composition/CoxcombLegendConfig'

/**
 * Coxcomb map type.
 */
export interface CoxcombMap extends MapInstance {
    legend(): CoxcombLegendConfig
    legend(config: CoxcombLegendConfig | false): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    coxcombMaxRadius(): number
    coxcombMaxRadius(v: number): this

    coxcombMinRadius(): number
    coxcombMinRadius(v: number): this

    coxcombRings(): boolean
    coxcombRings(v: boolean): this

    coxcombStrokeFill(): string
    coxcombStrokeFill(v: string): this

    coxcombStrokeWidth(): number
    coxcombStrokeWidth(v: number): this

    hoverColor(): string
    hoverColor(v: string): this

    classifierSize(): any
    classifierSize(v: any): this

    coxcombOffsets(): { x: number; y: number }
    coxcombOffsets(v: { x: number; y: number }): this

    statCoxcomb(config: CoxcombStatConfig): this
}
