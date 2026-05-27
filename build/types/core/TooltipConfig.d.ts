import type { MapInstance as EurostatMap } from './MapInstance'

/**
 * Configuration for tooltips
 */
export interface TooltipConfig {
    textFunction?: (region: any, map: EurostatMap) => string
    /** Omit regions. */
    omitRegions?: string[]
    /** Max width. */
    maxWidth?: number
    /** Font size. */
    fontSize?: number

    [key: string]: any
}
