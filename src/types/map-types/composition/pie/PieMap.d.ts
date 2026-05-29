import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { PieChartLegendConfig } from '../../../legend/composition/PieChartLegendConfig'

/**
 * Pie map type.
 */
export interface PieMap extends MapInstance {
    legend(): PieChartLegendConfig | false
    legend(config: PieChartLegendConfig | false): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    pieMaxRadius(): number
    pieMaxRadius(v: number): this

    pieMinRadius(): number
    pieMinRadius(v: number): this

    pieChartInnerRadius(): number
    pieChartInnerRadius(v: number): this

    pieOtherColor(): string
    pieOtherColor(v: string): this

    pieOtherText(): string
    pieOtherText(v: string): this

    pieStrokeFill(): string
    pieStrokeFill(v: string): this

    pieStrokeWidth(): number
    pieStrokeWidth(v: number): this

    dorling(): boolean
    dorling(v: boolean): this

    pieTotalCode(): string | undefined
    pieTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statPie(config: CompositionStatConfig): this
    statPie(
        /** Config. */
        config: CompositionStatConfig,
        /** Category parameter. */
        categoryParameter?: string,
        /** Category codes. */
        categoryCodes?: string[],
        /** Category labels. */
        categoryLabels?: string[],
        /** Category colors. */
        categoryColors?: string[],
        /** Total code. */
        totalCode?: string
    ): this
}
