import { executeForAllInsets } from './utils'
import * as StatisticalData from './stat-data'
import * as Legend from '../legend/legend'
import { select } from 'd3-selection'
import * as tp from '../tooltip/tooltip'
import { hideSpinner, showSpinner } from './decoration/spinner'
import { createMapInstance, updateGeoMapTemplate } from './map-instance'
import { refreshCentroids } from './geo/centroids'
import { exportMapToPNG, exportMapToSVG } from './export'
import { buildGridCartogramBase } from './cartograms'
import {
    createLayer,
    makeMapSelfLayer,
    forwardFieldsToActiveLayer,
    forwardChainableMethod,
} from './layer'
import { getRole, isLayerTypeRegistered, getLayerType } from './layer-registry'

/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../types/core/MapConfig').MapConfig} MapConfig */
/** @typedef {import('../types/core/stat/StatConfig').StatConfig} StatConfig */
/** @typedef {import('../types/core/stat/StatData').StatData} StatData */
/** @typedef {import('../types/legend/LegendConfig').LegendConfig} LegendConfig */

/**
 * @param {MapConfig} config
 * @param {boolean} withCenterPoints
 * @param {string} mapType
 * @returns {MapInstance}
 */
export const createStatMap = function (config, withCenterPoints, mapType) {
    //build stat map from map template
    const out = createMapInstance(config, withCenterPoints, mapType)

    // build-completion latch
    out._geoDone_ = false
    out._statDone_ = false
    out._finalized_ = false

    const tryFinalize = function () {
        if (out._finalized_) return
        if (!out._geoDone_ || !out._statDone_) return
        out._finalized_ = true
        if (out.onBuild()) out.onBuild()(out)
    }

    // render scheduling flag
    let _renderScheduled = false
    out._loadingGeoCount_ = 0
    out._loadingStatCount_ = 0

    const countGeoUpdateTargets = function (map) {
        let count = 1

        if (!map?.insetTemplates_) return count

        executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => {
            count += countGeoUpdateTargets(inset)
        })

        return count
    }

    /**
     * Statistical data configuration dictionary.
     * Keys are stat dataset names ('default', 'color', 'size', 'v1', 'v2', 'v3', etc.).
     * The 'default' key is used by single-stat map types (choropleth, ps, etc.).
     *
     * As a getter/setter it behaves as follows:
     *   - `map.stat()` → returns the default stat config
     *   - `map.stat('color')` → returns the stat config for key 'color'
     *   - `map.stat({ eurostatDatasetCode: 'demo_r_d3dens', ... })` → sets default stat config
     *   - `map.stat('color', { eurostatDatasetCode: '...', ... })` → sets stat config for key 'color'
     *
     * @example
     * map.stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²', filters: { TIME: '2024' } })
     *
     * @example
     * // bivariate: set two independent datasets
     * map.stat('v1', { eurostatDatasetCode: 'dataset_a' })
     * map.stat('v2', { eurostatDatasetCode: 'dataset_b' })
     */
    out.stat_ = { default: undefined }
    out.statChannels_ = {}
    out.statMeta_ = out.statChannels_
    out.encodings_ = {}

    const isCategoricalStatConfig = function (config) {
        return config && typeof config === 'object' && Array.isArray(config.categoryCodes)
    }

    const makeChannelStatKey = function (channel, code, prefix) {
        if (prefix === '') return code
        return `${prefix || channel}:${code}`
    }

    out._registerScalarCustomStat = function (key, config) {
        const statData = StatisticalData.statData(config)
        statData.setData(config.customData)
        out.statData(key, statData)
        delete out.stat_[key]
        return out
    }

    out._registerCategoricalStatChannel = function (channel, config, options = {}) {
        if (config.stat) {
            config = { ...config.stat, ...config }
            delete config.stat
        }

        const {
            eurostatDatasetCode,
            customData,
            filters,
            unitText,
            transform,
            categoryParameter,
            categoryCodes,
            categoryLabels,
            categoryColors,
            totalCode,
        } = config

        if (!categoryCodes?.length) {
            console.error('categoryCodes array is required')
            return out
        }

        if (!options.totalCodeKey && channel === 'composition') {
            const totalCodeKeysByMapType = {
                pie: 'compositionTotalCode_',
                waffle: 'waffleTotalCode_',
                bar: 'barTotalCode_',
            }
            options.totalCodeKey = totalCodeKeysByMapType[out._mapType]
        }

        const isPrimaryCategoricalChannel = channel === 'default' || channel === 'composition' || channel === 'height'
        const statKeyPrefix = options.statKeyPrefix === undefined ? (isPrimaryCategoricalChannel ? '' : channel) : options.statKeyPrefix
        const statKeys = {}

        for (let i = 0; i < categoryCodes.length; i++) {
            const code = categoryCodes[i]
            const statKey = makeChannelStatKey(channel, code, statKeyPrefix)
            statKeys[code] = statKey

            if (customData && !eurostatDatasetCode) {
                const statData = StatisticalData.statData({ code, unitText: unitText || 'Value', transform })
                const regionData = {}
                for (const regionId in customData) {
                    const value = customData[regionId]?.[code]
                    if (value !== undefined) regionData[regionId] = value
                }
                if (Object.keys(regionData).length > 0) statData.setData(regionData)
                out.statData(statKey, statData)
                delete out.stat_[statKey]
            } else {
                if (!eurostatDatasetCode) {
                    console.error('eurostatDatasetCode is required')
                    return out
                }
                if (!categoryParameter) {
                    console.error('categoryParameter is required')
                    return out
                }
                const baseFilters = filters ? { ...filters } : {}
                out.stat_[statKey] = { eurostatDatasetCode, unitText, transform, filters: { ...baseFilters, [categoryParameter]: code } }
            }

            if (categoryColors?.[i]) {
                out.catColors_ = out.catColors_ || {}
                out.catColors_[code] = categoryColors[i]
            }
            if (categoryLabels?.[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[code] = categoryLabels[i]
            }
        }

        out.statChannels_[channel] = {
            name: channel,
            categoryCodes,
            statKeys,
            categoryLabels,
            categoryColors,
            unitText,
            totalCode,
        }

        if (options.setStatCodes !== false) out.statCodes_ = categoryCodes

        if (options.totalCodeKey) {
            if (totalCode) {
                const totalStatKey = makeChannelStatKey(channel, totalCode, statKeyPrefix)
                out[options.totalCodeKey] = totalStatKey
                out.statChannels_[channel].totalStatKey = totalStatKey

                if (customData && !eurostatDatasetCode) {
                    const statData = StatisticalData.statData({ code: totalCode, unitText: unitText || 'Value', transform })
                    const regionData = {}
                    for (const regionId in customData) {
                        let total = customData[regionId]?.[totalCode]
                        if (total === undefined) {
                            total = 0
                            categoryCodes.forEach((c) => {
                                const v = customData[regionId]?.[c]
                                if (v !== undefined && !isNaN(v)) total += parseFloat(v)
                            })
                        }
                        if (total > 0) regionData[regionId] = total
                    }
                    if (Object.keys(regionData).length > 0) statData.setData(regionData)
                    out.statData(totalStatKey, statData)
                    delete out.stat_[totalStatKey]
                } else {
                    const baseFilters = filters ? { ...filters } : {}
                    out.stat_[totalStatKey] = {
                        eurostatDatasetCode,
                        unitText,
                        transform,
                        filters: { ...baseFilters, [categoryParameter]: totalCode },
                    }
                }
            } else {
                out[options.totalCodeKey] = undefined
            }
        }

        return out
    }

    // ── Layer 0 facade + thematic API ─────────────────────────────────────────────
    // The map is its own layer 0 until its type is migrated to a real Layer (Phase 3+).
    // makeMapSelfLayer installs the (relocated) encoding API onto the map.
    makeMapSelfLayer(out)

    // ── Layer stack ───────────────────────────────────────────────────────────────
    out.layers_ = [out] // facade: the map is its own layer 0
    out.activeLayerIndex_ = 0

    out.activeLayer = () => out.layers_[out.activeLayerIndex_]

    out.layer = function (ref) {
        if (ref == null) return out.activeLayer()
        if (typeof ref === 'number') return out.layers_[ref]
        return out.layers_.find((l) => l.id === ref || l.layerId_ === ref)
    }

    out.activeLayerIndex = function (i) {
        if (!arguments.length) return out.activeLayerIndex_
        out.activeLayerIndex_ = i
        return out
    }

    out.addLayer = function (typeOrConfig, config) {
        const cfg = typeof typeOrConfig === 'string' ? { type: typeOrConfig, ...(config || {}) } : { ...typeOrConfig }
        const role = cfg.role || getRole(cfg.type)
        const addingBase = role === 'base'
        const onlyFacade = out.layers_.length === 1 && out.layers_[0] === out

        // A real base replaces the self-facade base.
        if (addingBase && onlyFacade && out.role === 'base') out.layers_ = []

        // Enforce: at most one base.
        if (addingBase && out.layers_.some((l) => l.role === 'base')) {
            console.error(`[eurostat-map] A base layer already exists; ignoring extra base layer "${cfg.type}".`)
            return out.activeLayer()
        }

        // Real Layer path is only available for REGISTERED types (Phase 3+).
        if (!isLayerTypeRegistered(cfg.type)) {
            console.warn(
                `[eurostat-map] Layer type "${cfg.type}" is not yet available as a layer. ` +
                    `Use eurostatmap.map('${cfg.type}') for a standalone single-type map for now.`
            )
            return out.activeLayer()
        }

        const layer = createLayer(out, cfg)
        getLayerType(cfg.type).decorate(layer, cfg)

        if (addingBase) out.layers_.unshift(layer)
        else out.layers_.push(layer)
        return layer
    }

    out.layers = function (configs) {
        if (!arguments.length) return out.layers_
        out.layers_ = []
        ;(configs || []).forEach((c) => out.addLayer(c))
        if (out.layers_.length === 0) out.layers_ = [out] // keep facade if nothing was added
        return out
    }

    out.removeLayer = function (ref) {
        const l = out.layer(ref)
        if (!l || l === out) return out
        const svg = out.svg && out.svg()
        if (svg) {
            const g = svg.select('#em-layer-' + l.id + '-' + out.svgId_)
            if (!g.empty()) g.remove()
            if (l.legendObj_) {
                const ls = svg.select('#' + l.legendObj_.svgId)
                if (!ls.empty()) ls.remove()
            }
        }
        out.layers_ = out.layers_.filter((x) => x !== l)
        if (out.layers_.length === 0) out.layers_ = [out]
        if (out.activeLayerIndex_ >= out.layers_.length) out.activeLayerIndex_ = out.layers_.length - 1
        return out
    }

    // Orchestration: classify+style every layer, then update every layer's legend.
    // For a legacy single-layer map this loops [out] once and is behaviour-identical.
    out.updateAllLayers = function () {
        out.layers_.forEach((l) => {
            l.updateClassification?.()
            l.updateStyle?.()
        })
        out.layers_.forEach((l) => {
            if (l.legend_ && l.legendObj_) l.legendObj_.update?.()
        })
        return out
    }

    out.stat = function (k, v) {
        //no argument: getter - return the default stat
        if (!arguments.length) return out.stat_['default']
        //legacy multi-argument API for categorical composition stats:
        // .stat('composition', statConfig, categoryParameter, categoryCodes, categoryLabels, categoryColors, totalCode)
        if (
            arguments.length > 2 &&
            (typeof k === 'string' || k instanceof String) &&
            v &&
            typeof v === 'object' &&
            typeof arguments[2] === 'string'
        ) {
            return out._registerCategoricalStatChannel(k, {
                ...v,
                categoryParameter: arguments[2],
                categoryCodes: arguments[3],
                categoryLabels: arguments[4],
                categoryColors: arguments[5],
                totalCode: arguments[6],
            })
        }

        //two-or-more arguments: setter - set the config k with value v
        if (arguments.length >= 2) {
            if (isCategoricalStatConfig(v)) return out._registerCategoricalStatChannel(k, v)
            if (v?.customData) return out._registerScalarCustomStat(k, v)
            out.stat_[k] = v
            return out
        }
        //one string argument: getter - return the config k
        if (typeof k === 'string' || k instanceof String) return out.stat_[k]
        //one non-string argument: setter - set the entire dictionnary
        if (isCategoricalStatConfig(k)) return out._registerCategoricalStatChannel('default', k)
        if (k?.customData) return out._registerScalarCustomStat('default', k)
        out.stat_ = k.default ? k : { default: k }
        return out
    }

    /**
     * Retrieved statistical data, keyed by stat dataset name.
     * Each value is a StatData instance.
     * Lazily creates a new StatData entry if a key is accessed that doesn't yet exist.
     *
     * - `map.statData()` → returns the default StatData instance
     * - `map.statData('color')` → returns the StatData instance for key 'color'
     * - `map.statData('color', statDataInstance)` → sets StatData for key 'color'
     *
     * Use `.statData().setData({ regionId: value, ... })` to supply custom data
     * directly without fetching from the Eurostat API.
     *
     * @example
     * map.statData().setData({ DE: 120, FR: 95, IT: 88 })
     */
    out.statData_ = {
        default: StatisticalData.statData(),
        color: StatisticalData.statData(),
        size: StatisticalData.statData(),
        v1: StatisticalData.statData(),
        v2: StatisticalData.statData(), //bivariate
        v3: StatisticalData.statData(), //trivariate
    }
    out.statData = function (k, v) {
        if (!arguments.length) return out.statData_['default']

        // lazy create if not exist
        if (arguments.length === 1) {
            if (!out.statData_[k]) out.statData_[k] = StatisticalData.statData()
            return out.statData_[k]
        }

        // setter
        out.statData_[k] = v
        return out
    }

    /**
     * Text shown in the tooltip and legend for regions with no data.
     * @type {string}
     * @default 'No data available'
     * @example map.noDataText('Data not available')
     */
    out.noDataText_ = 'No data available'
    /**
     * BCP 47 language tag used when fetching labels from the Eurostat API.
     * @type {string}
     * @default 'en'
     * @example map.language('fr')
     */
    out.language_ = 'en'
    /**
     * Duration in milliseconds for D3 transitions when the map updates.
     * Set to 0 to disable transitions.
     * @type {number}
     * @default 500
     * @example map.transitionDuration(0)
     */
    out.transitionDuration_ = 500
    //specific tooltip text function
    out.tooltip_.textFunction = undefined
    /**
     * A function that defines SVG filter/pattern definitions used for fill patterns.
     * Receives (svg, numberOfClasses) as arguments.
     * See also: getFillPatternDefinitionFunction() in the public API.
     * @type {function|undefined}
     */
    out.filtersDefinitionFunction_ = undefined
    /**
     * Callback fired once after the map has fully built (geo + stat data both loaded).
     * Receives the map instance as its only argument.
     * @type {function(map: object): void | undefined}
     * @example
     * map.onBuild(m => console.log('Map ready', m))
     */
    out.onBuild_ = undefined
    /**
     * Legend configuration object. Passed to the legend constructor.
     * The available properties depend on the map type's legend.
     * @type {object|undefined}
     * @example
     * map.legend({ x: 10, y: 90, title: 'Density, people/km²' })
     */
    out.legend_ = undefined
    out.legendObj_ = undefined

    const applyLegendVisibilityForLayer = function (layer) {
        const legend = layer.legendObj_
        if (!legend) return

        let visible = out.legendVisible_
        if (visible === undefined) {
            if (out.legendButton_) {
                visible = window.innerWidth > 768
            } else {
                visible = true
            }
        }

        const legendSvg = out.svg().select('#' + legend.svgId)
        if (!legendSvg.empty()) {
            legendSvg.style('display', visible ? null : 'none')
        }
    }

    const applyLegendVisibility = function () {
        if (out.layers_ && Array.isArray(out.layers_)) {
            out.layers_.forEach(applyLegendVisibilityForLayer)
        }
    }

    out.setLegendVisibility = function (visible) {
        out.legendVisible_ = !!visible
        applyLegendVisibility()
        return out
    }

    out.toggleLegendVisibility = function () {
        const current = out.legendVisible_ === undefined ? true : !!out.legendVisible_
        out.legendVisible_ = !current
        applyLegendVisibility()
        return out
    }

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['legend_', 'legendObj_', 'noDataText_', 'language_', 'transitionDuration_', 'tooltipText_', 'filtersDefinitionFunction_', 'onBuild_'].forEach(
        function (att) {
            out[att.substring(0, att.length - 1)] = function (v) {
                if (!arguments.length) return out[att]
                out[att] = v
                return out
            }
        }
    )

    //override attribute values with config values
    if (config) for (let key in config) if (out[key] && config[key] != undefined) out[key](config[key])

    // override legend for updating after build
    out.legend = function (v) {
        if (!arguments.length) return out.legend_

        // clear existing legend
        if (v == false) {
            const legend = out.legendObj()
            if (legend) {
                const legendSvg = select('#' + legend.svgId)
                if (legendSvg.size() > 0) {
                    legendSvg.selectAll('*').remove()
                }
            }
            out.svg()?.select('#em-legend-button').remove()
            out.legend_ = v
            return out
        }
        //set new legend config
        out.legend_ = v
        //update if existing legend
        if (out.legendObj_) out.updateLegend()
        return out
    }

    out.updateLegend = function (v) {
        if (out.layers_ && Array.isArray(out.layers_)) {
            out.layers_.forEach((l) => {
                if (l.legendObj_) {
                    if (l.updateClassification) l.updateClassification()
                    if (l.updateStyle) l.updateStyle()
                    l.legendObj_.update()
                }
            })
            applyLegendVisibility()
        }
        return out
    }

    /**
     * Builds the map from scratch. Should be called once after initial configuration.
     * Triggers geo data retrieval, stat data retrieval, legend build, and tooltip setup.
     * Returns the map instance for chaining.
     *
     * @returns {object} The map instance (builder pattern).
     *
     * @example
     * eurostatmap.map('choropleth')
     *   .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
     *   .legend({ x: 10, y: 90 })
     *   .build()
     */
    out.build = function () {
        // RESET BUILD LIFECYCLE FLAGS
        out._geoDone_ = false
        out._statDone_ = false
        out._finalized_ = false
        _renderScheduled = false

        if (out.projectionFunction_) out.proj('4326') //when using custom d3 projection function always request NUTS2JSON in WGS84

        //build map template base
        out.buildMapTemplateBase()

        //add additional filters for fill patterns for example
        if (out.filtersDefinitionFunction_) {
            out.filtersDefinitionFunction_(out.svg(), out.numberOfClasses_)
        }

        //legend element
        out.buildLegend()

        //define tooltip
        //prepare map tooltip
        if (out.tooltip_) {
            out._tooltip = tp.tooltip(out.tooltip_)
        } else {
            //no config specified, use default
            if (!out.tooltip_) out.tooltip_ = { id: out.svgId() }
            out._tooltip = tp.tooltip(out.tooltip_)
        }

        //launch geo data retrieval
        out.updateGeoData()

        //launch stat data retrieval
        out.updateStatData()

        return out
    }

    out.updateLoader = () => {
        if (out.isInset) return

        // 🛠 Ensure wrapper exists (lazy creation)
        if (!out._wrapper_) {
            const svg = out.svg?.()
            if (!svg || svg.empty()) return
            out._wrapper_ = svg.node().parentNode?.classList?.contains('em-map-wrapper') ? svg.node().parentNode : null
        }

        if (!out._wrapper_) return

        if (out._loadingGeoCount_ > 0 || out._loadingStatCount_ > 0) {
            showSpinner(out._wrapper_, 'Loading…')
        } else {
            hideSpinner(out._wrapper_)
        }
    }

    out.buildLegendForLayer = function (layer) {
        const isFacade = layer === out
        const legendConfig = isFacade ? out.legend() : layer.legend_
        if (!legendConfig) return out

        const constructor = isFacade ? out.getLegendConstructor() : layer.getLegendConstructor()
        if (!layer.legendObj_) {
            layer.legendObj_ = constructor(layer, legendConfig)
        }
        const legend = layer.legendObj_

        let legendSvg = out.svg().select('#' + legend.svgId)
        if (legendSvg.empty()) {
            out.svg().append('g').attr('id', legend.svgId).attr('class', 'em-legend')
        }

        legend.build()
        applyLegendVisibilityForLayer(layer)
        return out
    }

    out.buildLegend = function () {
        if (out.layers_ && Array.isArray(out.layers_)) {
            out.layers_.forEach((l) => {
                const isFacade = l === out
                const legendConfig = isFacade ? out.legend() : l.legend_
                if (legendConfig) {
                    out.buildLegendForLayer(l)
                }
            })
        }
    }

    /** Check if all stat datasets have been loaded. */
    const isStatDataReady = function () {
        for (const key in out.statData_) {
            const hasConfig = !!out.stat_[key]
            const hasManualData = !!(out.statData_[key] && out.statData_[key].get())

            if (!hasConfig && !hasManualData) continue
            if (!out.statData_[key].isReady()) return false
        }
        return true
    }

    /**
     * Re-fetches geographic data and rebuilds the map geometry.
     * Call this when any geo-related attribute changes (geo, proj, nutsLevel,
     * nutsYear, scale, etc.) after the initial build.
     * @returns {object} The map instance.
     */
    out.updateGeoData = function () {
        out._loadingGeoCount_ += countGeoUpdateTargets(out)
        out.updateLoader()

        updateGeoMapTemplate(() => {
            out._loadingGeoCount_ = Math.max(0, out._loadingGeoCount_ - 1)
            out.updateLoader()

            if (!out.Geometries.isGeoReady()) return

            out._geoDone_ = true

            if (isStatDataReady()) {
                out._statDone_ = true
                out.updateStatValues()
            }

            tryFinalize()
        }, out)

        return out
    }

    /**
     * Re-fetches all configured statistical datasets and refreshes the map.
     * Call this when stat configuration changes after the initial build
     * (e.g. changing filters, dataset code, or CSV URL).
     * For changes to already-loaded data values, use updateStatValues() instead.
     * @returns {object} The map instance.
     */
    out.updateStatData = function () {
        for (let statKey in out.stat_) {
            const config = out.stat(statKey)
            const manualData = out.statData(statKey).get?.()

            if (!config && !manualData) continue

            if (config) {
                const statData = StatisticalData.statData(config)
                out.statData(statKey, statData)

                // detect remote on statData, not config
                const isRemote = !!statData.eurostatDatasetCode_ || !!statData.csvURL_

                if (isRemote) {
                    out._loadingStatCount_++
                    out.updateLoader()
                }

                let nl = out.nutsLevel_
                // Keep mixed level for sparkline maps so remote data includes all NUTS levels.
                // Other map types keep historical behavior (country-level fallback).
                if (nl === 'mixed' && out._mapType !== 'spark') nl = 0

                statData.retrieveFromRemote(nl, out.language(), () => {
                    // bookkeeping MUST always run
                    if (isRemote) {
                        out._loadingStatCount_ = Math.max(0, out._loadingStatCount_ - 1)
                        out.updateLoader()
                    }

                    if (!isStatDataReady()) return

                    out._statDone_ = true
                    if (!out.Geometries.isGeoReady()) return

                    if (_renderScheduled) {
                        // Render already scheduled, but still need to ensure callback fires
                        tryFinalize()
                        return
                    }

                    _renderScheduled = true
                    Promise.resolve().then(() => {
                        _renderScheduled = false
                        out.updateStatValues()
                        tryFinalize()
                    })
                })
            }
        }

        return out
    }

    /**
     * Re-applies classification and styling using the currently loaded stat data.
     * Call this after directly modifying statData values (e.g. via setData())
     * without needing to re-fetch from remote.
     * @returns {object} The map instance.
     */
    out.updateStatValues = function () {
        if (out.gridCartogram_ && out._gridCartogramNeedsStatFilterRefresh_) {
            out._gridCartogramNeedsStatFilterRefresh_ = false
            out.svg()
                .select('#em-zoom-group-' + out.svgId_)
                .selectAll('*')
                .remove()
            buildGridCartogramBase(out)
        }

        // filter out centroids without stat data
        if (withCenterPoints) {
            // insets
            if (out.insetTemplates_) {
                executeForAllInsets(out.insetTemplates_, out.svgId_, refreshCentroids)
            }
            //main map
            refreshCentroids(out)
        }

        out.updateAllLayers()

        return out
    }

    out.regionCentroids = function () {
        return out.Geometries.getRegionCentroids(out._pathFunction)
    }

    /**
     * Abstract method — implemented by each concrete map type.
     * Updates the map's data classification (class breaks, thresholds, etc.)
     * without re-fetching data. Call after changing numberOfClasses,
     * classificationMethod, thresholds, or similar attributes.
     * @returns {object} The map instance.
     */
    out.updateClassification = function () {
        console.log('Map updateClassification function not implemented')
        return out
    }

    /**
     * Abstract method — implemented by each concrete map type.
     * Re-applies visual styling (fill colors, symbol sizes, etc.)
     * to already-classified data. Call after changing color schemes,
     * symbol styles, or other purely visual attributes.
     * @returns {object} The map instance.
     */
    out.updateStyle = function () {
        console.log('Map updateStyle function not implemented')
        return out
    }

    /**
     * Abstract method.
     * Function which return the legend constructor function for the map.
     */
    out.getLegendConstructor = function () {
        console.log('Map getLegendConstructor function not implemented')
        return Legend.legend
    }

    /**
     * Returns the time stamp of the loaded Eurostat dataset.
     * Useful when fetching the most recent available data and wanting to
     * display the actual time period in the map title.
     * Only meaningful for stat data fetched from the Eurostat API.
     *
     * @returns {string|undefined} The time dimension value, e.g. '2021'.
     *
     * @example
     * map.onBuild(() => map.title('Population density ' + map.getTime()))
     */
    out.getTime = function () {
        return out.statData('default').getTime()
    }

    /**
     * Set some map attributes based on the following URL parameters:
     * "w":width, "h":height, "x":xGeoCenter, "y":yGeoCenter, "z":pixGeoSize, "s":scale, "lvl":nuts level, "time":time,
     * "proj":CRS, "geo":geo territory, "ny":nuts version, "language":langage, "numberOfClasses":class number
     */
    out.setFromURL = function () {
        const opts = getURLParameters()
        if (opts.w) out.width(opts.w)
        if (opts.h) out.height(opts.h)
        if (opts.x && opts.y) out.geoCenter([opts.x, opts.y])
        if (opts.z) out.pixelSize(opts.z)
        if (opts.s) out.scale(opts.s)
        if (opts.lvl) out.nutsLevel(opts.lvl)
        if (opts.time) {
            out.filters_.time = opts.time
            delete out.filters_.lastTimePeriod
        }
        if (opts.proj) out.proj(opts.proj)
        if (opts.geo) out.geo(opts.geo)
        if (opts.ny) out.nutsYear(opts.ny)
        if (opts.language) out.language(opts.language)
        if (opts.numberOfClasses) out.numberOfClasses(+opts.numberOfClasses)
        return out
    }

    out.exportMapToPNG = function (width, height, filename) {
        return exportMapToPNG(out, width, height, filename)
    }

    out.exportMapToSVG = function (filename) {
        return exportMapToSVG(out, filename)
    }

    return out
}

