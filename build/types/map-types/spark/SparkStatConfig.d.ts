/**
 * Statistical configuration for sparkline maps.
 */
export interface SparkStatConfig {
    eurostatDatasetCode: string
    filters?: Record<string, any>
    unitText?: string
    dates: string[]
    labels?: string[]
}
