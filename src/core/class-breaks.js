// What to do when data cannot fill the requested classes, or is not numeric at all.
import { reportMapError } from './errors.js'

/** methods whose boundaries come from the data values themselves */
const DATA_DRIVEN = ['quantile', 'jenks', 'ckmeans']

/**
 * The class boundaries to use instead of the computed ones, when ties or too few distinct values would repeat
 * boundaries and so create classes that no value can fall into.
 *
 * @param {number[]} values the numeric data
 * @param {number[]} breaks the computed boundaries (a class starts at its boundary)
 * @param {string} method the classification method
 * @param {number=} requested the number of classes asked for
 * @returns {number[]|null} the new boundaries (one class more than their number), or null to keep the computed ones
 */
export function mergeClassBreaks(values, breaks, method, requested = breaks.length + 1) {
    const distinct = [...new Set(values)].sort((a, b) => a - b)
    if (!distinct.length) return null
    if (distinct.length === 1) return breaks.length ? [] : null

    // fewer values than classes: one class per value
    if (DATA_DRIVEN.includes(method) && distinct.length < requested) {
        return distinct.slice(1).map((v, i) => (distinct[i] + v) / 2)
    }

    const useful = [...new Set(breaks)].filter((b) => b > distinct[0] && b <= distinct[distinct.length - 1])
    return useful.length < breaks.length ? useful : null
}

/**
 * Moves the boundary nearest to the point of divergence onto it, keeping the number of classes.
 *
 * @param {number[]} breaks the computed boundaries
 * @param {number[]} values the numeric data
 * @param {number} pivot the point of divergence
 * @returns {number[]|null} the new boundaries, or null when there is nothing to move: no values on one side of the
 * pivot, no boundary, or one already there
 */
export function breakAtPivot(breaks, values, pivot) {
    if (!breaks.length || breaks.includes(pivot)) return null
    if (!values.some((v) => v < pivot) || !values.some((v) => v >= pivot)) return null
    let nearest = 0
    breaks.forEach((b, i) => {
        if (Math.abs(b - pivot) < Math.abs(breaks[nearest] - pivot)) nearest = i
    })
    return breaks.map((b, i) => (i === nearest ? pivot : b))
}

/**
 * Reports values that a numeric map cannot draw (shown as unavailable), such as '1,5'.
 *
 * @param {*} map the main map
 * @param {Array<*>} values the raw values of a dataset
 * @param {Object=} categories raw values that are categories of their own, not numbers
 */
export function reportNonNumericValues(map, values, categories) {
    const bad = (values || []).filter(
        (v) => v !== ':' && v !== '' && v != null && !(categories && Object.prototype.hasOwnProperty.call(categories, v)) && !Number.isFinite(Number(v))
    )
    if (!bad.length) return
    const message = `${bad.length} value${bad.length > 1 ? 's are not numbers' : ' is not a number'}, for example '${bad[0]}', and shown as unavailable. Use a dot as the decimal separator.`
    console.warn('[eurostat-map] ' + message)
    reportMapError(map, { type: 'data', message })
}
