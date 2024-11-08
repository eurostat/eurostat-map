// takes care of the map's geometries
import { json } from 'd3-fetch'
import { feature } from 'topojson-client'
import { executeForAllInsets } from './utils'
import { kosovoBnFeatures } from './kosovo'

// Geometries class wrapped as a function
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
    out.getDefaultGeoData = function (geo, filterGeometriesFunction) {
        const promises = out.getDefaultGeoDataPromise()
        return Promise.all(promises)
            .then((results) => {
                if (filterGeometriesFunction) {
                    results = filterGeometriesFunction(results)
                }

                out.geoData = results[0]
                if (withCenterPoints) {
                    out.centroidsData = nutsLevel === 'mixed' ? [results[4], results[5], results[6], results[7]] : results[1]
                }

                const isWorld = geo === 'WORLD'
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

    out.addDefaultGeometriesToMap = function (
        container,
        bordersToShow,
        drawGraticule,
        pathFunction,
        nutsLevel,
        geo,
        proj,
        scale
    ) {
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
                this.geoJSONs.mixed.rg1 = feature(allNUTSGeoData[1], allNUTSGeoData[1].objects.nutsrg).features
                this.geoJSONs.mixed.rg2 = feature(allNUTSGeoData[2], allNUTSGeoData[2].objects.nutsrg).features
                this.geoJSONs.mixed.rg3 = feature(allNUTSGeoData[3], allNUTSGeoData[3].objects.nutsrg).features

                //for mixed NUTS, we add every NUTS region across all levels and hide level 1,2,3 by default, only showing them when they have stat data
                // see updateClassification and updateStyle in map-choropleth.js for hiding/showing
                ;[this.geoJSONs.mixed.rg0, this.geoJSONs.mixed.rg1, this.geoJSONs.mixed.rg2, this.geoJSONs.mixed.rg3].forEach(
                    (r, i) => {
                        //append each nuts level to map
                        container
                            .append('g')
                            .attr('id', 'em-nutsrg')
                            .attr('class', 'em-nutsrg')
                            .selectAll('path')
                            .data(r)
                            .enter()
                            .append('path')
                            .attr('d', pathFunction)
                            .attr('lvl', i) //to be able to distinguish nuts levels
                    }
                )

                //add kosovo
                if (geo == 'EUR' && proj == '3035') {
                    // add kosovo manually
                    let kosovoBn = feature(kosovoBnFeatures[scale], 'nutsbn_1').features
                    if (bordersToShow.includes('cc')) {
                        container
                            .append('g')
                            .attr('id', 'em-kosovo-bn')
                            .attr('class', 'em-kosovo-bn')
                            .selectAll('path')
                            .data(kosovoBn)
                            .enter()
                            .append('path')
                            .attr('d', pathFunction)
                    }
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
                    if (bordersToShow.includes('eu') && bn.properties.eu == 'T') return bn
                    if (bordersToShow.includes('efta') && bn.properties.efta == 'T') return bn
                    if (bordersToShow.includes('cc') && bn.properties.cc == 'T') return bn
                    if (bordersToShow.includes('oth') && bn.properties.oth == 'T') return bn
                    if (bordersToShow.includes('co') && bn.properties.co == 'T') return bn
                })
                .attr('d', pathFunction)
                .attr('class', function (bn) {
                    return bn.properties.co === 'T' ? 'em-bn-co' : 'em-cntbn'
                })
        }

        //draw NUTS boundaries
        if (this.geoJSONs.nutsbn) {
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
                    if (bordersToShow.includes('eu') && bn.properties.eu == 'T') return bn
                    if (bordersToShow.includes('efta') && bn.properties.efta == 'T') return bn
                    if (bordersToShow.includes('cc') && bn.properties.cc == 'T') return bn
                    if (bordersToShow.includes('oth') && bn.properties.oth == 'T') return bn
                    if (bordersToShow.includes('co') && bn.properties.co == 'T') return bn
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

            if (geo == 'EUR' && proj == '3035') {
                // add kosovo manually
                let kosovoBn = feature(kosovoBnFeatures[scale], 'nutsbn_1').features
                if (bordersToShow.includes('cc')) {
                    container
                        .append('g')
                        .attr('id', 'em-kosovo-bn')
                        .attr('class', 'em-kosovo-bn')
                        .selectAll('path')
                        .data(kosovoBn)
                        .enter()
                        .append('path')
                        .attr('d', pathFunction)
                }
            }
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
            //add kosovo to world map
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
            container
                .append('g')
                .attr('class', geometry.class ? geometry.class : '')
                .selectAll('path')
                .data(geometry.features)
                .enter()
                .append('path')
                .attr('d', pathFunction)
        })
    }

    return out
}
