// takes care of adding geometries to the map.
import { json } from 'd3-fetch'
import { feature } from 'topojson-client'

export const Geometries = function (map, withCenterPoints) {
    let out = {}
    out.geoData = undefined
    out.allNUTSGeoData = undefined
    out.centroidsData = undefined
    out.geoJSONs = {
        //default placeholders
        mixed: {
            // for 'mixed' nuts level
            rg0: undefined, // nuts 0 regions
            rg1: undefined,
            rg2: undefined,
            rg3: undefined,
        },
        cntbn: undefined,
        cntrg: undefined,
        nutsbn: undefined,
        nutsrg: undefined,
        gra: undefined,
        worldrg: undefined,
        worldbn: undefined,
        kosovo: undefined,
    }

    out.getDefaultGeoData = function () {
        const promises = out.getDefaultGeoDataPromise()

        return Promise.all(promises)
            .then((results) => {
                // Apply user-defined filter function
                if (out.filterGeometriesFunction_) {
                    results = out.filterGeometriesFunction_(results)
                }

                out.geoData = results[0]

                if (withCenterPoints) {
                    out.centroidsData = out.nutsLevel_ === 'mixed' ? [results[4], results[5], results[6], results[7]] : results[1]
                }

                const isWorld = out.geo_ === 'WORLD'

                // Decode TopoJSON to GeoJSON
                if (isWorld) {
                    out.geoJSONs.worldrg = feature(out.geoData, out.geoData.objects.CNTR_RG_20M_2020_4326).features
                    out.geoJSONs.worldbn = feature(out.geoData, out.geoData.objects.CNTR_BN_20M_2020_4326).features
                    out.geoJSONs.kosovo = feature(out.geoData, out.geoData.objects.NUTS_BN_20M_2021_RS_XK_border).features
                    out.geoJSONs.graticule = [geoGraticule().step([30, 30])()]
                } else {
                    out.geoJSONs.graticule = feature(out.geoData, out.geoData.objects.gra).features
                    out.geoJSONs.nutsrg = feature(out.geoData, out.geoData.objects.nutsrg).features
                    out.geoJSONs.nutsbn = feature(out.geoData, out.geoData.objects.nutsbn).features
                    out.geoJSONs.cntrg = feature(out.geoData, out.geoData.objects.cntrg).features
                    out.geoJSONs.cntbn = feature(out.geoData, out.geoData.objects.cntbn).features
                }

                return results // This is the geoData array
            })
            .catch((err) => {
                // Handle any error case and propagate it
                return Promise.reject(err)
            })
    }

    /**
     * Return promise for Nuts2JSON topojson data.
     */
    out.getDefaultGeoDataPromise = function () {
        // for mixing all NUTS levels (i.e IMAGE)

        if (map.nutsLevel_ == 'mixed' && map.geo_ !== 'WORLD') {
            const promises = []
            ;[0, 1, 2, 3].forEach((lvl) => {
                const buf = []
                buf.push(map.nuts2jsonBaseURL_)
                buf.push(map.nutsYear_)
                if (map.geo_ != 'EUR') buf.push('/' + map.geo_)
                buf.push('/')
                buf.push(map.proj_)
                buf.push('/')
                buf.push(map.scale_)
                buf.push('/')
                buf.push(lvl)
                buf.push('.json')
                promises.push(json(buf.join('')))
            })

            //centroids nutspt_0.json

            if (withCenterPoints) {
                ;[0, 1, 2, 3].forEach((lvl) => {
                    const buf = []
                    buf.push(map.nuts2jsonBaseURL_)
                    buf.push(map.nutsYear_)
                    if (map.geo_ != 'EUR') buf.push('/' + map.geo_)
                    buf.push('/')
                    buf.push(map.proj_)
                    buf.push('/nutspt_')
                    buf.push(lvl)
                    buf.push('.json')
                    promises.push(json(buf.join('')))
                })
            }
            return promises

            // world maps
        } else if (map.geo_ == 'WORLD') {
            return [json('https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json')]
        } else {
            // NUTS maps for eurobase data with a specific NUTS level

            let promises = []
            const buf = []
            buf.push(map.nuts2jsonBaseURL_)
            buf.push(map.nutsYear_)
            if (map.geo_ != 'EUR') buf.push('/' + map.geo_)
            buf.push('/')
            buf.push(map.proj_)
            buf.push('/')
            buf.push(map.scale_)
            buf.push('/')
            buf.push(map.nutsLevel_)
            buf.push('.json')
            promises.push(json(buf.join('')))

            if (withCenterPoints) {
                const buf = []
                buf.push(map.nuts2jsonBaseURL_)
                buf.push(map.nutsYear_)
                if (map.geo_ != 'EUR') buf.push('/' + map.geo_)
                buf.push('/')
                buf.push(map.proj_)
                buf.push('/nutspt_')
                buf.push(map.nutsLevel_)
                buf.push('.json')
                promises.push(json(buf.join('')))
            }

            return promises
        }
    }

    /** */
    out.isGeoReady = function () {
        if (!out.geoData) return false
        //recursive call to inset components
        for (const geo in map.insetTemplates_) {
            // check for insets with same geo
            if (Array.isArray(map.insetTemplates_[geo])) {
                for (var i = 0; i < map.insetTemplates_[geo].length; i++) {
                    // insets with same geo that do not share the same parent inset
                    if (Array.isArray(map.insetTemplates_[geo][i])) {
                        // this is the case when there are more than 2 different insets with the same geo. E.g. 3 insets for PT20
                        for (var c = 0; c < map.insetTemplates_[geo][i].length; c++) {
                            if (!map.insetTemplates_[geo][i][c].Geometries.isGeoReady()) return false
                        }
                    } else {
                        if (!map.insetTemplates_[geo][i].Geometries.isGeoReady()) return false
                    }
                }
            } else {
                if (!map.insetTemplates_[geo].Geometries.isGeoReady()) return false
            }
        }

        return true
    }

    return out
}
