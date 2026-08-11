import type { MapInstance } from '../../core/MapInstance'
import type { SparkStatConfig } from './SparkStatConfig'
import type { SparklineLegendConfig } from '../../legend/composition/SparklineLegendConfig'
import type { SparkSettings } from './SparkMapConfig'

/**
 * Spark map type.
 */
export interface SparkMap extends MapInstance {
    sparkSettings(): SparkSettings
    sparkSettings(v: SparkSettings): this

    legend(): SparklineLegendConfig | false
    legend(config: SparklineLegendConfig | false): this

    sparkLineColor(): string | ((value: number, index: number, data: any[]) => string)
    sparkLineColor(v: string | ((value: number, index: number, data: any[]) => string)): this

    showOnlyWhenComplete(): boolean
    showOnlyWhenComplete(v: boolean): this

    sparkType(): 'line' | 'area' | 'bar'
    sparkType(v: 'line' | 'area' | 'bar'): this

    sparkLineWidth(): number
    sparkLineWidth(v: number): this

    sparkLineHeight(): number
    sparkLineHeight(v: number): this

    sparkLineStrokeWidth(): number
    sparkLineStrokeWidth(v: number): this

    sparkLineOpacity(): number
    sparkLineOpacity(v: number): this

    sparkLineCircleRadius(): number
    sparkLineCircleRadius(v: number): this

    /** Alias for the areaColor setting (backward-compatible name). */
    sparkLineAreaColor(): string | ((value: number, index: number, data: any[]) => string)
    sparkLineAreaColor(v: string | ((value: number, index: number, data: any[]) => string)): this

    sparkTooltipChart(): { width: number; height: number; margin: { left: number; right: number; top: number; bottom: number }; circleRadius: number }
    sparkTooltipChart(v: {
        width: number
        height: number
        margin: { left: number; right: number; top: number; bottom: number }
        circleRadius: number
    }): this

    sparkLineChartFunction(): ((node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void) | undefined
    sparkLineChartFunction(v: (node: any, data: any[], width: number, height: number, isForTooltip?: boolean) => void): this

    sparkLineOffsets(): { x: number; y: number }
    sparkLineOffsets(v: { x: number; y: number }): this

    /** Manually set sparkline data instead of fetching it from Eurostat. */
    sparklineData(dataObject: Record<string, Record<string, number>>): this
    /** Configure fetching data from Eurostat and generating spark lines. */
    statSpark(config: SparkStatConfig): this
}
