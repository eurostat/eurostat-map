import type { StatConfig } from './stat/StatConfig'
import type { LegendConfig } from '../legend/LegendConfig'
import type { TooltipConfig } from './TooltipConfig'
import type { InsetConfig } from './InsetConfig'
import type { MapInstance as EurostatMap } from './MapInstance'

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
    legend?: LegendConfig

    /** Tooltip configuration. */
    tooltip?: TooltipConfig

    /** Insets (small additional maps). */
    insets?: InsetConfig[]

    /** Zoom and pan settings. */
    zoomExtent?: [number, number]

    /** Coastal margin. */
    coastal?: boolean

    /** Graticule. */
    drawGraticule?: boolean

    /** Labels. */
    labelling?: boolean

    /** Fires once the map is built. */
    onBuild?: (map: EurostatMap) => void

    /** Allow additional properties for extensibility. */
    [key: string]: any
}
