// takes care of the map's geometries
import { json } from 'd3-fetch'
import { feature } from 'topojson-client'
import { executeForAllInsets } from './utils'
import { kosovoBnFeatures } from './kosovo'
import { geoGraticule } from 'd3-geo'
import { get, set } from 'idb-keyval'

// Geometries class wrapped as a function
export const Geometries = function (map, withCenterPoints) {
    let out = {}

    // defaults
    out.defaultGeoData = undefined
    out.allNUTSGeoData = undefined
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

    // user defined geometries (layers)
    out.userGeometries = undefined

    // user defined statistical regions
    out.statisticalRegions = undefined

    //centroids for prop symbols etc
    out.centroidsData = undefined // raw TopoJSON centroids (all levels)
    out.centroidsFeatures = undefined // filtered + projected centroids for rendering
    out._allCentroidsFeatures = undefined // unfiltered master copy for rebuilding

    // get geojson features of all statistical regions
    out.getRegionFeatures = function () {
        if (map.geo_ == 'WORLD') {
            return out.geoJSONs.worldrg
        } else {
            if (map.nutsLevel_ === 'mixed') {
                return [out.geoJSONs.mixed.rg0, out.geoJSONs.mixed.rg1, out.geoJSONs.mixed.rg2, out.geoJSONs.mixed.rg3]
            } else {
                return out.geoJSONs.nutsrg.concat(out.geoJSONs.cntrg)
            }
        }
    }

    /**
     * Retrieves and parses 'default' geo data (for NUTS or World maps)
     */
    out.getDefaultGeoData = function (geo, filterGeometriesFunction, nutsLevel) {
        const promises = out.getDefaultGeoDataPromise()
        return Promise.all(promises)
            .then((results) => {
                if (filterGeometriesFunction) {
                    results = filterGeometriesFunction(results)
                }
                out.allNUTSGeoData = results
                out.defaultGeoData = results[0]

                if (withCenterPoints) {
                    out.centroidsData = nutsLevel === 'mixed' ? [results[4], results[5], results[6], results[7]] : results[1]
                }

                const isWorld = geo === 'WORLD'
                // Decode TopoJSON to GeoJSON
                if (isWorld) {
                    out.geoJSONs.worldrg = feature(out.defaultGeoData, out.defaultGeoData.objects.CNTR_RG_20M_2020_4326).features
                    out.geoJSONs.worldbn = feature(out.defaultGeoData, out.defaultGeoData.objects.CNTR_BN_20M_2020_4326).features
                    out.geoJSONs.kosovo = feature(out.defaultGeoData, out.defaultGeoData.objects.NUTS_BN_20M_2021_RS_XK_border).features
                    out.geoJSONs.graticule = [geoGraticule().step([30, 30])()]
                } else {
                    out.geoJSONs.graticule = feature(out.defaultGeoData, out.defaultGeoData.objects.gra).features
                    out.geoJSONs.nutsrg = feature(out.defaultGeoData, out.defaultGeoData.objects.nutsrg).features
                    out.geoJSONs.nutsbn = feature(out.defaultGeoData, out.defaultGeoData.objects.nutsbn).features
                    out.geoJSONs.cntrg = feature(out.defaultGeoData, out.defaultGeoData.objects.cntrg).features
                    out.geoJSONs.cntbn = feature(out.defaultGeoData, out.defaultGeoData.objects.cntbn).features
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
            if (geo && geo !== 'EUR' && geo !== 'WORLD') path += `/${geo}`
            path += `/${geo == 'WORLD' ? '4326' : proj}`
            if (!withCenter && scale) path += `/${scale}`
            path += `/${withCenter ? 'nutspt_' : ''}${level}.json`
            return path
        }

        const TTL_MS = 24 * 60 * 60 * 1000 // cache refreshes every 24 hours

        const fetchWithCache = async (url) => {
            const cacheKey = `geojson-cache:${url}`

            try {
                const cached = await get(cacheKey)
                if (cached) {
                    const { timestamp, data } = cached
                    const isFresh = Date.now() - timestamp < TTL_MS
                    if (isFresh) return data
                }
            } catch (e) {
                console.warn(`Error reading from IndexedDB cache for ${url}:`, e)
                throw e // Optionally allow failure to propagate
            }

            const data = await json(url)

            try {
                await set(cacheKey, {
                    timestamp: Date.now(),
                    data: data,
                })
            } catch (e) {
                console.warn(`Could not cache data in IndexedDB for ${url}:`, e)
                throw e // Optionally allow failure to propagate
            }

            return data
        }

        if (!map || !map.nuts2jsonBaseURL_) {
            throw new Error('Missing required map context or configuration')
        }

        if (map.nutsLevel_ === 'mixed' && map.geo_ !== 'WORLD') {
            nutsLevels.forEach((lvl) => {
                const url = buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, lvl)
                promises.push(fetchWithCache(url))
            })
            if (withCenterPoints) {
                nutsLevels.forEach((lvl) => {
                    const url = buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, lvl, true)
                    promises.push(fetchWithCache(url))
                })
            }
        } else if (map.geo_ === 'WORLD') {
            const worldMapTopojsonURL = window.location.hostname.includes('ec.europa.eu')
                ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/IMAGE/WORLD_4326.json'
                : 'https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json'

            promises.push(fetchWithCache(worldMapTopojsonURL))
        } else {
            const mainUrl = buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, map.nutsLevel_)
            promises.push(fetchWithCache(mainUrl))

            if (withCenterPoints) {
                const ptUrl = buildUrl(map.nuts2jsonBaseURL_, map.nutsYear_, map.geo_, map.proj_, map.scale_, map.nutsLevel_, true)
                promises.push(fetchWithCache(ptUrl))
            }
        }

        return promises
    }

    /** Checks if all geo data is ready */
    out.isGeoReady = function () {
        if (!out.defaultGeoData && !out.userGeometries) return false

        let allReady = true

        executeForAllInsets(map.insetTemplates_, null, (inset) => {
            if (!inset.Geometries.isGeoReady()) {
                allReady = false
            }
        })

        return allReady
    }

    out.setUserGeometries = function (geometries) {
        this.userGeometries = geometries

        // get regions that are linked to the statistics
        geometries.forEach((geometry) => {
            if (geometry.statisticalRegions) {
                this.statisticalRegions = geometry
            }
        })
    }

    out.addDefaultGeometriesToMap = function (container, drawGraticule, pathFunction, nutsLevel, nutsYear, geo, proj, scale) {
        if (this.geoJSONs.graticule && drawGraticule) {
            //draw graticule
            container
                .append('g')
                .attr('id', 'em-graticule')
                .attr('class', 'em-graticule')
                .selectAll('path')
                .data(this.geoJSONs.graticule)
                .enter()
                .append('path')
                .attr('d', pathFunction)
        }

        //draw country regions
        if (this.geoJSONs.cntrg) {
            container
                .append('g')
                .attr('id', 'em-cntrg')
                .attr('class', 'em-cntrg')
                .selectAll('path')
                .data(this.geoJSONs.cntrg)
                .enter()
                .append('path')
                .attr('d', pathFunction)
                .attr('id', (cntrg) => {
                    // add ids for RS and EL so that we can choose not to add statistical data to them.
                    const id = cntrg.properties.id
                    if (id == 'RS' || id == 'EL') {
                        return 'em-cntrg-' + id
                    }
                })
        }

        //draw world map
        if (this.geoJSONs.worldrg) {
            container
                .append('g')
                .attr('id', 'em-worldrg')
                .attr('class', 'em-worldrg')
                .selectAll('path')
                .data(this.geoJSONs.worldrg)
                .enter()
                .append('path')
                .attr('d', pathFunction)
        }

        //draw NUTS regions
        if (this.geoJSONs.nutsrg) {
            if (nutsLevel == 'mixed') {
                this.geoJSONs.mixed.rg0 = this.geoJSONs.nutsrg
                this.geoJSONs.mixed.rg1 = feature(out.allNUTSGeoData[1], out.allNUTSGeoData[1].objects.nutsrg).features
                this.geoJSONs.mixed.rg2 = feature(out.allNUTSGeoData[2], out.allNUTSGeoData[2].objects.nutsrg).features
                this.geoJSONs.mixed.rg3 = feature(out.allNUTSGeoData[3], out.allNUTSGeoData[3].objects.nutsrg).features

                //for mixed NUTS, we add every NUTS region across all levels and hide level 1,2,3 by default, only showing them when they have stat data
                // see updateClassification and updateStyle in map-choropleth.js for hiding/showing
                ;[this.geoJSONs.mixed.rg0, this.geoJSONs.mixed.rg1, this.geoJSONs.mixed.rg2, this.geoJSONs.mixed.rg3].forEach((r, i) => {
                    //append each nuts level to map
                    container
                        .append('g')
                        .attr('id', 'em-nutsrg')
                        .attr('class', `em-nutsrg em-nutsrg-${i}`)
                        .selectAll('path')
                        .data(r)
                        .enter()
                        .append('path')
                        .attr('d', pathFunction)
                        .attr('lvl', i) //to be able to distinguish nuts levels
                })

                //add kosovo
                if (geo == 'EUR' && (proj == '3035' || proj == '4326')) {
                    // add kosovo manually
                    addKosovoBorder(container, pathFunction, proj, scale, nutsYear)
                }
            } else {
                // when nutsLevel is not 'mixed'
                container
                    .append('g')
                    .attr('id', 'em-nutsrg')
                    .attr('class', 'em-nutsrg')
                    .selectAll('path')
                    .data(this.geoJSONs.nutsrg)
                    .enter()
                    .append('path')
                    .attr('d', pathFunction)
            }
        }

        //draw country boundaries
        if (this.geoJSONs.cntbn) {
            container
                .append('g')
                .attr('id', 'em-cntbn')
                .attr('class', 'em-cntbn')
                .selectAll('path')
                .data(this.geoJSONs.cntbn)
                .enter()
                .append('path')
                .filter(function (bn) {
                    if (bn.properties.eu == 'T') return bn
                    if (bn.properties.efta == 'T') return bn
                    if (bn.properties.cc == 'T') return bn
                    if (bn.properties.oth == 'T') return bn
                    if (bn.properties.co == 'T') return bn
                })
                .attr('d', pathFunction)
                .attr('id', (bn) => 'em-bn-' + bn.properties.id)
                .attr('class', function (bn) {
                    let classList = []

                    if (bn.properties.eu === 'T') classList.push('em-bn-eu')
                    if (bn.properties.efta === 'T') classList.push('em-bn-efta')
                    if (bn.properties.cc === 'T') classList.push('em-bn-cc')
                    if (bn.properties.oth === 'T') classList.push('em-bn-oth')
                    if (bn.properties.co === 'T') classList.push('em-bn-co')

                    return classList.join(' ') // Use join with a space to create a valid class string
                })
        }

        //draw NUTS boundaries
        if (this.geoJSONs.nutsbn && nutsLevel !== 'mixed') {
            this.geoJSONs.nutsbn.sort(function (bn1, bn2) {
                return bn2.properties.lvl - bn1.properties.lvl
            })
            container
                .append('g')
                .attr('id', 'em-nutsbn')
                .attr('class', 'em-nutsbn')
                .selectAll('path')
                .data(this.geoJSONs.nutsbn)
                .enter()
                .filter(function (bn) {
                    if (bn.properties.eu == 'T') return bn
                    if (bn.properties.efta == 'T') return bn
                    if (bn.properties.cc == 'T') return bn
                    if (bn.properties.oth == 'T') return bn
                    if (bn.properties.co == 'T') return bn
                })
                .append('path')
                .attr('d', pathFunction)
                .attr('class', function (bn) {
                    let props = bn.properties
                    //KOSOVO
                    if (props.id > 100000) {
                        return 'em-kosovo-bn'
                    }
                    if (props.co === 'T') return 'em-bn-co'
                    const cl = ['em-bn-' + props.lvl]
                    //if (bn.oth === "T") cl.push("bn-oth");
                    return cl.join(' ')
                })
        }

        //draw world boundaries
        if (this.geoJSONs.worldbn) {
            container
                .append('g')
                .attr('id', 'em-worldbn')
                .attr('class', 'em-worldbn')
                .selectAll('path')
                .data(this.geoJSONs.worldbn)
                .enter()
                .append('path')
                .attr('d', pathFunction)
                .attr('class', function (bn) {
                    if (bn.properties.POL_STAT > 0) {
                        //disputed
                        return 'em-bn-d'
                    }
                    return bn.properties.COAS_FLAG === 'T' ? 'em-bn-co' : 'em-worldbn'
                })
            //.attr("id", (bn) => bn.properties.CNTR_BN_ID)
        }

        if (this.geoJSONs.kosovo) {
            //add kosovo to world maps
            container
                .append('g')
                .attr('id', 'em-kosovo-bn')
                .attr('class', 'em-kosovo-bn')
                .selectAll('path')
                .data(this.geoJSONs.kosovo)
                .enter()
                .append('path')
                .attr('d', pathFunction)
        }
    }

    function addKosovoBorder(container, pathFunction, proj, scale, nutsYear) {
        let kosovoFeature = kosovoBnFeatures[nutsYear] ? kosovoBnFeatures[nutsYear][proj][scale] : kosovoBnFeatures[2024][proj][scale]
        let kosovoBn = feature(kosovoFeature, 'nutsbn_1').features
        container
            .append('g')
            .attr('id', 'em-kosovo-bn')
            .attr('class', 'em-kosovo-bn em-bn-cc')
            .selectAll('path')
            .data(kosovoBn)
            .enter()
            .append('path')
            .attr('d', pathFunction)
    }

    /**
     * @description Adds user-defined geometries to the map
     * E.g.
     * map.geometries([
     *  { id: 'regions', features: geoJSON.features, class: (feature) => 'region' },
     *  { id: 'borders', features: bordersData, class: (feature) => 'border' }
     * ])
     * @param geometries array of objects, each containing an array of geoJSON features
     * @param container d3 selection of the parent that we append the geometries to
     * @param pathFunction d3 path function
     */
    out.addUserGeometriesToMap = function (geometries, container, pathFunction) {
        geometries.forEach((geometry) => {
            let group = container
                .append('g')
                .attr('id', geometry.statisticalRegions ? 'em-user-regions' : '')
                .attr('class', geometry.class ? geometry.class : '')

            let elements = group.selectAll('path').data(geometry.features).enter().append('path').attr('d', pathFunction)

            // Allow custom call chain modifications through onEach
            if (typeof geometry.onEach === 'function') {
                geometry.onEach(elements)
            }
        })
    }

    return out
}
