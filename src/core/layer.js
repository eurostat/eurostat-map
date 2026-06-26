// src/core/layer.js
import { select } from 'd3-selection'
import { getRole } from './layer-registry'
import * as Legend from '../legend/legend'

/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../types/core/layer/Layer').Layer} Layer */
/** @typedef {import('../types/core/layer/LayerConfig').LayerConfig} LayerConfig */

let _layerSeq = 0
const nextLayerId = () => 'layer' + ++_layerSeq

/**
 * Installs the per-layer thematic data/encoding API onto `layer`.
 *
 * Visual encoding CONFIG is read/written on `layer` (layer.encodings_).
 * Statistical DATA is always resolved through the shared `map` (datasets are
 * map-level and loaded once: map.statData_, map.statMeta_).
 *
 * For the legacy facade (the map is its own layer 0) `layer === map`, so every
 * reference resolves to the map exactly as it did before this refactor.
 *
 * This block is relocated VERBATIM (semantics-preserving) from createStatMap().
 *
 * @param {object} layer object the methods are installed on (a Layer, or the map for the facade)
 * @param {object} map   owns the shared data (statData_/statMeta_)
 */
export const attachThematicApi = function (layer, map) {
    layer.encodings_ = layer.encodings_ || {}

    const applyEncodingSideEffects = function (encodings) {
        const color = encodings?.color
        if (!color) return

        if (color.values) {
            layer.catColors_ = layer.catColors_ || {}
            if (Array.isArray(color.values)) {
                const statName = color.stat || layer.encoding('height')?.stat || layer.encoding('composition')?.stat || 'composition'
                const codes = color.categoryCodes || map.statMeta_[statName]?.categoryCodes || layer.statCodes_ || []
                codes.forEach((code, i) => {
                    if (color.values[i] != null) layer.catColors_[code] = color.values[i]
                })
            } else {
                layer.catColors_ = { ...layer.catColors_, ...color.values }
            }
        }

        if (color.labels) {
            layer.catLabels_ = layer.catLabels_ || {}
            if (Array.isArray(color.labels)) {
                const statName = color.stat || layer.encoding('height')?.stat || layer.encoding('composition')?.stat || 'composition'
                const codes = color.categoryCodes || map.statMeta_[statName]?.categoryCodes || layer.statCodes_ || []
                codes.forEach((code, i) => {
                    if (color.labels[i] != null) layer.catLabels_[code] = color.labels[i]
                })
            } else {
                layer.catLabels_ = { ...layer.catLabels_, ...color.labels }
            }
        }
    }

    // Setter returns the layer (which, for the facade, IS the map → preserves the
    // legacy fluent chain). When the MAP forwards this method in Phase 3, the
    // forwarder (forwardChainableMethod) substitutes the map as the return value.
    layer.encoding = function (channel, config) {
        if (!arguments.length) return layer.encodings_
        if (arguments.length === 1) {
            if (typeof channel === 'string' || channel instanceof String) return layer.encodings_[channel]
            layer.encodings_ = { ...layer.encodings_, ...channel }
            applyEncodingSideEffects(channel)
            return layer
        }
        layer.encodings_[channel] = config
        applyEncodingSideEffects({ [channel]: config })
        return layer
    }

    layer.getEncodingStat = (channel, fallback) => layer.encodings_[channel]?.stat || fallback

    layer.getEncodingStats = (channel, fallback) => {
        const e = layer.encodings_[channel]
        if (e?.stats) return e.stats
        if (e?.stat) return [e.stat]
        return fallback
    }

    layer.getEncodingStatKey = (channel, categoryCode, fallbackStat) => {
        const statName = layer.getEncodingStat(channel, fallbackStat || channel)
        if (!categoryCode) return statName
        return map.statMeta_[statName]?.statKeys?.[categoryCode] || statName
    }

    layer.getEncodingStatData = (channel, categoryCode, fallbackStat) => map.statData(layer.getEncodingStatKey(channel, categoryCode, fallbackStat))

    layer.getEncodingValue = (channel, regionId, categoryCode, fallbackStat) =>
        layer.getEncodingStatData(channel, categoryCode, fallbackStat)?.get(regionId)?.value

    layer.getEncodingUnitText = (channel, categoryCode, fallbackStat) => {
        const sd = layer.getEncodingStatData(channel, categoryCode, fallbackStat)
        return sd?.unitText?.() || layer.encodings_[channel]?.unitText || ''
    }

    layer.legend = function (v) {
        if (!arguments.length) return layer.legend_

        if (v === false) {
            const legend = layer.legendObj_
            if (legend) {
                const legendSvg = select('#' + legend.svgId)
                if (legendSvg.size() > 0) {
                    legendSvg.selectAll('*').remove()
                }
            }
            if (map.svg) {
                map.svg()?.select('#em-legend-button').remove()
            }
            layer.legend_ = v
            return layer
        }
        layer.legend_ = v
        if (layer.legendObj_) {
            if (layer.updateClassification) layer.updateClassification()
            if (layer.updateStyle) layer.updateStyle()
            layer.legendObj_.update?.()
        }
        return layer
    }

    return layer
}

