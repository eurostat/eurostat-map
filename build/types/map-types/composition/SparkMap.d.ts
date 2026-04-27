import type { MapInstance } from '../../core/MapInstance'
import type { SparkStatConfig } from './CompositionStatConfig'

/**
 * Spark map type.
 */
export interface SparkMap extends MapInstance {
    sparkLineColor(): any
    sparkLineColor(v: any): this

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

    sparkLineAreaColor(): any
    sparkLineAreaColor(v: any): this

    sparkTooltipChart(): any
    sparkTooltipChart(v: any): this

    sparkLineChartFunction(): any
    sparkLineChartFunction(v: any): this

    sparkLineOffsets(): { x: number; y: number }
    sparkLineOffsets(v: { x: number; y: number }): this

    sparklineData(dataObject: Record<string, Record<string, number>>): this
    statSpark(config: SparkStatConfig): this
}
