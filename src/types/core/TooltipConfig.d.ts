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
    /**
     * Fixed decimal places for the tooltip's displayed value (choropleth maps). Preserves
     * trailing zeros (e.g. 7 -> "7.0") that the default formatter otherwise drops. Defaults to
     * the max precision seen across the stat dataset's own values when unset.
     */
    decimals?: number

    [key: string]: any
}
