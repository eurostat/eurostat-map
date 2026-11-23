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
