import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { StripeCompositionLegendConfig } from '../../../legend/composition/StripeCompositionLegendConfig'

/**
 * Stripe map type.
 */
export interface StripeMap extends MapInstance {
    legend(): StripeCompositionLegendConfig | false
    legend(config: StripeCompositionLegendConfig | false): this

    stripeWidth(): number
    stripeWidth(v: number): this

    stripeOrientation(): number
    stripeOrientation(v: number): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    stripeOtherColor(): string
    stripeOtherColor(v: string): this

    stripeOtherText(): string
    stripeOtherText(v: string): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    noDataFillStyle(): string
    noDataFillStyle(v: string): this

    pieChartRadius(): number
    pieChartRadius(v: number): this

    pieChartInnerRadius(): number
    pieChartInnerRadius(v: number): this

    stripeTotalCode(): string | undefined
    stripeTotalCode(v: string | undefined): this

    statCodes(): string[] | undefined
    statCodes(v: string[] | undefined): this

    statStripe(config: CompositionStatConfig): this
    statStripe(
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
