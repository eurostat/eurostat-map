import { LegendConfig } from './LegendConfig'

/**
 * Configuration for categorical map legends.
 * Used to display a legend with colored rectangles representing different categories.
 */
export interface CategoricalLegendConfig extends LegendConfig {
    /**
     * Custom order for legend elements. If not specified, uses the domain order from the classifier.
     * Provide an array of category codes in the desired display order.
     */
    order?: string[]
}
