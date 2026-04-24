import type { MapInstance } from '../core/MapInstance'

/** Base legend configuration */
export interface LegendConfig {
  title?: string
  titleFontSize?: number
  labelFontSize?: number
  labelDelimiter?: string
  noDataText?: string
}

/** Creates a legend instance */
export function legend(config?: LegendConfig): any
