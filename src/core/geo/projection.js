import { getApproxCurrentGeoBbox, getBBOXAsGeoJSON, getParameterByName } from '../utils'
import { geoIdentity, geoPath } from 'd3-geo'

//types
/** @typedef {import('../../types/core/MapInstance').MapInstance} MapInstance */

/**
 * @param {MapInstance} map
 */
export const defineProjection = function (map) {
    // Define projection based on the geographical context

    if (map.geo_ === 'WORLD') {
        // Use Robinson projection for the world with optional custom projection function
        map._projection =
            map.projectionFunction_ ||
            geoRobinson()
                .translate([map.width_ / 2, map.height_ / 2])
                .scale((map.width_ - 20) / (2 * Math.PI))
    } else {
        // For non-WORLD geo, use custom or default identity projection with calculated bounding box
        map._projection =
            map.projectionFunction_ ||
            geoIdentity()
                .reflectY(true)
                .fitSize([map.width_, map.height_], getBBOXAsGeoJSON(getApproxCurrentGeoBbox(map)))
    }
}

export const definePathFunction = function (map) {
    map._pathFunction = geoPath().projection(map._projection)
}

export const defineDefaultPosition = function (map) {
    if (map.projectionFunction_) {
        // Handle custom D3 projection (like geoAzimuthalEquidistant)
        if (typeof map.projectionFunction_.rotate === 'function') {
            const r = map.projectionFunction_.rotate() // [lambda, phi, gamma]
            if (Array.isArray(r) && r.length >= 2) {
                // Invert signs: the map's visual center is the opposite of its rotation
                const lon = -r[0]
                const lat = -r[1]
                map.position_.x = map.position_.x ?? lon
                map.position_.y = map.position_.y ?? lat
            }
        } else if (typeof map.projectionFunction_.center === 'function') {
            const c = map.projectionFunction_.center() // [lon, lat]
            if (Array.isArray(c) && c.length === 2) {
                map.position_.x = map.position_.x ?? c[0]
                map.position_.y = map.position_.y ?? c[1]
            }
        }
    } else {
        const defaultPosition = _defaultPosition[map.geo_ + '_' + map.proj_]
        if (defaultPosition) {
            map.position_.x = map.position_.x || defaultPosition.geoCenter[0]
            map.position_.y = map.position_.y || defaultPosition.geoCenter[1]
        } else if (map.Geometries.defaultGeoData?.bbox) {
            // default to center of geoData bbox
            map.position_.x = map.position_.x || 0.5 * (map.Geometries.defaultGeoData.bbox[0] + map.Geometries.defaultGeoData.bbox[2])
            map.position_.y = map.position_.y || 0.5 * (map.Geometries.defaultGeoData.bbox[1] + map.Geometries.defaultGeoData.bbox[3])
        } else {
            //TODO: auto-define user=defined geometries geoCenter
            // map  .position_.x = Geometries.userGeometries
            // map.position_.y = Geometries.userGeometries
        }
    }

    // optional: set from URL
    setViewFromURL()
}

export const getDefaultZ = function (map) {
    const defaultPosition = _defaultPosition[map.geo_ + '_' + map.proj_]
    if (defaultPosition) {
        return (defaultPosition.pixelSize * 800) / map.width_
    } else if (map.Geometries.defaultGeoData?.bbox) {
        return Math.min(
            (map.Geometries.defaultGeoData.bbox[2] - map.Geometries.defaultGeoData.bbox[0]) / map.width_,
            (map.Geometries.defaultGeoData.bbox[3] - map.Geometries.defaultGeoData.bbox[1]) / map.height_
        )
    } else {
        return 100
    }
}

/** Get x,y,z elements from URL and assign them to the view. */
const setViewFromURL = function () {
    const x = getParameterByName('x'),
        y = getParameterByName('y'),
        z = getParameterByName('z')
    if (x != null && x != undefined && !isNaN(+x)) out.position_.x = +x
    if (y != null && y != undefined && !isNaN(+y)) out.position_.y = +y
    if (z != null && z != undefined && !isNaN(+z)) out.position_.z = +z
}

/** Default geocenter positions and pixelSize (for default width = 800px) for territories and projections. */
const _defaultPosition = {
    EUR_3035: { geoCenter: [4790000, 3420000], pixelSize: 6400 },
    IC_32628: { geoCenter: [443468, 3145647], pixelSize: 1000 },
    GP_32620: { geoCenter: [669498, 1784552], pixelSize: 130 },
    MQ_32620: { geoCenter: [716521, 1621322], pixelSize: 130 },
    GF_32622: { geoCenter: [266852, 444074], pixelSize: 500 },
    RE_32740: { geoCenter: [348011, 7661627], pixelSize: 130 },
    YT_32738: { geoCenter: [516549, 8583920], pixelSize: 70 },
    MT_3035: { geoCenter: [4719755, 1441701], pixelSize: 70 },
    PT20_32626: { geoCenter: [397418, 4271471], pixelSize: 1500 },
    PT30_32628: { geoCenter: [333586, 3622706], pixelSize: 150 },
    LI_3035: { geoCenter: [4287060, 2672000], pixelSize: 40 },
    IS_3035: { geoCenter: [3011804, 4960000], pixelSize: 700 },
    SJ_SV_3035: { geoCenter: [4570000, 6160156], pixelSize: 800 },
    SJ_JM_3035: { geoCenter: [3647762, 5408300], pixelSize: 100 },
    CARIB_32620: { geoCenter: [636345, 1669439], pixelSize: 500 },
    WORLD_54030: { geoCenter: [14, 17], pixelSize: 9000 },
}
