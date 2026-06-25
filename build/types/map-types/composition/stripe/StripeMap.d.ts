import type { MapInstance } from '../../../core/MapInstance'
import type { CompositionStatConfig } from '../CompositionStatConfig'
import type { StripeCompositionLegendConfig } from '../../../legend/composition/StripeCompositionLegendConfig'

/**
 * Stripe map type.
 */
export interface StripeMap extends MapInstance {
    legend(): StripeCompositionLegendConfig | false
    legend(config: StripeCompositionLegendConfig | false): this

    stripeSettings(): {
        width: number
        orientation: number
        otherColor: string
        otherText: string
    }
    stripeSettings(v: { width?: number; orientation?: number; otherColor?: string; otherText?: string }): this

    /** @deprecated Use stripeSettings({ width }) */
    stripeWidth(): number
    /** @deprecated Use stripeSettings({ width }) */
    stripeWidth(v: number): this

    /** @deprecated Use stripeSettings({ orientation }) */
    stripeOrientation(): number
    /** @deprecated Use stripeSettings({ orientation }) */
    stripeOrientation(v: number): this

    catColors(): any
    catColors(v: any): this

    catLabels(): any
    catLabels(v: any): this

    /** @deprecated Use stripeSettings({ otherColor }) */
    stripeOtherColor(): string
    /** @deprecated Use stripeSettings({ otherColor }) */
    stripeOtherColor(v: string): this

    /** @deprecated Use stripeSettings({ otherText }) */
    stripeOtherText(): string
    /** @deprecated Use stripeSettings({ otherText }) */
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
    /** @deprecated Legacy positional signature. Prefer statStripe({ categoryParameter, categoryCodes, ... }). */
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
