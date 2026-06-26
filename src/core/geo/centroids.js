import { geoCentroid } from 'd3-geo'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('../../types/core/layer/Layer').Layer} Layer */

const getLayerAndMap = function (layerOrMap) {
    if (layerOrMap.map) {
        return { layer: layerOrMap, map: layerOrMap.map }
    }
    return { layer: layerOrMap, map: layerOrMap }
}

const setupBaseCentroids = function (map) {
    let centroidFeatures

    if (!map.Geometries.centroidsData) {
        // if centroids data is absent (e.g. for world maps) then calculate manually
        if (map.geo_ == 'WORLD') {
            centroidFeatures = []
            map.Geometries.geoJSONs.worldrg.forEach((feature) => {
                let newFeature = { ...feature }
                // exception for France (because guyane)
                if (feature.properties.id == 'FR') {
                    newFeature.geometry = {
                        coordinates: [2.2, 46.2],
                        type: 'Point',
                    }
                } else {
                    newFeature.geometry = {
                        coordinates: geoCentroid(feature),
                        type: 'Point',
                    }
                }
                centroidFeatures.push(newFeature)
            })
        } else {
            // Fallback: compute centroids from cntrg polygon geometries
            centroidFeatures = (map.Geometries.geoJSONs.cntrg || []).map((feature) => {
                const newFeature = { ...feature }
                newFeature.geometry = { coordinates: geoCentroid(feature), type: 'Point' }
                return newFeature
            })
        }
    } else {
        if (map.nutsLevel_ == 'mixed') {
            centroidFeatures = [
                ...map.Geometries.centroidsData[0].features,
                ...map.Geometries.centroidsData[1].features,
                ...map.Geometries.centroidsData[2].features,
                ...map.Geometries.centroidsData[3].features,
            ]
        } else {
            centroidFeatures = map.Geometries.centroidsData.features
        }
    }

    if (map.processCentroids_) centroidFeatures = map.processCentroids_(centroidFeatures)

    // Project and save coordinates
    const projectedCentroids = centroidFeatures.map((d) => {
        d.properties.centroid = map._projection(d.geometry.coordinates)
        return d
    })

    // Supplement with any cntrg region not covered by the nuts centroid files.
    if (map.Geometries.geoJSONs.cntrg && map.geo_ !== 'WORLD') {
        const existingIds = new Set(projectedCentroids.map((d) => d.properties.id))
        for (const feature of map.Geometries.geoJSONs.cntrg) {
            if (existingIds.has(feature.properties.id)) continue
            const projected = map._pathFunction.centroid(feature)
            if (!projected || isNaN(projected[0]) || isNaN(projected[1])) continue
            projectedCentroids.push({
                ...feature,
                geometry: { type: 'Point', coordinates: projected },
                properties: { ...feature.properties, centroid: projected },
            })
        }
    }

    // Keep unfiltered master copy
    map.Geometries._allCentroidsFeatures = [...projectedCentroids]
}

const renderCentroidsForLayer = function (layer) {
    const map = layer.map || layer
    if (!map.Geometries._allCentroidsFeatures) return

    layer.centroidsFeatures_ = map.Geometries._allCentroidsFeatures.filter((d) => centroidHasStatData(d.properties.id, layer))

    if (layer === map) {
        map.Geometries.centroidsFeatures = layer.centroidsFeatures_
    }

    // Append container if not existing
    let gcp = getCentroidsGroup(layer)
    if (gcp.empty()) {
        if (layer !== map && typeof layer.group === 'function') {
            gcp = layer.group().append('g').attr('class', 'em-centroids')
        } else {
            gcp = map
                .svg()
                .select('#em-zoom-group-' + map.svgId_)
                .append('g')
                .attr('id', `em-centroids-${map.svgId_}`)
                .attr('class', 'em-centroids')
        }
    }

    // Join pattern for centroids
    gcp.selectAll('g.em-centroid')
        .data(layer.centroidsFeatures_, (d) => d.properties.id)
        .join(
            (enter) =>
                enter
                    .append('g')
                    .attr('class', 'em-centroid')
                    .attr('id', (d) => 'ps' + d.properties.id)
                    .attr('transform', (d) => `translate(${d.properties.centroid[0].toFixed(3)},${d.properties.centroid[1].toFixed(3)})`),
            (update) => update,
            (exit) => exit.remove()
        )
}

