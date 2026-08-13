import type { StatConfig } from './stat/StatConfig'
import type { CompositionStatConfig } from '../layers/composition/CompositionStatConfig'
import type { LegendConfig } from '../legend/LegendConfig'
import type { RankedBarChartConfig } from './decoration/RankedBarChartConfig'
import type { TooltipConfig } from './TooltipConfig'
import type { InsetConfig } from './InsetConfig'
import type { MapInstance as EurostatMap } from './MapInstance'
import type { CoastalMarginSettings } from './decoration/CoastalMarginSettings'
import type { GridCartogramSettings } from './GridCartogramSettings'
import type { DorlingSettings } from './DorlingSettings'
import type { ScalebarConfig } from './decoration/ScalebarConfig'
import type { EncodingConfig } from './encoding/EncodingConfig'
import type { LabelsConfig } from './decoration/LabelsConfig'
import type { PatternFillConfig } from './decoration/PatternFillConfig'
import type { MinimapConfig } from './minimaps'
import type { StampConfig } from './decoration/StampConfig'

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
    /** NUTS level (0, 1, 2, 3), or 'mixed' to let each region use its most granular level. */
    nutsLevel?: number | 'mixed'
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

    /** Tooltip text shown when hovering over the footnote. */
    footnoteTooltipText?: string | false

    /** Wrap footnote text at this many characters. */
    footnoteWrap?: number | false

    /** Text shown in the tooltip and legend for regions with no data. @default 'No data available' */
    noDataText?: string

    /** BCP 47 language tag used when fetching labels from the Eurostat API. @default 'en' */
    language?: string

    /** Duration in milliseconds for D3 transitions when the map updates. Set to 0 to disable. @default 500 */
    transitionDuration?: number

    /**
     * Statistical data configuration.
     *
     * Preferred for multi-dataset maps:
     *  - set named datasets via `stat` dictionary
     *  - bind channels via `encoding`
     */
    stat?: StatConfig | CompositionStatConfig | Record<string, StatConfig | CompositionStatConfig>

    /** Optional visual encoding configuration by channel (size, color, fill, composition, etc.). */
    encoding?: Record<string, EncodingConfig>

    /** Legend configuration. */
    legend?: LegendConfig | false

    /**
     * Ranked bar chart configuration (choropleth-classified map types only). Independent of the
     * legend - has its own positioning and can render into an entirely different container/SVG
     * to the legend's, rather than being a sub-feature of it.
     */
    rankedBarChart?: RankedBarChartConfig | false

    /** Tooltip configuration. */
    tooltip?: TooltipConfig

    /**
     * Inset map configurations. Pass a named preset string, or a custom array, or false to
     * disable. Passing true is an alias for 'default'.
     * - 'default': simple grid layout of overseas territories.
     * - 'image': Malta, Liechtenstein and EU/EFTA overseas/remote territories, hand-tuned
     *   layout with connecting decoration (background box, separator lines, blur gradients).
     * - 'eu': simple grid layout of EU overseas/outermost territories, no decoration.
     * - 'euEfta': like 'eu', plus Liechtenstein and Svalbard, no decoration.
     */
    insets?: InsetConfig[] | 'default' | 'image' | 'eu' | 'euEfta' | true | false

    /** Position [x, y] of the box containing the default/named-preset insets layout. */
    insetBoxPosition?: [number, number]

    /** Padding in pixels around/between insets in the default insets box layout. @default 5 */
    insetBoxPadding?: number

    /** Width in pixels of each inset in the default insets box layout. @default 210 */
    insetBoxWidth?: number

    /** Default NUTS2JSON scale used for insets that don't specify their own. @default '03M' */
    insetScale?: string

    /** Default D3 zoom scale extent for insets. `null` disables zoom on insets. */
    insetZoomExtent?: [number, number] | null

    /** Zoom and pan settings. */
    zoomExtent?: [number, number]

    /** D3 zoom translate extent (pan boundaries), as [[x0, y0], [x1, y1]]. */
    translateExtent?: [[number, number], [number, number]]

    /** If true, panning is disabled until the user has zoomed at least once. @default true */
    lockPanUntilZoom?: boolean

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

    /**
     * Get or set label configuration for country names, statistical values, etc.
     * @example map.labels({ values: true, backgrounds: true, backgroundFill: '#B19122' })
     */
    labels?: LabelsConfig | false

    /** Fires once the map is built. */
    onBuild?: (map: EurostatMap) => void

    /** Scalebar configuration. Can be boolean or configuration object. */
    scalebar?: ScalebarConfig | boolean

    /**
     * Annotation configuration, rendered via the d3-svg-annotation library.
     * `annotations` is an array of d3-svg-annotation annotation objects; each object's `type`
     * may be one of 'annotationLabel' (default), 'annotationCallout', 'annotationCalloutRect',
     * 'annotationCalloutCircle', 'annotationXYThreshold', resolved to the matching d3-svg-annotation
     * function internally.
     */
    annotations?: { annotations: any[]; editMode?: boolean }

    /** Grid cartogram enabled or disabled. */
    gridCartogram?: boolean

    /** Custom geometry filtering function. */
    filterGeometriesFunction?: (geometry: any) => boolean

    /** Toggle background map rendering (sea, country boundaries, etc.). */
    backgroundMap?: boolean

    /** Minimap (globe inset showing current viewport) configuration. */
    minimap?: MinimapConfig

    /** Stamp/watermark annotation. @example { x: 10, y: 10, text: 'DRAFT', size: 40 } */
    stamp?: StampConfig | false

    /** Show/hide zoom +/- buttons. */
    zoomButtons?: boolean

    /**
     * Show/hide inset map toggle button.
     * When true and no insets are configured, the map automatically uses insets('default').
     */
    insetsButton?: boolean

    /** Show/hide legend toggle button. */
    legendButton?: boolean

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

    /** Show the Eurostat logo. */
    showEstatLogo?: boolean

    /** Position adjustment for Eurostat logo: [x, y] */
    logoPosition?: [number, number]

    /** Width in pixels of the Eurostat logo. @default 200 */
    logoWidth?: number

    /** Height in pixels of the Eurostat logo. @default 40 */
    logoHeight?: number

    /** Show the Eurostat ribbon banner. */
    showEstatRibbon?: boolean

    /** Position adjustment for ribbon banner: [x, y] */
    ribbonPosition?: [number, number]

    /** Width in pixels of the Eurostat ribbon banner. @default 200 */
    ribbonWidth?: number

    /** Height in pixels of the Eurostat ribbon banner. @default 40 */
    ribbonHeight?: number

    /** Position adjustment for zoom buttons: [x, y] */
    zoomButtonsPosition?: [number, number]

    /** Position adjustment for insets button: [x, y] */
    insetsButtonPosition?: [number, number]

    /**
     * Viewport width (px) at/below which insets start hidden (behind the insets button) unless
     * insetsButton was set explicitly. @default 768
     */
    insetsVisibilityBreakpoint?: number

    /** Position adjustment for legend button: [x, y] */
    legendButtonPosition?: [number, number]

    /**
     * Viewport width (px) at/below which the legend starts hidden (behind the legend button)
     * when legendButton is enabled. @default 768
     */
    legendVisibilityBreakpoint?: number

    /** Pointer hover color for NUTS regions. */
    hoverColor?: string

    /** Base fill color for regions with no statistical data. */
    noDataFillStyle?: string

    /** Show the link to the remote Eurostat statistical dataset. */
    showSourceLink?: boolean

    /** Pattern fill (hatching/dots/crosshatch) overlays for specific regions. */
    patternFill?: PatternFillConfig | PatternFillConfig[]

    /** Allow additional properties for extensibility. */
    [key: string]: any
}
