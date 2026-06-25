/**
 * Configuration for mapping a named stat dataset to a visual channel.
 */
export interface EncodingConfig {
    /** Name of a dataset registered with map.stat(name, config). */
    stat?: string
    /** Names of datasets for multi-stat encodings such as bivariate color. */
    stats?: string[]
    /** Whether the encoding is based on raw values or category codes. */
    by?: 'value' | 'category'
    /** Encoding type. */
    type?: 'linear' | 'sqrt' | 'threshold' | 'quantile' | 'categorical' | 'bivariate' | 'trivariate'
    /** Scale type. */
    scale?: 'linear' | 'sqrt' | 'quantile' | 'threshold'
    /** Numeric or color output range. */
    range?: [number, number] | string[]
    /** Explicit encoded values, for example category colors. */
    values?: Record<string, string | number> | Array<string | number>
    /** Labels keyed by category code or value. */
    labels?: Record<string, string> | string[]
    /** Category codes when using array-based values or labels. */
    categoryCodes?: string[]
    /** Number of classes for classified encodings. */
    classes?: number
    /** Threshold values for threshold encodings. */
    thresholds?: number[]
    /** Color scheme name or function. */
    scheme?: string | Function
    /** Optional unit override for this encoding. */
    unitText?: string
}
