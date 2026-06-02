/**
 * Statistical configuration for composition maps (pie, bar, waffle, stripe).
 *
 * Either `eurostatDatasetCode` + `categoryParameter` (Eurostat API path)
 * or `customData` (custom data path) must be provided.
 */
export interface CompositionStatConfig {
    /**
     * Custom data keyed by region ID then category code.
     * Use instead of `eurostatDatasetCode` when supplying data directly.
     * When `customData` is set, `eurostatDatasetCode` and `categoryParameter`
     * are not required.
     * @example
     * customData: {
     *   ES: { cat1: 2, cat2: 3, cat3: 5 },
     *   DE: { cat1: 4, cat2: 1, cat3: 6 },
     * }
     */
    customData?: Record<string, Record<string, number>>

    /** Eurostat dataset code. Required when not using `customData`. */
    eurostatDatasetCode?: string
    /** Filters. */
    filters?: Record<string, any>
    /** Unit text. */
    unitText?: string
    transform?: (value: number) => number

    /** Category parameter. Required when not using `customData`. */
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
