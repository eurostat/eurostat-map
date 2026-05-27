/**
 * Statistical configuration for composition maps (pie, bar, waffle, stripe).
 */
export interface CompositionStatConfig {
    /** Eurostat dataset code. */
    eurostatDatasetCode?: string
    /** Filters. */
    filters?: Record<string, any>
    /** Unit text. */
    unitText?: string
    transform?: (value: number) => number

    /** Category parameter. */
    categoryParameter?: string
    /** Category codes. */
    categoryCodes?: string[]
    /** Category labels. */
    categoryLabels?: string[]
    /** Category colors. */
    categoryColors?: string[]
    /** Total code. */
    totalCode?: string

    /** Legacy nested API supported by buildStatCompositionMethod. */
    stat?: {
        /** Eurostat dataset code. */
        eurostatDatasetCode?: string
        /** Filters. */
        filters?: Record<string, any>
        /** Unit text. */
        unitText?: string
        transform?: (value: number) => number
    }
}
