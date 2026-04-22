/**
 * Main MapInstance object with builder pattern methods
 */
export interface MapInstance {
    // Container methods
    svgId(): string
    svgId(id: string): this

    containerId(): string
    containerId(id: string): this

    // Dimension methods
    width(): number
    width(w: number): this

    height(): number
    height(h: number): this

    // Geographic methods
    scale(): number | string
    scale(s: number | string): this

    proj(): string
    proj(p: string): this

    nutsLevel(): number
    nutsLevel(level: number): this

    nutsYear(): number | string
    nutsYear(year: number | string): this

    geo(): string
    geo(g: string): this

    geoCenter(): [number, number]
    geoCenter(center: [number, number]): this

    pixSize(): number
    pixSize(size: number): this

    // Visual methods
    title(): string
    title(t: string): this

    subtitle(): string
    subtitle(t: string): this

    backgroundColor(): string
    backgroundColor(color: string): this

    // Statistical data methods (overloaded)
    stat(): StatConfig
    stat(config: StatConfig): this
    stat(key: string): any
    stat(key: string, value: any): this

    // Legend methods
    legend(): LegendConfig
    legend(config: LegendConfig): this

    // Tooltip methods
    tooltip(): TooltipConfig
    tooltip(config: TooltipConfig): this

    // Zoom methods
    zoomExtent(): [number, number]
    zoomExtent(extent: [number, number]): this

    // Build and update methods
    build(): this
    update(): this
    updateClassification(): this

    // Data methods
    statData(): StatData
    statData(key: string): StatData

    // Language
    language(): string
    language(lang: string): this

    // Callbacks
    onBuild(): ((map: EurostatMap) => void) | undefined
    onBuild(callback: (map: EurostatMap) => void): this

    // Export methods
    exportSVG(): void

    // Allow additional properties
    [key: string]: any
}
