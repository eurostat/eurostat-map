/**
 * Statistical configuration for sparkline maps.
 *
 * Either `eurostatDatasetCode` + `dates` (Eurostat API path)
 * or `customData` (custom data path) must be provided.
 */
export interface SparkStatConfig {
    /**
     * Custom data keyed by region ID then date string.
     * Use instead of `eurostatDatasetCode` when supplying data directly.
     * When `customData` is set, `eurostatDatasetCode` is not required;
     * `dates` defaults to the key order of the first region's entries.
     * @example
     * customData: {
     *   ES: { '2020': 100, '2021': 120, '2022': 115 },
     *   DE: { '2020': 200, '2021': 190, '2022': 210 },
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
    /** Date keys to fetch. Required when not using `customData`. */
    dates?: string[]
    /** Display labels for each date. */
    labels?: string[]
}
