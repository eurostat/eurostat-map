/** Names of the Eurostat visual style guide single-hue colour palettes. */
export type EurostatSingleHue =
    | 'cornflower'
    | 'cobalt'
    | 'darkOrchid'
    | 'fuchsia'
    | 'berry'
    | 'sunsetRed'
    | 'sienna'
    | 'darkGold'
    | 'forestGreen'
    | 'teal'
    | 'plum'

/** Base colour of each Eurostat single-hue palette. */
export const EUROSTAT_SINGLE_HUES: Record<EurostatSingleHue, string>

/** Whether a string names a Eurostat single-hue palette (case-insensitive). */
export function isSingleHueName(name: unknown): name is EurostatSingleHue

/** Light-to-dark palette of `n` colours for a named Eurostat single hue. */
export function singleHuePalette(name: EurostatSingleHue, n: number): string[]

/**
 * A diverging scheme named after the two single hues it joins, e.g. 'cobalt-plum': the first hue for the
 * lowest values, a light neutral at the point of divergence, the second hue for the highest values.
 * Any two different single hues can be joined; see EUROSTAT_DIVERGING_SCHEMES for combinations that work well.
 */
export type EurostatDivergingScheme = `${EurostatSingleHue}-${EurostatSingleHue}`

/** Diverging scheme names that work well together. */
export const EUROSTAT_DIVERGING_SCHEMES: EurostatDivergingScheme[]

/** Whether a string names a diverging scheme, i.e. two different single hues joined by a hyphen (case-insensitive). */
export function isDivergingName(name: unknown): name is EurostatDivergingScheme

/** A function t in [0, 1] to a hex colour: the first hue at 0, the neutral at 0.5, the second hue at 1. */
export function divergingInterpolator(name: EurostatDivergingScheme): (t: number) => string

/**
 * Colours for a classed diverging map, lowest class first. Classes below the point of divergence step from
 * the first hue towards the neutral, classes above step from the neutral to the second hue; a class that
 * contains the point of divergence (`neutral`) takes the neutral colour.
 */
export function divergingClassColors(name: EurostatDivergingScheme, nBelow: number, neutral: boolean, nAbove: number): string[]

/** `n` colours for a diverging scheme with the point of divergence in the middle of the classes. */
export function divergingPalette(name: EurostatDivergingScheme, n: number): string[]
