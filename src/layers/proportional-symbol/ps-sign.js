// How proportional symbols show negative values (net migration, balances...): the size is that of the amount whatever
// its sign, and the colour or an outline tells the sign apart. Nothing changes for data without negative values.

export const DEFAULT_POSITIVE_FILL = '#2c7bb6'
export const DEFAULT_NEGATIVE_FILL = '#d7191c'
export const OUTLINE_STROKE_WIDTH = 1.5

/**
 * @param {*} statData the size dataset
 * @returns {boolean} whether any of its values is a number below zero
 */
export function hasNegativeValues(statData) {
    return !!statData?.getArray?.()?.some((v) => v !== ':' && v !== '' && Number(v) < 0)
}

/**
 * Wraps a size scale so that a negative value gets the size of the same positive amount.
 * @param {*} scale a size scale of core/scale.js
 */
export function sizeByMagnitude(scale) {
    return Object.assign((v) => scale(Math.abs(+v)), scale)
}

/** Whether the author chose their own colours for the two signs. */
const hasSignColors = (layer) => layer.psPositiveFill_ !== undefined || layer.psNegativeFill_ !== undefined

/**
 * The look of one symbol on a map that has negative values. An outline is a transparent (but still hoverable) fill.
 *
 * @param {*} layer the proportional symbol layer
 * @param {boolean} negative the sign of the symbol's value
 * @param {string=} classColor the symbol's colour when colour shows a second variable
 * @returns {{fill: string, outline: string=}}
 */
export function getSignStyle(layer, negative, classColor) {
    // one colour for both signs (a second variable, or a single symbol colour chosen by the author)
    let single = classColor
    if (single === undefined && layer._psFillChosen && !hasSignColors(layer)) single = layer.psFill_
    if (single !== undefined) return negative ? { fill: 'transparent', outline: single } : { fill: single }

    if (negative) return { fill: layer.psNegativeFill_ ?? DEFAULT_NEGATIVE_FILL }
    return { fill: layer.psPositiveFill_ ?? (layer._psFillChosen ? layer.psFill_ : DEFAULT_POSITIVE_FILL) }
}

/** Whether the land behind the symbols is neutral, so that it favours neither sign. */
export function usesNeutralBackground(layer) {
    return !!layer._psSigned && !layer.classifierColor_ && (hasSignColors(layer) || !layer._psFillChosen)
}
