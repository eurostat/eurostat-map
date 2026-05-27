import type { MapConfig } from '../../core/MapConfig'

/**
 * Configuration for sparkline maps.
 */
export interface SparkMapConfig extends MapConfig {
    sparkType?: 'line' | 'area' | 'bar'
    sparkLineColor?: string | ((value: number, index: number, data: any[]) => string)
    sparkAreaColor?: string | ((value: number, index: number, data: any[]) => string)
    sparkLineWidth?: number
    sparkLineHeight?: number
    sparkLineStrokeWidth?: number
    sparkLineOpacity?: number
    sparkLineCircleRadius?: number
    sparkTooltipChart?: {
        width: number
        height: number
        margin: { left: number; right: number; top: number; bottom: number }
        circleRadius: number
    }
    sparkLineOffsets?: { x: number; y: number }
    showOnlyWhenComplete?: boolean
    sparkLineChartFunction?: (node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void
    sparkYScale?: any
}
