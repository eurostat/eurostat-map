import type { MapConfig } from '../../core/MapConfig'
import type { SparklineLegendConfig } from '../../legend/composition/SparklineLegendConfig'
import type { SparkStatConfig } from './SparkStatConfig'

export interface SparkSettings {
    type?: 'line' | 'area' | 'bar'
    lineOffsets?: { x: number; y: number }
    lineWidth?: number
    lineHeight?: number
    lineStrokeWidth?: number
    lineOpacity?: number
    lineColor?: string | ((value: number, index: number, data: any[]) => string)
    areaColor?: string | ((value: number, index: number, data: any[]) => string)
    lineCircleRadius?: number
    tooltipChart?: {
        width: number
        height: number
        margin: { left: number; right: number; top: number; bottom: number }
        circleRadius: number
    }
    lineChartFunction?: (node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void
}

/**
 * Configuration for sparkline maps.
 */
export interface SparkMapConfig extends MapConfig {
    /**
     * Statistical data configuration. For sparkline maps, pass a `dates`-keyed
     * SparkStatConfig (equivalent to calling `.statSpark(...)`) rather than a plain
     * single-value StatConfig.
     */
    stat?: SparkStatConfig

    /** Grouped sparkline rendering settings. */
    sparkSettings?: SparkSettings

    /** Spark type. */
    sparkType?: 'line' | 'area' | 'bar'

    sparkLineColor?: string | ((value: number, index: number, data: any[]) => string)
    sparkAreaColor?: string | ((value: number, index: number, data: any[]) => string)
    /** Spark line width. */
    sparkLineWidth?: number
    /** Spark line height. */
    sparkLineHeight?: number
    /** Spark line stroke width. */
    sparkLineStrokeWidth?: number
    /** Spark line opacity. */
    sparkLineOpacity?: number
    /** Spark line circle radius. */
    sparkLineCircleRadius?: number
    /** Spark tooltip chart. */
    sparkTooltipChart?: {
        /** Width. */
        width: number
        /** Height. */
        height: number
        /** Margin. */
        margin: { left: number; right: number; top: number; bottom: number }
        /** Circle radius. */
        circleRadius: number
    }
    /** Spark line offsets. */
    sparkLineOffsets?: { x: number; y: number }
    /** Show only when complete. */
    showOnlyWhenComplete?: boolean
    sparkLineChartFunction?: (node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void
    /** Legend. */
    legend?: SparklineLegendConfig | false
}
