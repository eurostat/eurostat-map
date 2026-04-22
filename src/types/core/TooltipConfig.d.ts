/**
 * Configuration for tooltips
 */
export interface TooltipConfig {
    textFunction?: (region: any, map: EurostatMap) => string
    omitRegions?: string[]
    maxWidth?: number
    fontSize?: number

    [key: string]: any
}
