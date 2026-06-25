import { geoCentroid } from 'd3-geo'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */

/**
 * @param {MapInstance} map
 */
export const addCentroidsToMap = function (map) {
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
    // cntrg is the canonical list of all selectable country-level regions, including
    // non-EU neighbours (MD, BY, UA, RU, etc.) absent from nutspt_N.json.
    if (map.Geometries.geoJSONs.cntrg && map.geo_ !== 'WORLD') {
        const existingIds = new Set(projectedCentroids.map((d) => d.properties.id))
        for (const feature of map.Geometries.geoJSONs.cntrg) {
            if (existingIds.has(feature.properties.id)) continue
            // Use pathFunction.centroid() which operates in screen/pixel space,
            // matching how the polygon was projected onto the map
            const projected = map._pathFunction.centroid(feature)
            if (!projected || isNaN(projected[0]) || isNaN(projected[1])) continue
            projectedCentroids.push({
                ...feature,
                geometry: { type: 'Point', coordinates: projected },
                properties: { ...feature.properties, centroid: projected },
            })
        }
    }

    // Keep unfiltered master copy, then filter to regions with stat data
    map.Geometries._allCentroidsFeatures = [...projectedCentroids]
    map.Geometries.centroidsFeatures = projectedCentroids.filter((d) => centroidHasStatData(d.properties.id, map))

    // Append container if not existing
    const gcp = getCentroidsGroup(map).empty()
        ? map
              .svg()
              .select('#em-zoom-group-' + map.svgId_)
              .append('g')
              .attr('id', `em-centroids-${map.svgId_}`)
              .attr('class', 'em-centroids')
        : getCentroidsGroup(map)

    // Join pattern for centroids
    gcp.selectAll('g.em-centroid')
        .data(map.Geometries.centroidsFeatures, (d) => d.properties.id)
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
 * Returns the D3 selection for the proportional symbols container
 * of the given map (main or inset).
 *
 * Always uses a map-specific ID to avoid collisions with insets.
 */
export const getCentroidsGroup = function (map) {
    return map.svg().select(`#em-centroids-${map.svgId_}`)
}

// This will remove any centroids with no statistical data and re-add centroids for regions that just got data.
export const refreshCentroids = function (map) {
    // Skip for grid cartograms
    if (map.gridCartogram_) return map

    const allCentroids = map.Geometries._allCentroidsFeatures
    if (!allCentroids) return

    map.Geometries.centroidsFeatures = allCentroids.filter((d) => centroidHasStatData(d.properties.id, map))

    const gcp = getCentroidsGroup(map)

    gcp.selectAll('g.em-centroid')
        .data(map.Geometries.centroidsFeatures, (d) => d.properties.id)
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

    return map
}

// Small helper to check if region has statistical data
export const centroidHasStatData = function (id, map) {
    //TODO: statCodes_ is only for coxcomb and pie maps, ps maps should also be contemplated here
    if (!map.statCodes_) return true // if no data yet, keep everything
    const statName =
        map.encoding?.('height')?.stat ||
        map.encoding?.('composition')?.stat ||
        (map.statMeta_?.height ? 'height' : undefined) ||
        (map.statMeta_?.composition ? 'composition' : undefined) ||
        Object.keys(map.statMeta_ || {})[0]

    return map.statCodes_.some((code) => {
        const statKey = map.statMeta_?.[statName]?.statKeys?.[code] || code
        const s = map.statData(statKey)?.get(id)
        return s && !isNaN(s.value) && s.value !== 0
    })
}
