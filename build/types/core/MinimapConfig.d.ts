/**
 * Configuration for the minimap globe feature.
 */
export interface MinimapConfig {
    /** Size of the minimap in pixels. @default 150 */
    size?: number
    /** Debounce delay in milliseconds for updating the minimap during zoom/pan. @default 3 */
    debounce?: number
    /** Position [x, y] in pixels. If not specified, positioned in top-left corner */
    position?: [number, number]
}
