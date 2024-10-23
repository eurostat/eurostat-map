// takes care of the map's geometries
import { json } from 'd3-fetch'
import { feature } from 'topojson-client'
import { executeForAllInsets } from './utils'

export const Geometries = function (map, withCenterPoints) {
    let out = {}
    out.geoData = undefined
    out.allNUTSGeoData = undefined
    out.centroidsData = undefined
    out.geoJSONs = {
        mixed: { rg0: undefined, rg1: undefined, rg2: undefined, rg3: undefined },
        cntbn: undefined,
        cntrg: undefined,
        nutsbn: undefined,
        nutsrg: undefined,
        gra: undefined,
        worldrg: undefined,
        worldbn: undefined,
        kosovo: undefined,
    }

    /**
     * Retrieves and parses 'default' geo data (for NUTS or World maps)
     */
    out.getDefaultGeoData = function () {
        const promises = out.getDefaultGeoDataPromise()
        return Promise.all(promises)
            .then((results) => {
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

                return results
            })
            .catch((err) => {
                return Promise.reject(err)
            })
    }

    /**
     * Returns an array of promises for Nuts2JSON topojson data.
     */
    out.getDefaultGeoDataPromise = function () {
        const nutsLevels = [0, 1, 2, 3]
        const promises = []

        const buildUrl = (base, year, geo, proj, scale, level, withCenter = false) => {
            let path = `${base}/${year}`
            if (geo !== 'EUR') path += `/${geo}`
            path += `/${proj}/${scale ? scale + '/' : ''}${withCenter ? 'nutspt_' : ''}${level}.json`
            return path
        }

        if (map.nutsLevel_ === 'mixed' && map.geo_ !== 'WORLD') {
            nutsLevels.forEach((lvl) =>
                promises.push(json(buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, lvl)))
            )
            if (withCenterPoints) {
                nutsLevels.forEach((lvl) =>
                    promises.push(
                        json(buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, lvl, true))
                    )
                )
            }
        } else if (map.geo_ === 'WORLD') {
            promises.push(
                json('https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json')
            )
        } else {
            promises.push(json(buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, map.nutsLevel_)))
            if (withCenterPoints) {
                promises.push(
                    json(buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, map.nutsLevel_, true))
                )
            }
        }

        return promises
    }

    /** Checks if all geo data is ready */
    out.isGeoReady = function () {
        if (!out.geoData) return false

        let allReady = true

        executeForAllInsets(map.insetTemplates_, null, (inset) => {
            if (!inset.Geometries.isGeoReady()) {
                allReady = false
            }
        })

        return allReady
    }

    return out
}
