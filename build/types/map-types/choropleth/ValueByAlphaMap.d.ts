import type { MapInstance } from '../../core/MapInstance'

/**
 * Value-by-alpha choropleth map type.
 */
export interface ValueByAlphaMap extends MapInstance {
	opacityScale(): ((value: number) => number) | null
	opacityScale(v: ((value: number) => number) | null): this
}
