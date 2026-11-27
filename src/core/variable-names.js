// A readable name for a variable of a legend that the author has not named.

/** keys the library uses itself: they say nothing to a reader */
const PLACEHOLDER_KEYS = ['default', 'color', 'size', 'v1', 'v2', 'v3', 'x', 'y']

/** The dimensions whose category differs between a dataset and others of the same Eurostat title. */
function distinguishing(dataset, others) {
    const own = dataset.metadata?.dimensions || {}
    const same = others.filter((o) => o !== dataset && o?.metadata?.label === dataset.metadata.label)
    return Object.keys(own)
        .filter((dimension) => same.some((o) => o.metadata.dimensions?.[dimension] !== own[dimension]))
        .map((dimension) => own[dimension])
        .filter(Boolean)
}

/**
 * The first of these that exists: the statistic's `label`; its Eurostat dataset title, with the categories that tell it
 * from another variable of the same dataset; the name the author gave the statistic.
 *
 * @param {*} map
 * @param {string} key the statistic's name
 * @param {string[]=} allKeys the names of all the variables of the legend
 * @returns {string|undefined}
 */
export function getVariableName(map, key, allKeys = [key]) {
    const dataset = map.statData_?.[key]
    if (dataset?.label_) return dataset.label_
    const title = dataset?.metadata?.label
    if (title) {
        const others = allKeys.map((k) => map.statData_?.[k])
        const parts = distinguishing(dataset, others)
        if (parts.length) return `${title} (${parts.join(', ')})`
        // the same name for two variables would tell the reader nothing
        if (!others.some((o) => o !== dataset && o?.metadata?.label === title)) return title
    }
    return PLACEHOLDER_KEYS.includes(key) ? undefined : key
}

/**
 * Breaks a long name into lines for a legend, cutting it off with an ellipsis after the last one.
 * @param {string} text
 * @param {number=} width the longest line, in characters
 * @param {number=} maxLines
 * @returns {string[]}
 */
export function wrapName(text, width = 24, maxLines = 3) {
    const lines = []
    String(text)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => {
            const last = lines.length - 1
            if (last >= 0 && lines[last].length + word.length + 1 <= width) lines[last] += ' ' + word
            else lines.push(word)
        })
    if (lines.length <= maxLines) return lines
    // the end of a long title often holds what tells it apart, e.g. "(Females)": keep a closing bracket
    const bracket = String(text).match(/\([^()]*\)\s*$/)?.[0]
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].slice(0, width - 1).replace(/[\s,]+$/, '') + '…'
    if (bracket && !kept.join(' ').includes(bracket)) kept.push(bracket)
    return kept
}
