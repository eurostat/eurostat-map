/**
 * Configuration for histogram display in choropleth legends.
 * Shows the distribution of data values across classification bins as bars.
 */
export interface HistogramLegendConfig {
    /** Orientation of the histogram bars. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'

    /** Whether to show count values on the bars. @default false */
    showCounts?: boolean

    /** Whether to show percentage values on the bars. @default false */
    showPercentages?: boolean

    /** Rotation angle for axis labels in degrees. @default 0 */
    labelRotation?: number

    /** Margins around the histogram. @default { top: 0, right: 0, bottom: 0, left: 0 } */
    margin?: { top: number; right: number; bottom: number; left: number }

    /** Height of the histogram in pixels. @default 200 */
    height?: number

    /** Width of the histogram in pixels. @default 270 */
    width?: number
}
