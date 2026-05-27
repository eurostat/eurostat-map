import { LegendConfig } from './LegendConfig'

/**
 * Configuration for pattern fill legends.
 * Used to display a legend showing hatching/pattern options for regions.
 * The pattern fill legend is typically appended below the main choropleth legend.
 */
export interface PatternFillLegendConfig extends LegendConfig {
    // Inherits all properties from LegendConfig
    // Pattern fill legends use the base configuration for display
}
