import { CompositionStatConfig } from '../CompositionStatConfig'

/**
 * Statistical configuration for coxcomb maps.
 */
export interface CoxcombStatConfig extends CompositionStatConfig<Record<string, Record<string, Record<string, number>>>> {
    /** Eurostat path. */
    timeParameter?: string
    /** Times. */
    times: string[]
    /** Time labels. */
    timeLabels?: string[]
}