/**
 * @param {MapInstance|Layer} layerOrMap
 */
export const addCentroidsToMap = function (layerOrMap) {
    if (layerOrMap.layers_ && Array.isArray(layerOrMap.layers_)) {
        // It's a map! We must first set up the base centroids on the map
        const map = layerOrMap
        setupBaseCentroids(map)
        
        // Then add centroids for each layer
        map.layers_.forEach((l) => {
            renderCentroidsForLayer(l)
        })
        return
    }

    const { layer, map } = getLayerAndMap(layerOrMap)
    // Make sure base centroids are set up
    if (!map.Geometries._allCentroidsFeatures) {
        setupBaseCentroids(map)
    }
    renderCentroidsForLayer(layer)
}

/**
 * Returns the D3 selection for the proportional symbols container
 * of the given layer or map (main or inset).
 *
 * Always uses a map-specific ID to avoid collisions with insets.
 */
export const getCentroidsGroup = function (layerOrMap) {
    const { layer, map } = getLayerAndMap(layerOrMap)
    
    // For a real Layer overlay path:
    if (layer !== map && typeof layer.group === 'function') {
        const lg = layer.group()
        if (!lg || lg.empty()) return lg
        let g = lg.select('.em-centroids')
        if (g.empty()) {
            g = lg.append('g').attr('class', 'em-centroids')
        }
        return g
    }
    
    // For legacy/facade map path:
    return map.svg() ? map.svg().select(`#em-centroids-${map.svgId_}`) : null
}

const refreshCentroidsForLayer = function (layerOrMap) {
    const { layer, map } = getLayerAndMap(layerOrMap)

    // Skip for grid cartograms
    if (map.gridCartogram_) return

    const allCentroids = map.Geometries._allCentroidsFeatures
    if (!allCentroids) return

    layer.centroidsFeatures_ = allCentroids.filter((d) => centroidHasStatData(d.properties.id, layer))
    
    if (layer === map) {
        map.Geometries.centroidsFeatures = layer.centroidsFeatures_
    }

    const gcp = getCentroidsGroup(layer)
    if (gcp && !gcp.empty()) {
        gcp.selectAll('g.em-centroid')
            .data(layer.centroidsFeatures_, (d) => d.properties.id)
            .join(
                (enter) =>
                    enter
                        .append('g')
                        .attr('class', 'em-centroid')
                        .attr('id', (d) => 'ps' + d.properties.id)
                        .attr('transform', (d) => `translate(${d.properties.centroid[0].toFixed(3)},${d.properties.centroid[1].toFixed(3)})`),
                (update) => update,
                (exit) => exit.remove()
            )
    }
}

// This will remove any centroids with no statistical data and re-add centroids for regions that just got data.
export const refreshCentroids = function (layerOrMap) {
    if (layerOrMap.layers_ && Array.isArray(layerOrMap.layers_)) {
        // It's a map! Refresh for all layers.
        layerOrMap.layers_.forEach((l) => {
            refreshCentroidsForLayer(l)
        })
        return layerOrMap
    }

    refreshCentroidsForLayer(layerOrMap)
    return layerOrMap
}

// Small helper to check if region has statistical data
export const centroidHasStatData = function (id, layerOrMap) {
    const { layer, map } = getLayerAndMap(layerOrMap)
    
    if (!layer.statCodes_) return true // if no data yet, keep everything
    
    const statName =
        layer.encoding?.('height')?.stat ||
        layer.encoding?.('composition')?.stat ||
        (map.statMeta_?.height ? 'height' : undefined) ||
        (map.statMeta_?.composition ? 'composition' : undefined) ||
        Object.keys(map.statMeta_ || {})[0]

    return layer.statCodes_.some((code) => {
        const statKey = map.statMeta_?.[statName]?.statKeys?.[code] || code
        const s = map.statData(statKey)?.get(id)
        return s && !isNaN(s.value) && s.value !== 0
    })
}

