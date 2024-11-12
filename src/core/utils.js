/**
 * Return a GeoJSON feature representing a bounding box, with multipoint geometry.
 * This bounding box is an array like the one in topojson bbox element.
 * [xmin,ymin,xmax,ymax]
 * This is useful for to call d3.fitSize([w, h], getTopoJSONExtentAsGeoJSON(topo.bbox)))
 *
 * @param {*} bb The bounding box [xmin,ymin,xmax,ymax]. For topojson data, just give the topojson.bbox element.
 */
export const getBBOXAsGeoJSON = function (bb) {
    return {
        type: 'Feature',
        geometry: {
            type: 'MultiPoint',
            coordinates: [
                [bb[0], bb[1]],
                [bb[2], bb[3]],
            ],
        },
    }
}

// indexing

/**
 * Index JSONStat stat values by 'geo' code.
 * Return a structure like: {geo:{value:0,status:""}}
 *
 * @param {*} jsData The JSONStat data to index
 */
export const jsonstatToIndex = function (jsData) {
    const ind = {}
    const geos = jsData.Dimension('geo').id
    for (let i = 0; i < geos.length; i++) ind[geos[i]] = jsData.Data(i)
    return ind
}

/**
 * Index CSV stat values by 'geo' code.
 * Return a structure like: {geo:{value:0,status:""}}
 *
 * @param {*} csvData The CSV data to index
 * @param {*} geoCol The name of the geo column in the CSV data
 * @param {*} valueCol The name of the statistical value column in the CSV file.
 */
export const csvToIndex = function (csvData, geoCol, valueCol) {
    const ind = {}
    for (let i = 0; i < csvData.length; i++) {
        const d = csvData[i]
        const v = d[valueCol]
        if (!v) {
            ind[d[geoCol]] = { value: ':', status: '' }
        } else {
            ind[d[geoCol]] = { value: isNaN(+v) ? v : +v, status: '' }
        }
    }
    return ind
}

/**
 * @description returns string with space as thousand separator
 * @function spaceAsThousandSeparator
 * @param {number} number
 */
export const spaceAsThousandSeparator = function (number) {
    return number.toLocaleString('en').replace(/,/gi, ' ')
}

//REST API
export const getEstatRestDataURLBase = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/'

/**
 * Build URL to fetch data from eurobase REST API.
 * @param {string} datasetCode The Eurobase dataset code
 * @param {object=} filters The filter parameters as for example: {key:value,key:[value1,value2,value3]}
 * @param {number=} lang
 * @param {number=} format
 * @param {number=} version
 */
export const getEstatDataURL = function (datasetCode, filters, lang, format) {
    lang = lang || 'en'
    format = format || 'json'
    var url = []
    url.push(getEstatRestDataURLBase, datasetCode, '?', 'format=', format, '&lang=', lang)
    if (filters)
        for (var param in filters) {
            var o = filters[param]
            if (Array.isArray(o)) for (var i = 0; i < o.length; i++) url.push('&', param, '=', o[i])
            else url.push('&', param, '=', o)
        }
    return url.join('')
}

/**
 * @param {string} name
 * @returns {string}
 */
export const getURLParameterByName = function (name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]')
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(location.search)
    return !results ? null : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

//flags
export const flags = {
    b: 'break in time series',
    c: 'confidential',
    d: 'definition differs, see metadata',
    e: 'estimated',
    f: 'forecast',
    n: 'not significant',
    p: 'provisional',
    r: 'revised',
    s: 'Eurostat estimate',
    u: 'low reliability',
    z: 'not applicable',
}

/**
 * @description
 * @param {*} insets map.insets
 * @param {*} mainSvgId the ID of the map's svg
 * @param {*} callback the function to execute for each inset
 * @param {*} [parameter=null] the parameter to pass to the callback
 */
export const executeForAllInsets = function (insets, mainSvgId, callback, parameter = null) {
    for (const geo in insets) {
        const insetGroup = insets[geo]

        if (Array.isArray(insetGroup)) {
            insetGroup.forEach((inset) => {
                // Handle nested arrays for multiple insets with the same geo
                if (Array.isArray(inset)) {
                    inset.forEach((nestedInset) => {
                        if (nestedInset.svgId_ !== mainSvgId) {
                            callback(nestedInset, parameter)
                        }
                    })
                } else {
                    if (inset.svgId_ !== mainSvgId) {
                        callback(inset, parameter)
                    }
                }
            })
        } else {
            // Apply callback to unique inset
            if (insetGroup.svgId_ !== mainSvgId) {
                callback(insetGroup, parameter)
            }
        }
    }
}
