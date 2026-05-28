import type { StatConfig } from './stat/StatConfig'
import type { LegendConfig } from '../legend/LegendConfig'
import type { TooltipConfig } from './TooltipConfig'
import type { InsetConfig } from './InsetConfig'
import type { MapInstance as EurostatMap } from './MapInstance'
import type { CoastalMarginSettings } from './decoration/CoastalMarginSettings'
import type { GridCartogramSettings } from './GridCartogramSettings'
import type { DorlingSettings } from './DorlingSettings'
import type { ScalebarConfig } from './decoration/ScalebarConfig'

/**
 * Base configuration for all map types. Each specific map type will extend this with its own properties, but these are the common ones that apply to all maps.
 */
export interface MapConfig {
    /** Container settings. */
    svgId?: string
    /** ID of the container element used to host the map. */
    containerId?: string

    /** Geographic settings. */
    /**
     * NUTS2json geometries projection: '3035', '3857', '4326'.
     * For custom projections, use 4326 and then set projectionFunction().
     */
    proj?: string
    /** Function to set a custom projection. See d3-geo projections for examples. */
    projectionFunction?: () => any
    /** Scale of the map, for NUTSjson geometries. */
    scale?: '60M' | '20M' | '10M' | '03M' | '01M'
    /** NUTS level (0, 1, 2, 3). */
    nutsLevel?: number
    /** NUTS boundary year. */
    nutsYear?: number | string
    /** Geographic center as [longitude, latitude]. */
    geoCenter?: [number, number]

    /** Geometry settings. */
    /**
     * NUTS2JSON geographic focus (e.g., 'EUR', 'WORLD', 'IC', 'GF').
     * See https://github.com/eurostat/Nuts2json#overseas-territories---map-insets
     */
    geo?: string

    /** Map dimensions. */
    width?: number
    /** Map height in pixels. */
    height?: number

    /** Map texts. */
    /** Map title. */
    title?: string
    /** Map subtitle. */
    subtitle?: string
    /** Footnote text shown below the map. */
    footnote?: string
    /** Data source text. */
    source?: string

    /** Statistical data configuration. */
    stat?: StatConfig

    /** Legend configuration. */
    legend?: LegendConfig | false

    /** Tooltip configuration. */
    tooltip?: TooltipConfig

    /** Insets (small additional maps). */
    insets?: InsetConfig[]

    /** Zoom and pan settings. */
    zoomExtent?: [number, number]

    /** Grid cartogram layout settings. */
    gridCartogramSettings?: Partial<GridCartogramSettings>

    /** Dorling simulation settings. */
    dorlingSettings?: Partial<DorlingSettings>

    /** Show or hide the coastal margin effect. */
    drawCoastalMargin?: boolean
    /** Coastal margin settings to override defaults. */
    coastalMarginSettings?: Partial<CoastalMarginSettings>

    /** Graticule. */
    drawGraticule?: boolean

    /** Labels. */
    labelling?: boolean

    /** Fires once the map is built. */
    onBuild?: (map: EurostatMap) => void

    /** Scalebar configuration. Can be boolean or configuration object. */
    scalebar?: ScalebarConfig | boolean

    /** Grid cartogram enabled or disabled. */
    gridCartogram?: boolean

    /** Custom geometry filtering function. */
    filterGeometriesFunction?: (geometry: any) => boolean

    /** Toggle background map rendering (sea, country boundaries, etc.). */
    backgroundMap?: boolean

    /** Minimap configuration. */
    minimap?: any

    /** Show/hide zoom +/- buttons. */
    zoomButtons?: boolean

    /** Show/hide inset map toggle button. */
    insetsButton?: boolean

    /** Show/hide placename labels. */
    placenames?: boolean

    /** Filter function for placename labels. */
    placenamesFilter?: (name: any) => boolean

    /** Use a separate header section for titles. */
    header?: boolean

    /** Use a separate footer section for footnotes. */
    footer?: boolean

    /** Padding between the map and footer in pixels. */
    footerPadding?: number

    /** Padding between the header and map in pixels. */
    headerPadding?: number

    /** Position adjustment for map title: [x, y] */
    titlePosition?: [number, number]

    /** Position adjustment for map subtitle: [x, y] */
    subtitlePosition?: [number, number]

    /** Position adjustment for footnote text: [x, y] */
    footnotePosition?: [number, number]

    /** Position adjustment for Eurostat logo: [x, y] */
    logoPosition?: [number, number]

    /** Position adjustment for ribbon banner: [x, y] */
    ribbonPosition?: [number, number]

    /** Position adjustment for zoom buttons: [x, y] */
    zoomButtonsPosition?: [number, number]

    /** Position adjustment for insets button: [x, y] */
    insetsButtonPosition?: [number, number]

    /** Pointer hover color for NUTS regions. */
    hoverColor?: string

    /** Base fill color for regions with no statistical data. */
    noDataFillStyle?: string

    /** Show the link to the remote Eurostat statistical dataset. */
    showSourceLink?: boolean

    /** Pattern fill configurations. */
    patternFill?: any

    /** Allow additional properties for extensibility. */
    [key: string]: any
}
