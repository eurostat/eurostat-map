/**
 * Statistical configuration for composition maps (pie, bar, waffle, stripe).
 */
export interface CompositionStatConfig {
    eurostatDatasetCode?: string
    filters?: Record<string, any>
    unitText?: string
    transform?: (value: number) => number

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
        transform?: (value: number) => number
    }
}
