/**
 * Configuration for map insets (smaller additional maps)
 */
export interface InsetConfig {
    /** Geographic code (e.g., 'MT', 'PT20', 'CARIB'). */
    geo?: string
    /** Title. */
    title?: string
    /** Scale. */
    scale?: string | number
    /** Width. */
    width?: number
    /** Height. */
    height?: number
    /** X. */
    x?: number
    /** Y. */
    y?: number
    /** Proj. */
    proj?: string

    [key: string]: any
}
