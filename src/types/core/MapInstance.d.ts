import type { StatConfig } from './stat/StatConfig'
import type { StatData } from './stat/StatData'
import type { LegendConfig } from '../legend/LegendConfig'
import type { TooltipConfig } from './TooltipConfig'
import type { InsetConfig } from './InsetConfig'

/**
 * A eurostat-map instance. Created by eurostatmap.map() and extended
 * by each concrete map type. All getter/setter methods follow the same
 * pattern: call with no argument to get, call with a value to set and
 * return the instance for chaining.
 */
export interface MapInstance {
    /** Container. */

    /** ID of the target SVG element. @default 'map' */
    svgId(): string
    svgId(id: string): this

    /** ID of the wrapper container element. */
    containerId(): string
    containerId(id: string): this

    /** Dimensions. */

    /** Map width in pixels. @default min(795, window.innerWidth) */
    width(): number
    width(w: number): this

    /** Map height in pixels. 0 = auto (85% of width). */
    height(): number
    height(h: number): this

    /** Geography. */

    /**
     * NUTS2JSON geographic focus area.
     * @example 'EUR' | 'WORLD' | 'PT' | 'MT' | 'IC'
     */
    geo(): string
    geo(g: string): this

    /**
     * EPSG projection code for NUTS2JSON geometries.
     * Use '4326' when setting a custom projectionFunction.
     * @default '3035'
     */
    proj(): string
    proj(p: string): this

    /**
     * NUTS2JSON geometry resolution.
     * @default '20M'
     */
    scale(): string
    scale(s: '60M' | '20M' | '10M' | '03M' | '01M'): this

    /** NUTS level to display. @default 3 */
    nutsLevel(): number | 'mixed'
    nutsLevel(level: number | 'mixed'): this

    /** NUTS boundaries year. @default 2024 */
    nutsYear(): number
    nutsYear(year: number): this

    /**
     * Initial map viewport. x/y in projected coordinates, z is pixel size
     * (map units per screen pixel — smaller = more zoomed in).
     * @example map.position({ x: 4800000, y: 3400000, z: 6000 })
     */
    position(v: { x?: number; y?: number; z?: number }): this
    position(): { x: number; y: number; z: number }

    /**
     * Custom D3 projection function. When set, also call proj('4326').
     * @example map.projectionFunction(d3.geoAzimuthalEquidistant().rotate([-10, -52]))
     */
    projectionFunction(): any
    projectionFunction(fn: any): this

    /** Text and labels. */

    /** Map title. */
    title(): string
    title(t: string): this

    /** Map subtitle. */
    subtitle(): string
    subtitle(t: string): this

    /**
     * Footnote text shown at the bottom of the map.
     * Defaults to the standard EuroGeographics copyright notice.
     */
    footnote(): string | false
    footnote(text: string | false): this

    /** Tooltip text shown when hovering over the footnote. */
    footnoteTooltipText(): string | false
    footnoteTooltipText(text: string | false): this

    /** Wrap footnote text at this many characters. */
    footnoteWrap(): number | false
    footnoteWrap(chars: number | false): this

    /** Statistical data. */

    /**
     * Get or set statistical data configuration.
     * - `map.stat()` → returns the default stat config
     * - `map.stat(config)` → sets the default stat config
     * - `map.stat('v1')` → returns the stat config for key 'v1'
     * - `map.stat('v1', config)` → sets the stat config for key 'v1'
     * @example map.stat({ eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2024' } })
     */
    stat(): StatConfig
    stat(config: StatConfig): this
    stat(key: string): StatConfig
    stat(key: string, config: StatConfig): this

    /**
     * Get or set the StatData instance for a given key.
     * Use setData() on the returned instance to supply custom data.
     * @example map.statData().setData({ DE: 120, FR: 95 })
     */
    statData(): StatData
    statData(key: string): StatData
    statData(key: string, data: StatData): this

    /**
     * Returns the time dimension value from the loaded Eurostat dataset.
     * Useful for displaying the data period in the map title.
     * @example map.onBuild(() => map.title('Population ' + map.getTime()))
     */
    getTime(): string | undefined

    /** Text shown for regions with no data. @default 'No data available' */
    noDataText(): string
    noDataText(text: string): this

    /** BCP 47 language tag for Eurostat API labels. @default 'en' */
    language(): string
    language(lang: string): this

    /** Legend. */

    /**
     * Get or set legend configuration. Pass false to remove the legend.
     * @example map.legend({ x: 10, y: 90, title: 'Density, people/km²' })
     */
    legend(): LegendConfig
    legend(config: LegendConfig | false): this

    /** Force-update the legend after data or style changes. */
    updateLegend(): this

    /** Tooltip. */

    /** Get or set tooltip configuration. */
    tooltip(): TooltipConfig
    tooltip(config: TooltipConfig): this

    /** Zoom and pan. */

    /**
     * D3 zoom scale extent [min, max].
     * @example map.zoomExtent([1, 10])
     */
    zoomExtent(): [number, number]
    zoomExtent(extent: [number, number]): this

    /** Show zoom +/- buttons. @default true */
    zoomButtons(): boolean
    zoomButtons(show: boolean): this

    /** Insets. */

    /**
     * Inset map configurations. Pass 'default' for the standard
     * eurostat overseas territory insets, false to disable.
     * @example map.insets('default')
     * @example map.insets([{ geo: 'MT' }, { geo: 'LI' }])
     */
    insets(): InsetConfig[] | 'default' | false
    insets(config: InsetConfig[] | 'default' | false): this

    /** Decoration. */

    /** Show/hide the graticule (coordinate grid lines). */
    drawGraticule(): boolean
    drawGraticule(show: boolean): this

