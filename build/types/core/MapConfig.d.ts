/**
 * Base configuration for all map types. Each specific map type will extend this with its own properties, but these are the common ones that apply to all maps.
 */
export interface MapConfig {
    // Container settings
    svgId?: string
    containerId?: string

    // Geographic settings
    proj?: string // NUTS2json geometries projection: '3035', '3857', '4326'. For custom projections use 4326, then set the desired projection with projectionFunction()
    projectionFunction?: () => any // Function to set a custom projection. See d3-geo projections for examples.
    scale?: '60M' | '20M' | '10M' | '03M' | '01M' // Scale of the map, for NUTSjson geometries
    nutsLevel?: number // 0, 1, 2, 3
    nutsYear?: number | string
    geoCenter?: [number, number]
    pixSize?: number

    // Geometry settings
    geo?: string // NUTS2JSON Geographic focus (e.g., 'EUR', 'WORLD', 'IC', 'GF') see https://github.com/eurostat/Nuts2json#overseas-territories---map-insets

    // Map dimensions
    width?: number
    height?: number

    // map texts
    title?: string
    subtitle?: string
    bottomText?: string
    botTxtFontSize?: number
    botTxtPadding?: number
    botTxtTooltipMessage?: string
    footnote?: string
    source?: string

    // Statistical data configuration
    stat?: StatConfig

    // Legend configuration
    legend?: LegendConfig

    // Tooltip configuration
    tooltip?: TooltipConfig

    // Insets (small additional maps)
    insets?: InsetConfig[]

    // Zoom and pan settings
    zoomExtent?: [number, number]

    // UI Controls
    showBtns?: boolean // Show zoom buttons

    // Coastal margin
    coastal?: boolean
    coastalMarginWidth?: number
    coastalMarginColor?: string

    // Graticule
    drawGraticule?: boolean
    graticuleStyle?: any

    // Borders
    borderWidth?: number
    borderColor?: string

    // Labels
    labelling?: boolean
    labelSizeThreshold?: number
    labelOpacity?: number

    // Logo
    logoURL?: string

    // Callbacks
    onBuild?: (map: EurostatMap) => void

    // Allow additional properties for extensibility
    [key: string]: any
}
