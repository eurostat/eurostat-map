import { MapConfig } from '../../core/MapConfig'
import type { EurostatSingleHue, EurostatDivergingScheme } from '../../core/color-palettes'
import type { ChoroplethLegendConfig } from '../../legend/choropleth/ChoroplethLegendConfig'

/**
 * Configuration specific to choropleth maps
 */
export interface ChoroplethConfig extends MapConfig {
    /** Choropleth legend configuration. */
    legend?: ChoroplethLegendConfig | false

    /** Classification. */
    numberOfClasses?: number
    /** Classification method. */
    classificationMethod?: 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'
    /** Thresholds. */
    thresholds?: number[]
    /** Make classif nice. */
    makeClassifNice?: boolean

    /** Colors: an array of class colours, or the name of a Eurostat single-hue palette ('teal') or diverging scheme ('cobalt-plum'). */
    colors?: string[] | EurostatSingleHue | EurostatDivergingScheme
    colorFunction?: (t: number) => string
    /** Color scheme type. */
    colorSchemeType?: 'discrete' | 'continuous'
    /** Function mapping a class index (or category ecl code) and the number of classes to a fill color. */
    classToFillStyle?: (ecl: number | string, numberOfClasses: number) => string

    /** No-data styling. */
    noDataFillStyle?: string

    /** Fill style for extra categorical values mixed into this choropleth's classification,
     * keyed by the raw data value (e.g. `{ '-': '#cccccc' }` for regions whose value is the
     * string '-'). Matching regions get their own legend/tooltip entry instead of being
     * classified numerically or treated as generic "no data". */
    categoryFillStyle?: { [rawValue: string]: string }
    /** Legend/tooltip text for each extra category, keyed by the same raw data value as
     * `categoryFillStyle`. Ex.: `{ '-': 'No railway lines' }` */
    categoryText?: { [rawValue: string]: string }

    /** Value transformation (for continuous schemes). */
    valueTransform?: (x: number) => number
    valueUntransform?: (x: number) => number
    /** Skip normalization. */
    skipNormalization?: boolean

    /** Diverging schemes. */
    /** Named stretching of the colour distribution of a continuous scheme: 'linear', 'sqrt' (square root), 'cbrt' (cube root) or 'log'. It is applied to the distance from the point of divergence, or from the lowest value, and sets valueTransform and valueUntransform. */
    colorStretch?: 'linear' | 'sqrt' | 'cbrt' | 'log' | null
    pointOfDivergence?: number | null
    /** Put a class boundary exactly at pointOfDivergence (default 0), so values on its two sides never share a class. @default false */
    divergingBreak?: boolean
}
