import { CompositionStatConfig } from '../CompositionStatConfig'

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
