import type { StatConfig } from './stat/StatConfig'
import type { StatData } from './stat/StatData'
import type { Layer } from './layer/Layer'
import type { LayerConfig } from './layer/LayerConfig'
import type { CompositionStatConfig } from '../layers/composition/CompositionStatConfig'
import type { LegendConfig } from '../legend/LegendConfig'
import type { TooltipConfig } from './TooltipConfig'
import type { InsetConfig } from './InsetConfig'
import type { CoastalMarginSettings } from './decoration/CoastalMarginSettings'
import type { GridCartogramSettings } from './GridCartogramSettings'
import type { DorlingSettings } from './DorlingSettings'
import type { ScalebarConfig } from './decoration/ScalebarConfig'
import type { EncodingConfig } from './encoding/EncodingConfig'
import type { LocationConfig } from './locations'

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
    stat(): StatConfig | CompositionStatConfig | undefined
    stat(config: StatConfig | CompositionStatConfig): this
    stat(key: string): StatConfig | CompositionStatConfig | undefined
    stat(key: string, config: StatConfig | CompositionStatConfig): this
    /**
     * Legacy compatibility overload for composition channels.
     * Preferred: pass category fields directly inside config.
     */
    stat(
        key: string,
        config: StatConfig | CompositionStatConfig,
        categoryParameter: string,
        categoryCodes?: string[],
        categoryLabels?: string[],
        categoryColors?: string[],
        totalCode?: string
    ): this

    /**
     * Get or set visual encodings that map named stats to visual variables.
     * @example map.encoding('size', { stat: 'population', scale: 'sqrt', range: [4, 30] })
     */
    encoding(): Record<string, EncodingConfig>
    encoding(channel: string): EncodingConfig | undefined
    encoding(channel: string, config: EncodingConfig): this
    encoding(configs: Record<string, EncodingConfig>): this

    /** Returns the stat name for an encoding channel, or fallback when unset. */
    getEncodingStat(channel: string, fallback?: string): string | undefined

    /** Returns stat names for an encoding channel (`stats` or single `stat`). */
    getEncodingStats(channel: string, fallback?: string[]): string[] | undefined

    /** Returns the concrete statData key for a channel/category combination. */
    getEncodingStatKey(channel: string, categoryCode?: string, fallbackStat?: string): string | undefined

    /** Returns the StatData source bound to a channel/category. */
    getEncodingStatData(channel: string, categoryCode?: string, fallbackStat?: string): StatData | undefined

    /** Returns a region value through encoding lookup. */
    getEncodingValue(channel: string, regionId: string, categoryCode?: string, fallbackStat?: string): number | string | undefined

    /** Returns unit text through encoding lookup. */
    getEncodingUnitText(channel: string, categoryCode?: string, fallbackStat?: string): string

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
    legend(): LegendConfig | false
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

    /** Grid cartogram settings (shape, margins, cell padding, layout positions). */
    gridCartogramSettings(): GridCartogramSettings
    gridCartogramSettings(settings: Partial<GridCartogramSettings>): this

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
    coastalMarginSettings(): CoastalMarginSettings
    coastalMarginSettings(settings: Partial<CoastalMarginSettings>): this

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

    /** Scalebar configuration. */
    scalebar(): ScalebarConfig | null
    scalebar(config: ScalebarConfig | boolean): this

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

    /** Returns the D3 selection of the SVG element. */
    svg(): any
    svg(s: any): this

    /** Add or replace a custom point location marker. */
    addLocation(config: LocationConfig): this

    /** Remove a custom point location marker by id. */
    removeLocation(id: string): this

    /** Remove all custom point location markers. */
    clearLocations(): this

    /** Get or replace all custom point location markers. */
    locations(): LocationConfig[]
    locations(configs: LocationConfig[] | null | undefined): this

    /** Redraw custom point location markers. */
    updateLocations(): this

    /** Custom geometry filtering function. */
    filterGeometriesFunction(): ((geometry: any) => boolean) | undefined
    filterGeometriesFunction(fn: (geometry: any) => boolean): this

    /** Grid cartogram enabled or disabled. */
    gridCartogram(): boolean
    gridCartogram(enable: boolean): this

    /** Toggle background map rendering (sea, country boundaries, etc.). */
    backgroundMap(): boolean
    backgroundMap(show: boolean): this

    /** Minimap configuration. */
    minimap(): any
    minimap(config: any): this

    /** Show/hide inset map toggle button. */
    insetsButton(): boolean
    insetsButton(show: boolean): this

    /** Show/hide legend toggle button. */
    legendButton(): boolean
    legendButton(show: boolean): this

    /** Filter function for placename labels. */
    placenamesFilter(): ((name: any) => boolean) | undefined
    placenamesFilter(fn: (name: any) => boolean): this

    /** Use a separate header section for titles. */
    header(): boolean
    header(show: boolean): this

    /** Use a separate footer section for footnotes. */
    footer(): boolean
    footer(show: boolean): this

    /** Padding between the map and footer in pixels. */
    footerPadding(): number | undefined
    footerPadding(padding: number): this

    /** Padding between the header and map in pixels. */
    headerPadding(): number | undefined
    headerPadding(padding: number): this

    /** Position adjustment for map title: [x, y] */
    titlePosition(): [number, number] | undefined
    titlePosition(pos: [number, number]): this

    /** Position adjustment for map subtitle: [x, y] */
    subtitlePosition(): [number, number] | undefined
    subtitlePosition(pos: [number, number]): this

    /** Position adjustment for footnote text: [x, y] */
    footnotePosition(): [number, number] | undefined
    footnotePosition(pos: [number, number]): this

    /** Position adjustment for Eurostat logo: [x, y] */
    logoPosition(): [number, number] | undefined
    logoPosition(pos: [number, number]): this

    /** Position adjustment for ribbon banner: [x, y] */
    ribbonPosition(): [number, number] | undefined
    ribbonPosition(pos: [number, number]): this

    /** Position adjustment for zoom buttons: [x, y] */
    zoomButtonsPosition(): [number, number] | undefined
    zoomButtonsPosition(pos: [number, number]): this

    /** Position adjustment for insets button: [x, y] */
    insetsButtonPosition(): [number, number] | undefined
    insetsButtonPosition(pos: [number, number]): this

    /** Position adjustment for legend button: [x, y] */
    legendButtonPosition(): [number, number] | undefined
    legendButtonPosition(pos: [number, number]): this

    /** Pointer hover color for NUTS regions. */
    hoverColor(): string
    hoverColor(color: string): this

    /** Base fill color for regions with no statistical data. */
    noDataFillStyle(): string
    noDataFillStyle(style: string): this

    /** Show the link to the remote Eurostat statistical dataset. */
    showSourceLink(): boolean
    showSourceLink(show: boolean): this

    /** Pattern fill configurations. */
    patternFill(): any
    patternFill(config: any): this

    /** Dorling. */

    /** Enable Dorling cartogram layout for proportional symbol maps. */
    dorling(): boolean
    dorling(enable: boolean): this

    /** Dorling simulation settings. */
    dorlingSettings(): DorlingSettings
    dorlingSettings(settings: Partial<DorlingSettings>): this

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

    /** Ordered thematic layer stack (bottom → top). */
    layers_: Layer[]
    activeLayerIndex_: number

    activeLayer(): Layer
    layer(ref?: number | string): Layer | undefined
    layers(): Layer[]
    layers(configs: LayerConfig[]): this
    addLayer(type: string, config?: LayerConfig): Layer
    addLayer(config: LayerConfig): Layer
    removeLayer(ref: number | string): this
    activeLayerIndex(): number
    activeLayerIndex(i: number): this
    updateAllLayers(): this

    /** Allow additional map-type-specific properties and methods. */
    [key: string]: any
}
