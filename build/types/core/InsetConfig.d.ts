import type { LabelsConfig } from './decoration/LabelsConfig'
import type { ScalebarConfig } from './decoration/ScalebarConfig'

/**
 * Configuration for map insets (smaller additional maps, e.g. overseas territories)
 */
export interface InsetConfig {
    /** Geographic code (e.g., 'MT', 'PT20', 'CARIB'). */
    geo?: string
    /** Title. */
    title?: string
    /** Position of the title, relative to the inset's top-left corner. */
    titlePosition?: [number, number]
    /** Subtitle. */
    subtitle?: string
    /** Position of the subtitle, relative to the inset's top-left corner. */
    subtitlePosition?: [number, number]
    /** Scale. Named nuts2json scale (e.g. '01M', '03M', '10M', '20M', '60M') or a number. */
    scale?: string | number
    /** Width. */
    width?: number
    /** Height. */
    height?: number
    /** X position of the inset within the inset box. */
    x?: number
    /** Y position of the inset within the inset box. */
    y?: number
    /** Proj. */
    proj?: string
    /** Id of the `<svg>` element the inset is drawn into. Auto-generated if omitted. */
    svgId?: string
    /** Manual re-centering/zoom of the inset's own projection. */
    position?: { x?: number; y?: number; z?: number }
    /** Label rendering settings for this inset. */
    labels?: LabelsConfig
    /** Whether to show zoom buttons on this inset. @default false */
    zoomButtons?: boolean
    /** Custom base URL for this inset's nuts2json boundary data. */
    nuts2jsonBaseURL?: string
    /** Custom D3 projection function for this inset. */
    projectionFunction?: Function | boolean

    /** Show/hide the graticule (coordinate grid lines) for this inset. @default false */
    drawGraticule?: boolean

    /** Show/hide zoom +/- buttons for this inset. @default false */
    zoomButtons?: boolean

    /** D3 zoom scale extent [min, max] for this inset. */
    zoomExtent?: [number, number]

    /** Show the link to the remote Eurostat statistical dataset for this inset. @default false */
    showSourceLink?: boolean

    /** Footnote text shown below this inset. @default '' */
    footnote?: string

    /** Function to adjust calculated centroids for this inset's symbols/labels. */
    processCentroids?: (centroidFeatures: any[]) => any[]

    /** Stroke width in pixels applied to this inset's frame (`.em-frame`). Unset hides the frame. */
    frameStrokeWidth?: number

    /** Scalebar settings for this inset. `true` uses the default scalebar config. */
    scalebar?: ScalebarConfig | boolean

    /** @deprecated Use `scalebar: { show: true }` instead. */
    showScalebar?: boolean
    /** @deprecated Use `scalebar: { position: [x, y] }` instead. */
    scalebarPosition?: [number, number]
    /** @deprecated Use `scalebar: { tickHeight }` instead. */
    scalebarTickHeight?: number
    /** @deprecated Use `scalebar: { segmentHeight }` instead. */
    scalebarSegmentHeight?: number
    /** Scalebar label font size in pixels. */
    scalebarFontSize?: number
    /** @deprecated Use `scalebar: { units }` instead. */
    scalebarUnits?: string
    /** @deprecated Use `scalebar: { textOffset }` instead. */
    scalebarTextOffset?: [number, number]
    /** @deprecated Use `scalebar: { maxWidth }` instead. */
    scalebarMaxWidth?: number
    /** Minimum width of the scalebar in pixels. */
    scalebarMinWidth?: number

    /** Nested insets belonging to this inset (e.g. bivariate choropleth per-inset legend classification). */
    insets?: InsetConfig[]
    /** Position of nested insets' inset box, relative to this inset. */
    insetBoxPosition?: [number, number]

    [key: string]: any
}
