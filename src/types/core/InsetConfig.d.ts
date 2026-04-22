/**
 * Configuration for map insets (smaller additional maps)
 */
export interface InsetConfig {
    geo?: string // Geographic code (e.g., 'MT', 'PT20', 'CARIB')
    title?: string
    scale?: string | number
    width?: number
    height?: number
    x?: number
    y?: number
    proj?: string

    [key: string]: any
}
