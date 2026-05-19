export interface TrivariateLegendConfig {
    /** Width of the legend in pixels. @default 160 */
    width?: number
    /** Height of the legend in pixels. @default 160 */
    height?: number
    /** Padding around the ternary plot. @default { top: 50, right: 50, bottom: 10, left: 50 } */
    padding?: { top: number; right: number; bottom: number; left: number }
    /** Plot type. @default 'continuous' */
    type?: 'continuous' | 'discrete'
    /** Whether to show the center point and guide lines. @default true */
    showCenter?: boolean
    /** Label for the center annotation. @default 'Average' */
    centerLabel?: string
    /** Whether to show grid lines. @default false */
    showLines?: boolean
    /** Number of minor grid subdivisions between major grid lines. @default 5 */
    minorSubdivisions?: number
    /** Axis corner labels. @default ['Variable 1', 'Variable 2', 'Variable 3'] */
    labels?: [string, string, string]
    /** Position of axis labels. @default 'edge' */
    labelPosition?: 'corner' | 'edge'
    /** Whether colour is applied to triangles or data points. @default 'points' */
    colorTarget?: 'triangles' | 'points'
    /** Whether to render data points. @default true */
    showData?: boolean
    /** Offsets for the center annotation label and curve. */
    centerAnnotationOffsets?: { labelX: number; labelY: number; curveX: number; curveY: number }
    /** Legend title. */
    title?: string
    /** Legend subtitle. */
    subtitle?: string
}
