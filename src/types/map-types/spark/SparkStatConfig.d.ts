/**
 * Statistical configuration for sparkline maps.
 */
export interface SparkStatConfig {
    eurostatDatasetCode: string
    filters?: Record<string, any>
    unitText?: string
    transform?: (value: number) => number
    dates: string[]
    labels?: string[]
}
