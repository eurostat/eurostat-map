/**
 * Configuration for the ranked bar chart map element: one horizontal bar per region, sorted by
 * value, labeled with its id and value. Colored by the region's own class color on map/layer types
 * that classify regions into colored classes (choropleth, proportional symbols' color encoding),
 * or a flat fallback color otherwise. Above an internal region-count threshold, falls back
 * automatically to the histogram distribution view instead of drawing one bar per region.
 *
 * A standalone chart element - not a legend and not a sub-feature of one, and deliberately not an
 * extension of LegendConfig: it has its own container/positioning and doesn't carry the
 * legend-only concepts (no-data swatch, max/min labels, etc.) that don't apply to it. Set via
 * `map.rankedBarChart(config)`, separately from `map.legend(config)`.
 */
export interface RankedBarChartConfig {
    /** Id of the SVG element to render the chart into. Can be a completely different container/
     * SVG to the legend's. @default an internally-generated id */
    svgId?: string
    /** Chart origin x-coordinate in pixels. */
    x?: number
    /** Chart origin y-coordinate in pixels. */
    y?: number
    /** Automatically position the chart in a map corner. Manual x/y coordinates take precedence. */
    position?: 'top right' | 'bottom right' | 'top left' | 'bottom left'
    /** Approximate box width in pixels, used only as a fallback when auto-positioning in a corner
     * without explicit x/y. @default 150 */
    width?: number
    /** Maximum total height in pixels for the rendered chart (title/subtitle + bars). When the
     * natural height of all bars would exceed this, bar height and label font size are both
     * scaled down proportionally so the chart never grows taller than this budget. Omit to let
     * the chart grow to fit its content - its natural height with ~35 EU/EFTA/CC regions can
     * easily exceed a map's own height. */
    height?: number

    /** Chart title text. */
    title?: string
    /** Chart subtitle text. */
    subtitle?: string

    /** Inner spacing around the chart content in pixels. @default 7 */
    boxPadding?: number
    /** Background opacity of the chart's box. @default 0.9 */
    boxOpacity?: number
    /** Apply the chart box's background opacity (boxOpacity) only while the map is currently
     * zoomed in (scale != 1). Purely a box-opacity concern - does not affect hover interactions
     * (e.g. hover-to-highlight), which always work regardless of zoom state. */
    onlyApplyOpacityWhileZoomed?: boolean

    /** Bar height in pixels, before any height-based scaling (see height). @default 20 */
    shapeHeight?: number
    /** Label font size in pixels, before any height-based scaling (see height).
     * @default read from the .em-legend-label CSS class */
    labelFontSize?: number
    /** Custom formatter for each region's value label. */
    labelFormatter?: ((value: number, index?: number) => string) | null
    /** Number of decimal places for auto-formatted value labels. Auto-detected when undefined. */
    decimals?: number

    /** Sort bars in ascending order of value when true, descending when false. @default true */
    ascending?: boolean

    /** Limit which regions appear to a political grouping: EU member states, EU + EFTA, or
     * EU + EFTA + EU candidate countries. Applied before the region-count threshold that
     * triggers the histogram distribution fallback. Omit (default) to show every region with
     * a value, unfiltered. */
    countryGroup?: 'eu' | 'euEfta' | 'euEftaCc'
}
