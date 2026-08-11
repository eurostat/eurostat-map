/**
 * Configuration for a single fill pattern overlay applied to specific regions.
 * Pass an array of these to `map.patternFill([...])` to hatch/dot/cross-hatch specific
 * regions on top of their normal fill (e.g. to flag missing/estimated data).
 */
export interface PatternFillConfig {
    /** Built-in pattern name, or any string when using a customPattern with a matching id. @default 'hatching' */
    pattern?: 'hatching' | 'crosshatch' | 'dots' | (string & {})

    /** Region IDs to apply this pattern to. */
    regionIds?: string[]

    /** Stroke/dot color for the pattern. @default '#000' */
    color?: string

    /** Stroke width (hatching/crosshatch) or dot radius (dots). @default 1 */
    strokeWidth?: number

    /** Distance between repeated pattern elements in pixels. @default 8 */
    spacing?: number

    /**
     * Raw SVG markup for a custom `<pattern>` element, used instead of a built-in pattern.
     * Must include an `id` attribute; that id is then used to reference the pattern.
     * @example '<pattern id="my-pattern" ...>...</pattern>'
     */
    customPattern?: string

    /** Label shown for this pattern in the legend. Patterns without a label are omitted from the legend. */
    legendLabel?: string

    /** Internal: resolved pattern element id, set automatically. */
    patternId?: string
}
