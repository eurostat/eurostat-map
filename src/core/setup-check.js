// Mistakes that would otherwise give an empty or unexpected map without a word. Those that leave the map without data
// reach map.onError(); the others are console warnings. Each message is given once per map.
import { reportConfigError } from './errors.js'
import { suggestOption } from './option-check.js'

export const ENCODING_CHANNELS = ['fill', 'color', 'size', 'x', 'y', 'composition', 'opacity', 'ring', 'height', 'width', 'left', 'right', 'alpha', 'v1', 'v2', 'v3']

/** ISO country codes that NUTS spells differently */
const NUTS_CODES = { GR: 'EL', GB: 'UK' }

const warnOnce = function (map, message) {
    map._configWarnings = map._configWarnings || new Set()
    if (map._configWarnings.has(message)) return
    map._configWarnings.add(message)
    console.warn('[eurostat-map] ' + message)
}

/** The NUTS spelling of a region id that is not on the map, if it has one that is. */
const nutsSpelling = (id, onMap) => {
    const text = String(id)
    const upper = text.toUpperCase()
    const country = upper.slice(0, 2)
    const candidate = (NUTS_CODES[country] || country) + upper.slice(2)
    return candidate !== text && onMap.has(candidate) ? candidate : undefined
}

/**
 * Compares the ids of a dataset the caller supplied with those of the map's regions.
 * @param {string[]} ids the dataset's region ids
 * @param {Set<string>} onMap the ids of the regions
 * @returns {{matches: number, suggestions: string[]}}
 */
export function compareRegionIds(ids, onMap) {
    let matches = 0
    const suggestions = []
    ids.forEach((id) => {
        if (onMap.has(id)) return matches++
        const better = nutsSpelling(id, onMap)
        if (better) suggestions.push(`'${better}' instead of '${id}'`)
    })
    return { matches, suggestions }
}

const regionIds = function (map) {
    const ids = new Set()
    const add = (item) => {
        if (Array.isArray(item)) item.forEach(add)
        else if (item?.properties?.id) ids.add(item.properties.id)
    }
    Object.values(map.Geometries?.geoJSONs || {}).forEach(add)
    return ids
}

/** @param {*} map the main map, once its geometry and data are there */
export function checkMapSetup(map) {
    const layers = map.layers_?.length ? map.layers_ : [map]

    layers.forEach((layer) => {
        Object.entries(layer.encodings_ || {}).forEach(([channel, encoding]) => {
            if (!ENCODING_CHANNELS.includes(channel)) {
                const suggestion = suggestOption(channel, ENCODING_CHANNELS)
                warnOnce(
                    map,
                    `Unknown encoding channel '${channel}'` +
                        (suggestion ? `: did you mean '${suggestion}'?` : `. Channels: ${ENCODING_CHANNELS.join(', ')}.`)
                )
            }
            const names = encoding?.stats || (encoding?.stat ? [encoding.stat] : [])
            names.forEach((name) => {
                if (map.stat_?.[name] || map.statMeta_?.[name] || map.statData_?.[name]?.hasData()) return
                reportConfigError(map, `encoding('${channel}') uses a statistic named '${name}', which does not exist.`)
            })
        })

        const method = layer.classificationMethod_
        if (method === 'threshold' && layer._defaultThresholds && layer.thresholds_ === layer._defaultThresholds) {
            warnOnce(map, "The 'threshold' classification needs thresholds([...]): without them the map has two classes, split at 0.")
        }
    })

    const onMap = regionIds(map)
    if (!onMap.size) return
    Object.values(map.statData_ || {}).forEach((dataset) => {
        // Eurostat answers include codes that are not on the map: only the caller's own data is checked
        if (dataset.eurostatDatasetCode_ || !dataset.hasData()) return
        const ids = Object.keys(dataset.get())
        const { matches, suggestions } = compareRegionIds(ids, onMap)
        if (matches === ids.length) return
        const hint = suggestions.length ? ` Did you mean ${suggestions.slice(0, 3).join(', ')}?` : ''
        if (!matches) {
            reportConfigError(
                map,
                `None of the data's region ids is on this map (for example '${ids[0]}'). Check the ids and nutsLevel().` + hint
            )
        } else if (suggestions.length) warnOnce(map, 'Some region ids of the data are not on this map.' + hint)
    })
}
