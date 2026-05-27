/**
 * Statistical configuration for sparkline maps.
 */
export interface SparkStatConfig {
    /** Eurostat dataset code. */
    eurostatDatasetCode: string
    /** Filters. */
    filters?: Record<string, any>
    /** Unit text. */
    unitText?: string
    transform?: (value: number) => number
    /** Dates. */
    dates: string[]
    /** Labels. */
    labels?: string[]
}