/** Returns/creates the DOM group a layer renders into (see plan §6.2). */
const getLayerGroup = function (layer) {
    const map = layer.map
    const svg = map.svg && map.svg()
    if (!svg) return null
    const zoomGroup = svg.select('#em-zoom-group-' + map.svgId_)

    // Base layers paint the shared region paths; their "group" is the zoom group.
    if (layer.role === 'base') return zoomGroup

    const id = 'em-layer-' + layer.id + '-' + map.svgId_
    let g = svg.select('#' + id)
    if (g.empty()) {
        g = zoomGroup
            .append('g')
            .attr('id', id)
            .attr('class', 'em-layer em-layer--' + layer.type)
        orderLayerGroups(map)
    }
    return g
}

/** Re-append overlay groups in stack order so paint order == layers_ order (bottom→top). */
const orderLayerGroups = function (map) {
    const svg = map.svg && map.svg()
    if (!svg) return
    const zoomNode = svg.select('#em-zoom-group-' + map.svgId_).node()
    if (!zoomNode) return
    map.layers_.forEach((l) => {
        if (l.role === 'base') return
        const node = svg.select('#em-layer-' + l.id + '-' + map.svgId_).node()
        if (node) zoomNode.appendChild(node) // appendChild moves the existing node to the end (top)
    })
}

/**
 * Real Layer factory. Used by map.addLayer() for REGISTERED types (Phase 3+).
 * In Phase 1 this is exercised only by the unit test (no type registers yet).
 *
 * @param {MapInstance} map
 * @param {LayerConfig} config
 * @returns {Layer}
 */
export const createLayer = function (map, config = {}) {
    const layer = {}
    layer.map = map
    layer.isLayer = true
    layer.id = config.id || nextLayerId()
    layer.type = config.type
    layer.role = config.role || getRole(config.type)

    layer.encodings_ = {}
    layer.catColors_ = undefined
    layer.catLabels_ = undefined
    layer.statCodes_ = undefined
    layer.legend_ = config.legend
    layer.legendObj_ = undefined
    layer.tooltip_ = config.tooltip || {}
    layer.noDataFillStyle_ = config.noDataFillStyle || map.noDataFillStyle_ || '#bcbcbc'

    // Abstract render methods — the type's decorate() overrides these in Phase 3+.
    layer.updateClassification = function () {
        console.log('Layer updateClassification not implemented (' + layer.type + ')')
        return layer
    }
    layer.updateStyle = function () {
        console.log('Layer updateStyle not implemented (' + layer.type + ')')
        return layer
    }
    layer.getLegendConstructor = function () {
        console.log('Layer getLegendConstructor not implemented (' + layer.type + ')')
        return Legend.legend
    }

    layer.group = function () {
        return getLayerGroup(layer)
    }

    attachThematicApi(layer, map)

    // Seed encodings from config.
    if (config.encoding) layer.encoding(config.encoding)

    return layer
}

/**
 * Tags the MAP as its own layer 0 (the legacy facade) and installs the thematic
 * API on it. Called once by createStatMap. Behaviour-identical to the pre-refactor
 * inline definitions, because layer === map.
 *
 * @param {MapInstance} map
 */
export const makeMapSelfLayer = function (map) {
    map.isLayer = true
    map.layerId_ = map.layerId_ || 'layer-self-' + map.svgId_
    map.role = map.role || getRole(map._mapType)
    // For the facade, group() is simply the zoom group (legacy types manage their
    // own DOM the old way); defined so activeLayer().group() never throws.
    if (!map.group) {
        map.group = function () {
            const svg = map.svg && map.svg()
            return svg ? svg.select('#em-zoom-group-' + map.svgId_) : null
        }
    }
    attachThematicApi(map, map)
    return map
}

/**
 * Forwards plain thematic FIELDS on the map to its active layer, so legacy callers
 * reading map.<field> transparently hit map.activeLayer().<field>. Render methods
 * (updateClassification/updateStyle/getLegendConstructor) forward the same way.
 *
 * Used in Phase 3+ ONLY (a migrated type's factory). Never call it on a facade map
 * (it would be self-referential).
 */
export const forwardFieldsToActiveLayer = function (map, fieldNames) {
    for (const f of fieldNames) {
        Object.defineProperty(map, f, {
            configurable: true,
            get() {
                return map.activeLayer()?.[f]
            },
            set(v) {
                const l = map.activeLayer()
                if (l) l[f] = v
            },
        })
    }
}

/**
 * Forwards a fluent getter/setter METHOD (e.g. `encoding`) to the active layer while
 * keeping the MAP as the return value on a set, so map-level chaining is preserved:
 *   map.encoding('fill', cfg).title(...)  // still returns the map
 * Getter calls (0 args, or a single string arg) return the underlying value.
 */
export const forwardChainableMethod = function (map, name) {
    Object.defineProperty(map, name, {
        configurable: true,
        get() {
            const layer = map.activeLayer()
            return function (...args) {
                if (!layer) {
                    return args.length === 0 ? undefined : map
                }
                const r = layer[name](...args)
                let isGetter = args.length === 0
                if (args.length === 1 && (name === 'encoding' || name === 'stat' || name === 'statData')) {
                    if (typeof args[0] === 'string' || args[0] instanceof String) {
                        isGetter = true
                    }
                }
                return isGetter ? r : map
            }
        },
    })
}

