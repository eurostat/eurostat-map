import type { MapInstance as EurostatMap } from './MapInstance'

/**
 * Configuration for tooltips
 */
export interface TooltipConfig {
    /** Custom tooltip text/HTML builder, called with the hovered region/symbol datum and the
     * map instance. @example (region, map) => `<b>${region.properties.na}</b>` */
    textFunction?: (region: any, map: EurostatMap) => string

    /** Region IDs to skip showing/updating the tooltip for. */
    omitRegions?: string[]

    /**
     * Fixed decimal places for the tooltip's displayed value (choropleth maps). Preserves
     * trailing zeros (e.g. 7 -> "7.0") that the default formatter otherwise drops. Defaults to
     * the max precision seen across the stat dataset's own values when unset.
     */
    decimals?: number

    /** Show status flags (e.g. estimated/provisional) next to the value. Pass 'short' for the
     * raw flag code instead of the expanded label. @default false */
    showFlags?: boolean | 'short'

    /** Id of the container element used to constrain the tooltip's position/bounds.
     * @default the map's containerId, or svgId, or 'map' */
    containerId?: string

    /** Id of the tooltip's own `<div>` element. @default `em-tooltip-${containerId}` */
    id?: string

    /** Pixel offset {x, y} of the tooltip from the pointer. Takes precedence over xOffset/yOffset. */
    offset?: { x?: number; y?: number }

    /** X pixel offset of the tooltip from the pointer, used when offset.x is unset. @default 30 */
    xOffset?: number
    /** Y pixel offset of the tooltip from the pointer, used when offset.y is unset. @default 20 */
    yOffset?: number

    /** Opacity of the tooltip when shown. @default 1 */
    opacity?: number

    [key: string]: any
}
