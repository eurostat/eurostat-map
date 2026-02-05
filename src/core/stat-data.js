import { json, csv } from 'd3-fetch'
import { getEstatDataURL } from './utils'
import JSONstat from 'jsonstat-toolkit'
import { csvToIndex, jsonstatToIndex } from './utils'

/**
 * A statistical dataset, to be used for a statistical map.
 *
 * @param {*} config
 */
export const statData = function (config) {
    //build stat data object
    const out = {}

    out.__data = undefined //for debugging

    //out.maxNumberOfDecimalsInDataset = undefined

    /**
     * The statistical values, indexed by NUTS id.
     * Each stat value is an object {value,status}.
     */
    out._data_ = undefined

    /**
     * Return the stat value {value,status} from a nuts id.
     * If no argument is specified, returns the entire index.
     * @param {*} nutsId
     */
    out.get = (nutsId) => {
        if (!nutsId) {
            return out._data_
        } else {
            if (out._data_) {
                return out._data_[nutsId]
            } else {
                return undefined
            }
        }
    }

    /**
     * Return the stat value from a nuts id.
     * @param {*} nutsId
     */
    out.getValue = (nutsId) => {
        const s = out.get(nutsId)
        return s ? s.value : undefined
    }

    /**
     * Set a stat value from a nuts id.
     *
     * @param {String} nutsId
     * @param {Object || String || Number} stat The new statistical data. The format can be either {value:34.324,status:"e"} or a the value only.
     */
    out.set = (nutsId, stat) => {
        out._data_ = out._data_ || {}
        const s = out._data_[nutsId]

        if (s) {
            if (stat.value) {
                s.value = stat.value
                s.status = stat.status
            } else {
                // be careful here setting values here, we need to maintain strings with trailing zeros because in JSON 1.0 === 1 and they are removed. User might want stats labels with trailing zeros.
                s.value = stat
                //s.value = isNaN(+stat) ? stat : +stat
            }
        } else {
            // be careful here setting values here, we need to maintain strings with trailing zeros because in JSON 1.0 === 1 and they are removed. User might want stats labels with trailing zeros.
            out._data_[nutsId] = stat.value ? stat : { value: stat }
            //out._data_[nutsId] = stat.value ? stat : { value: isNaN(+stat) ? stat : +stat}
        }
        return out
    }

    /**
     * Set statistical data, already indexed by nutsId.
     *
     * @param {Object} data Something like: { "PT":0.2, "LU":0.6, ...}, or with status: { "PT": {value:0.2, status:"e"}, "LU":0.6, ...}
     */
    out.setData = (data) => {
        out.__data = data // for debugging
        out._data_ = {} // overwrite existing data
        Object.keys(data).forEach((nutsId) => out.set(nutsId, data[nutsId]))
        return out
    }

    //eg for sparklines
    out.setManualMultiDate = function (dataObject) {
        out._data_ = out._data_ || {}

        for (const regionId in dataObject) {
            const dateValueMap = dataObject[regionId]
            out._data_[regionId] = {}

            for (const date in dateValueMap) {
                const value = dateValueMap[date]
                out._data_[regionId][date] = { value: value }
            }
        }

        return out
    }

    out.hasData = function () {
        return out._data_ != undefined && Object.keys(out._data_).length > 0
    }

    out.hasNumericData = function () {
        if (!out._data_) return false

        return Object.values(out._data_).some((d) => Number.isFinite(+d.value))
    }

    /** Return all stat values as an array. This can be used to classify the values. */
    out.getArray = function () {
        if (out.hasData()) {
            return Object.values(out._data_)
                .map((s) => s.value)
                .filter((s) => s == 0 || s)
        }
    }

    /** Return stat unique values. This can be used for categorical maps. */
    out.getUniqueValues = function () {
        if (out.hasData()) {
            return Object.values(out._data_)
                .map((s) => s.value)
                .filter((item, i, ar) => ar.indexOf(item) === i)
        }
    }
    /** Get min value. */
    out.getMin = function () {
        if (out.hasNumericData()) {
            return Object.values(out._data_)
                .map((s) => s.value)
                .filter((s) => s == 0 || (s && s !== ':'))
                .reduce((acc, v) => Math.min(acc, v))
        }
    }
    /** Get max value. */
    out.getMax = function () {
        if (out.hasNumericData()) {
            return Object.values(out._data_)
                .map((s) => s.value)
                .filter((s) => s == 0 || (s && s !== ':'))
                .reduce((acc, v) => Math.max(acc, v))
        }
    }
    /** Get max value region. */
    out.getMaxRegionId = function () {
        if (out.hasNumericData()) {
            let maxVal = -Infinity
            let maxRegion = null
            for (const regionId in out._data_) {
                const s = out._data_[regionId]
                const val = s.value
                if (val != null && val !== ':' && val > maxVal) {
                    maxVal = val
                    maxRegion = regionId
                }
            }
            return maxRegion
        }
    }
    /** Get min value region. */
    out.getMinRegionId = function () {
        if (out.hasNumericData()) {
            let minVal = Infinity
            let minRegion = null
            for (const regionId in out._data_) {
                const s = out._data_[regionId]
                const val = s.value
                if (val != null && val !== ':' && val < minVal) {
                    minVal = val
                    minRegion = regionId
                }
            }
            return minRegion
        }
    }

    /** Check if the stat data is ready. */
    out.isReady = function () {
        //return out.hasData()
        // Data is ready if _data_ has been explicitly set (even to empty object)
        return out._data_ !== undefined
    }

    /** Some metadata */
    out.metadata = undefined

    //a text for the statitics unit of measure, to be shown in the tooltip
    out.unitText_ = undefined

    /**
     * Retrieve stat data from remote data sources.
     *
     * @param {*} nutsLevel
     * @param {*} callback
     */
    out.retrieveFromRemote = function (nutsLevel, lang, callback) {
        if (out.eurostatDatasetCode_) updateEurobase(nutsLevel, lang, callback)
        else if (out.csvURL_) updateCSV(callback)
        return out
    }

    //TODO decompose into Eurobase/jsonstat and CSV types ?

    /**
     * Eurobase/jsonstat data source
     * See https://ec.europa.eu/eurostat/web/json-and-unicode-web-services/getting-started/rest-request
     */

    /** The Eurobase dataset code */
    out.eurostatDatasetCode_ = undefined
    /** The Eurobase code */
    out.filters_ = { lastTimePeriod: 1 }
    /** The precision (number of decimal places) */
    out.precision_ = 2
    /** Dataset label/name */
    out.label_ = undefined

    /**
     * Return promise for Eurobase/jsonstat data.
     */
    const getEurobasePromise = function (nutsLevel, lang) {
        //set precision //DEPRECATED 16/11/2021 https://ec.europa.eu/eurostat/online-help/public/en/NAVIGATION_WDDSTranslator_migration_en/#DECOMMISSION
        //out.filters_["precision"] = out.precision_;
        //select only required geo groups, depending on the specified nuts level
        if (!out.filters_.geo) {
            out.filters_['geoLevel'] = nutsLevel + '' === '0' ? 'country' : 'nuts' + nutsLevel
        }

        //force filtering of euro-geo-aggregates
        //out.filters_["filterNonGeo"] = 1; //DEPRECATED 16/11/2021

        //retrieve stat data from Eurostat API
        return json(getEstatDataURL(out.eurostatDatasetCode_, out.filters_, lang))
    }

    //for eurobase statistical data to retrieve from Eurostat API
    const updateEurobase = function (nutsLevel, lang, callback) {
        //erase previous data
        out._data_ = null

        getEurobasePromise(nutsLevel, lang).then(function (data___) {
            if (data___.error) return console.error('Error retrieving Eurostat data: ' + data___.error[0]?.label)
            //decode stat data
            const jsd = JSONstat(data___)

            //store jsonstat metadata
            out.metadata = {
                label: jsd.label,
                href: jsd.href,
                source: jsd.source,
                updated: jsd.updated,
                extension: jsd.extension,
            }
            out.metadata.time = jsd.Dimension('time').id[0]

            //index
            out._data_ = jsonstatToIndex(jsd)
            //TODO: use maybe https://github.com/badosa/JSON-stat/blob/master/utils/fromtable.md to build directly an index ?

            //handle null values
            // #172 when using jsonstat-toolkit, values of null mean 'no data' and are converted to ":"
            Object.keys(out._data_).forEach((k) => {
                // Handle case where entire entry is null
                if (out._data_[k] === null) {
                    out._data_[k] = { value: ':' }
                } else if (out._data_[k].value === null) {
                    // Handle case where entry exists but value is null
                    out._data_[k].value = ':'
                }
            })

            if (callback) callback()
        })
    }

    /**
     * Return the time stamp of the jsonstat dataset.
     */
    out.getTime = function () {
        const t = out.filters_.time
        if (t) return t
        if (!out._data_) return
        return out.metadata.time
    }

    /**
     * CSV data source
     */

    /** The CSV file URL */
    out.csvURL_ = undefined
    /** The CSV column with the NUTS ids */
    out.geoCol_ = 'geo'
    /** The CSV column with the statistical values */
    out.valueCol_ = 'value'

    /**
     * Return promise for CSV data.
     */
    const getCSVPromise = function (nutsLevel) {
        return csv(out.csvURL_)
    }

    //for statistical data to retrieve from CSV file
    const updateCSV = function (callback) {
        //erase previous data
        out._data_ = null

        //retrieve csv data
        getCSVPromise().then(function (data___) {
            //decode stat data
            out._data_ = csvToIndex(data___, out.geoCol_, out.valueCol_)

            //store some metadata
            out.metadata = { href: out.csvURL_ }

            if (callback) callback()
        })
    }

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['unitText_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) for (let key in config) out[key + '_'] = config[key]

    return out
}
