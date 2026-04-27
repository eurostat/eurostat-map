/**
 * Statistical configuration for composition maps (pie, bar, waffle, stripe).
 */
export interface CompositionStatConfig {
    eurostatDatasetCode?: string
    filters?: Record<string, any>
    unitText?: string

    categoryParameter?: string
    categoryCodes?: string[]
    categoryLabels?: string[]
    categoryColors?: string[]
    totalCode?: string

    // Legacy nested API supported by buildStatCompositionMethod
    stat?: {
        eurostatDatasetCode?: string
        filters?: Record<string, any>
        unitText?: string
    }
}

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

/**
 * Statistical configuration for coxcomb maps.
 */
export interface CoxcombStatConfig extends CompositionStatConfig {
    // Eurostat path
    timeParameter?: string
    times: string[]
    timeLabels?: string[]

    // Custom data path
    customData?: Record<string, Record<string, Record<string, number>>>
}
