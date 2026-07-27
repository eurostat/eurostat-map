import type { LegendConfig } from '../LegendConfig'

/**
 * Configuration for the ranked bar chart element on choropleth-classified maps: one horizontal
 * bar per region, sorted by value, colored by the region's own class color, labeled with its id
 * and value. Above an internal region-count threshold, falls back automatically to the histogram
 * distribution view instead of drawing one bar per region.
 *
 * Independent of the legend - has its own positioning (inherited from LegendConfig's x/y/
 * position/width fields) and can render into an entirely different container/SVG to the
 * legend's, rather than being a sub-feature of it. Set via `map.rankedBarChart(config)`,
 * separately from `map.legend(config)`.
 */
export interface RankedBarChartConfig extends LegendConfig {}