/**
 * Retrieve some URL parameters, which could be then reused as map definition parameters.
 * This allow a quick map customisation by simply adding and changing some URL parameters.
 * See map method: setFromURL(...)
 */
export const getURLParameters = function () {
    const ps = {}
    const p = ['w', 'h', 'x', 'y', 'z', 's', 'lvl', 'time', 'proj', 'geo', 'ny', 'language', 'sl', 'numberOfClasses']
    for (let i = 0; i < p.length; i++) ps[p[i]] = getURLParameterByName(p[i])
    return ps
}

/**
 * Builds a single-layer map instance for a given type and config.
 * Handles creating the frame, adding the layer, and forwarding legacy properties.
 *
 * @param {string} type
 * @param {object} config
 * @returns {MapInstance}
 */
export const buildSingleLayerMap = function (type, config) {
    const role = getRole(type)
    const withCenterPoints = role === 'overlay' || type === 'bar' || type === 'barComposition'
    const CANONICAL_MAP_TYPES = {
        choropleth: 'ch',
        ch: 'ch',
        categorical: 'ct',
        ct: 'ct',
        proportionalSymbol: 'ps',
        proportionalSymbols: 'ps',
        ps: 'ps',
        bivariateChoropleth: 'chbi',
        chbi: 'chbi',
        trivariateChoropleth: 'chtri',
        ternary: 'chtri',
        chtri: 'chtri',
        stripeComposition: 'scomp',
        stripe: 'scomp',
        scomp: 'scomp',
        pieChart: 'pie',
        pie: 'pie',
        composition: 'pie',
        sparkline: 'spark',
        spark: 'spark',
        sparklines: 'spark',
        flow: 'flow',
        flowmap: 'flow',
        coxcomb: 'coxcomb',
        polar: 'coxcomb',
    }
    const canonicalType = CANONICAL_MAP_TYPES[type] || type
    const out = createStatMap(config, withCenterPoints, canonicalType)

    // Remove the self-facade layer so the real layer becomes layer 0.
    out.layers_ = []

    const layer = out.addLayer(type, config)
    out.activeLayerIndex(0)

    // Forwarding accessors for backwards compatibility
    const baseFields = [
        'encodings_',
        'catColors_',
        'catLabels_',
        'statCodes_',
        'legend_',
        'legendObj_',
        'tooltip_',
    ]
    const baseMethods = [
        'encoding',
        'updateClassification',
        'updateStyle',
        'getLegendConstructor',
        'legend',
    ]

    let typeFields = []
    let typeMethods = []

    if (type === 'choropleth' || type === 'ch') {
        typeFields = [
            'numberOfClasses_',
            'classificationMethod_',
            'thresholds_',
            'makeClassifNice_',
            'colorFunction_',
            'classToFillStyle_',
            'noDataFillStyle_',
            'classifier_',
            'colors_',
            'colorSchemeType_',
            'valueTransform_',
            'valueUntransform_',
            'pointOfDivergence_',
            'skipNormalization_',
            'filtersDefinitionFunction_',
        ]
        typeMethods = [
            'numberOfClasses',
            'classificationMethod',
            'thresholds',
            'makeClassifNice',
            'colorFunction',
            'classToFillStyle',
            'noDataFillStyle',
            'classifier',
            'colors',
            'colorSchemeType',
            'valueTransform',
            'valueUntransform',
            'pointOfDivergence',
            'skipNormalization',
            'threshold',
            'filtersDefinitionFunction',
            'highlightRegion',
            'clearHighlight',
        ]
    } else if (type === 'proportionalSymbol' || type === 'proportionalSymbols' || type === 'ps') {
        typeFields = [
            'psMaxSize_',
            'psMinSize_',
            'psMaxValue_',
            'psMinValue_',
            'psFill_',
            'psFillOpacity_',
            'psStrokeOpacity_',
            'psStroke_',
            'psStrokeWidth_',
            'classifierSize_',
            'classifierColor_',
            'psShape_',
            'psCustomShape_',
            'psBarWidth_',
            'psClassToFillStyle_',
            'psColorFun_',
            'psSizeScale_',
            'noDataFillStyle_',
            'psThresholds_',
            'psColors_',
            'psCustomSVG_',
            'psOffset_',
            'psClassificationMethod_',
            'psClasses_',
            'dorling_',
            'psSpikeWidth_',
            'psCodeLabels_',
            'psBrightenFactor_',
            'dorlingSettings_',
        ]
        typeMethods = [
            'psMaxSize',
            'psMinSize',
            'psMaxValue',
            'psMinValue',
            'psFill',
            'psFillOpacity',
            'psStrokeOpacity',
            'psStroke',
            'psStrokeWidth',
            'classifierSize',
            'classifierColor',
            'psShape',
            'psCustomShape',
            'psBarWidth',
            'psClassToFillStyle',
            'psColorFun',
            'psSizeScale',
            'psThresholds',
            'psColors',
            'psCustomSVG',
            'psOffset',
            'psClassificationMethod',
            'psClasses',
            'psSpikeWidth',
            'psCodeLabels',
            'psBrightenFactor',
            'psSettings',
            'dorling',
            'dorlingSettings',
            'dorlingWorker',
            'dorlingWorkerD3URL',
        ]
    }

    forwardFieldsToActiveLayer(out, [...baseFields, ...typeFields])

    const allMethods = [...baseMethods, ...typeMethods]
    for (const method of allMethods) {
        forwardChainableMethod(out, method)
    }

    return out
}

