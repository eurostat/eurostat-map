import * as StatisticalData from './stat-data'

const isCategoricalStatConfig = function (config) {
    return config && typeof config === 'object' && Array.isArray(config.categoryCodes)
}

const makeChannelStatKey = function (channel, code, prefix) {
    if (prefix === '') return code
    return `${prefix || channel}:${code}`
}

/**
 * The statistical data settings of a map: the stat() configs and the registration of multi-category datasets.
 * @param {*} out the map
 */
export const attachStatChannels = function (out) {
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
            preprocess,
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

        // The chart maps read the datasets by category code. That is true of the primary statistic whatever its name: the
        // reserved channel names, or the only multi-category statistic of the map.
        const isPrimaryCategoricalChannel =
            ['default', 'composition', 'height'].includes(channel) ||
            (!['width', 'color', 'size', 'ring'].includes(channel) && !Object.keys(out.statChannels_).some((c) => c !== channel))

        if (!options.totalCodeKey && isPrimaryCategoricalChannel && channel !== 'height') {
            const totalCodeKeysByMapType = {
                pie: 'compositionTotalCode_',
                waffle: 'waffleTotalCode_',
                bar: 'barTotalCode_',
            }
            options.totalCodeKey = totalCodeKeysByMapType[out._mapType]
        }

        const statKeyPrefix = options.statKeyPrefix === undefined ? (isPrimaryCategoricalChannel ? '' : channel) : options.statKeyPrefix
        const statKeys = {}

        for (let i = 0; i < categoryCodes.length; i++) {
            const code = categoryCodes[i]
            const statKey = makeChannelStatKey(channel, code, statKeyPrefix)
            statKeys[code] = statKey

            if (customData && !eurostatDatasetCode) {
                const statData = StatisticalData.statData({ code, unitText: unitText || 'Value', preprocess, transform })
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
                out.stat_[statKey] = { eurostatDatasetCode, unitText, preprocess, transform, filters: { ...baseFilters, [categoryParameter]: code } }
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
            categoryParameter,
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
                    const statData = StatisticalData.statData({ code: totalCode, unitText: unitText || 'Value', preprocess, transform })
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
                        preprocess,
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
}

/**
 * stat() and statData(). Attached after the layer stack: they override the thematic API a map has as its own layer 0.
 * @param {*} out the map
 */
export const attachStatAccessors = function (out) {
    out.stat = function (k, v) {
        //no argument: getter - return the default stat
        if (!arguments.length) return out.stat_['default']

        // Some layer types need to expand the public one-object stat config before it is
        // registered on the shared map (for example, spark maps register one dataset per date).
        // Keep stat()/statData() map-owned to avoid map <-> layer forwarding recursion, but let
        // the active layer explicitly handle this specialized config shape when required.
        // A name given to such a config changes nothing: the layer names the datasets itself.
        const special = arguments.length === 1 ? k : arguments.length === 2 && v?.dates ? v : null
        if (special && typeof special === 'object' && !Array.isArray(special)) {
            const layer = out.activeLayer?.()
            const handler =
                layer && Object.prototype.hasOwnProperty.call(layer, 'handleStatConfig') && typeof layer.handleStatConfig === 'function'
                    ? layer.handleStatConfig
                    : null
            if (handler?.call(layer, special)) return out
        }

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
}