    /** Show/hide the coastal margin shadow effect. */
    drawCoastalMargin(): boolean
    drawCoastalMargin(show: boolean): this

    /** Coastal margin appearance settings. */
    coastalMarginSettings(): object
    coastalMarginSettings(settings: object): this

    /** Show/hide placename labels loaded from the placenames layer. */
    placenames(): boolean
    placenames(show: boolean): this

    /** Geographic label configuration. See docs/reference.md#labelling */
    labels(): object | undefined
    labels(config: object): this

    /** Annotation configuration for d3-svg-annotation. */
    annotations(): any
    annotations(config: any): this

    /** Stamp/watermark annotation. @example { x: 10, y: 10, text: 'DRAFT', size: 40 } */
    stamp(): object | undefined
    stamp(config: { x: number; y: number; text: string; size?: number }): this

    /** Scalebar visibility. */
    showScalebar(): boolean
    showScalebar(show: boolean): this

    /** Scalebar position [x, y] in pixels. */
    scalebarPosition(): [number, number]
    scalebarPosition(pos: [number, number]): this

    /** Show the Eurostat logo. */
    showEstatLogo(): boolean
    showEstatLogo(show: boolean): this

    /** Show the Eurostat ribbon banner. */
    showEstatRibbon(): boolean
    showEstatRibbon(show: boolean): this

    /** Dorling. */

    /** Enable Dorling cartogram layout for proportional symbol maps. */
    dorling(): boolean
    dorling(enable: boolean): this

    /** Animate the Dorling simulation. @default true */
    animateDorling(): boolean
    animateDorling(animate: boolean): this

    /** Dorling simulation gravity strength. @default { x: 1, y: 1 } */
    dorlingStrength(): { x: number; y: number }
    dorlingStrength(strength: { x: number; y: number }): this

    /** Number of Dorling collision detection iterations. @default 1 */
    dorlingIterations(): number
    dorlingIterations(n: number): this

    /** Minimum distance between Dorling circles. Negative allows overlap. @default 0 */
    dorlingPadding(): number
    dorlingPadding(padding: number): this

    /** Events. */

    /** Called when the user finishes a zoom gesture. */
    onZoomEnd(): ((event: any) => void) | undefined
    onZoomEnd(fn: (event: any) => void): this

    /** Called continuously while the user is zooming. */
    onZoom(): ((event: any) => void) | undefined
    onZoom(fn: (event: any) => void): this

    /** Called when the pointer enters a NUTS region. */
    onRegionMouseOver(): ((event: MouseEvent, regionId: string, props: any) => void) | undefined
    onRegionMouseOver(fn: (event: MouseEvent, regionId: string, props: any) => void): this

    /** Called when the pointer moves over a NUTS region. */
    onRegionMouseMove(): ((event: MouseEvent, regionId: string, props: any) => void) | undefined
    onRegionMouseMove(fn: (event: MouseEvent, regionId: string, props: any) => void): this

    /** Called when the pointer leaves a NUTS region. */
    onRegionMouseOut(): ((event: MouseEvent, regionId: string, props: any) => void) | undefined
    onRegionMouseOut(fn: (event: MouseEvent, regionId: string, props: any) => void): this

    /** Called when a NUTS region is clicked. */
    onRegionClick(): ((event: MouseEvent, regionId: string, props: any) => void) | undefined
    onRegionClick(fn: (event: MouseEvent, regionId: string, props: any) => void): this

    /**
     * Callback fired once after the map has fully built (geo + stat data loaded).
     * Receives the map instance as its only argument.
     * @example map.onBuild(m => console.log('Map ready', m))
     */
    onBuild(): ((map: MapInstance) => void) | undefined
    onBuild(callback: (map: MapInstance) => void): this

    /** Build and update. */

    /**
     * Builds the map from scratch. Call once after initial configuration.
     * @example
     * eurostatmap.map('choropleth')
     *   .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
     *   .build()
     */
    build(): this

    /** Re-fetches geo data and rebuilds map geometry. */
    updateGeoData(): this

    /** Re-fetches all stat datasets and refreshes the map. */
    updateStatData(): this

    /** Re-applies classification and styling from currently loaded data. */
    updateStatValues(): this

    /** Updates data classification (class breaks, thresholds). */
    updateClassification(): this

    /** Re-applies visual styling (colors, symbol sizes). */
    updateStyle(): this

    /** Recalculates header/footer layout and resizes the SVG. */
    recalculateLayout(): void

    /** Export. */

    /**
     * Exports the map as an SVG file and triggers a browser download.
     * Computed CSS styles are inlined before export.
     */
    exportMapToSVG(): this

    /**
     * Exports the map as a PNG file and triggers a browser download.
     * @param width - Output width in pixels. Defaults to SVG width.
     * @param height - Output height in pixels. Defaults to SVG height.
     */
    exportMapToPNG(width?: number, height?: number): Promise<this>

    /** Misc. */

    /**
     * Sets map attributes from URL parameters.
     * Supported params: w, h, x, y, z, s, lvl, time, proj, geo, ny, language, numberOfClasses
     */
    setFromURL(): this

    /** D3 transition duration in milliseconds for map updates. @default 500 */
    transitionDuration(): number
    transitionDuration(ms: number): this

    /** SVG filter/pattern definition function for fill patterns. */
    filtersDefinitionFunction(): ((svg: any, numberOfClasses: number) => void) | undefined
    filtersDefinitionFunction(fn: (svg: any, numberOfClasses: number) => void): this

    /** Returns region centroids as an array of projected coordinate pairs. */
    regionCentroids(): Array<{ id: string; x: number; y: number }>

    /** Allow additional map-type-specific properties and methods. */
    [key: string]: any
}
