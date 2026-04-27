import type { MapInstance } from '../../core/MapInstance'

/**
 * Configuration for sparkline maps.
 */
export interface SparkMapConfig {
    /** Type of sparkline chart: 'line', 'area', or 'bar' */
    sparkType?: 'line' | 'area' | 'bar'

    /** Color for sparkline (or function for dynamic coloring) */
    sparkLineColor?: string | ((value: number, index: number, data: any[]) => string)

    /** Color for area fill (or function for dynamic coloring) */
    sparkAreaColor?: string | ((value: number, index: number, data: any[]) => string)

    /** Width of sparkline chart in pixels */
    sparkLineWidth?: number

    /** Height of sparkline chart in pixels */
    sparkLineHeight?: number

    /** Stroke width for sparkline */
    sparkLineStrokeWidth?: number

    /** Opacity for sparkline */
    sparkLineOpacity?: number

    /** Radius for circles on data points */
    sparkLineCircleRadius?: number

    /** Configuration for tooltip chart */
    sparkTooltipChart?: {
        width: number
        height: number
        margin: { left: number; right: number; top: number; bottom: number }
        circleRadius: number
    }

    /** Position offsets for sparkline placement */
    sparkLineOffsets?: { x: number; y: number }

    /** Show only regions with complete data */
    showOnlyWhenComplete?: boolean

    /** Custom chart rendering function */
    sparkLineChartFunction?: (node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void

    /** Override Y-axis scale */
    sparkYScale?: any
}
