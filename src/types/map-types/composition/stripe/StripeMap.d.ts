import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'

/**
 * Stripe map type.
 */
export interface StripeMap extends MapInstance {
    stripeWidth(): number
    stripeWidth(v: number): this

    stripeOrientation(): number
    stripeOrientation(v: number): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    pieChartRadius(): number
    pieChartRadius(v: number): this

    pieChartInnerRadius(): number
    pieChartInnerRadius(v: number): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statComp(config: CompositionStatConfig): this
    statComp(
        config: CompositionStatConfig,
        categoryParameter?: string,
        categoryCodes?: string[],
        categoryLabels?: string[],
        categoryColors?: string[]
    ): this
}
