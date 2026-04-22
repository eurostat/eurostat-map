const defineProjection = function () {
    // Define projection based on the geographical context

    if (out.geo_ === 'WORLD') {
        // Use Robinson projection for the world with optional custom projection function
        out._projection =
            out.projectionFunction_ ||
            geoRobinson()
                .translate([out.width_ / 2, out.height_ / 2])
                .scale((out.width_ - 20) / (2 * Math.PI))
    } else {
        // For non-WORLD geo, use custom or default identity projection with calculated bounding box
        out._projection =
            out.projectionFunction_ ||
            geoIdentity()
                .reflectY(true)
                .fitSize([out.width_, out.height_], getBBOXAsGeoJSON(getApproxCurrentGeoBbox(out)))
    }
}

const definePathFunction = function () {
    out._pathFunction = geoPath().projection(out._projection)
}

const defineDefaultPosition = function () {
    if (out.projectionFunction_) {
        // Handle custom D3 projection (like geoAzimuthalEquidistant)
        if (typeof out.projectionFunction_.rotate === 'function') {
            const r = out.projectionFunction_.rotate() // [lambda, phi, gamma]
            if (Array.isArray(r) && r.length >= 2) {
                // Invert signs: the map's visual center is the opposite of its rotation
                const lon = -r[0]
                const lat = -r[1]
                out.position_.x = out.position_.x ?? lon
                out.position_.y = out.position_.y ?? lat
            }
        } else if (typeof out.projectionFunction_.center === 'function') {
            const c = out.projectionFunction_.center() // [lon, lat]
            if (Array.isArray(c) && c.length === 2) {
                out.position_.x = out.position_.x ?? c[0]
                out.position_.y = out.position_.y ?? c[1]
            }
        }
    } else {
        const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
        if (defaultPosition) {
            out.position_.x = out.position_.x || defaultPosition.geoCenter[0]
            out.position_.y = out.position_.y || defaultPosition.geoCenter[1]
        } else if (out.Geometries.defaultGeoData?.bbox) {
            // default to center of geoData bbox
            out.position_.x = out.position_.x || 0.5 * (out.Geometries.defaultGeoData.bbox[0] + out.Geometries.defaultGeoData.bbox[2])
            out.position_.y = out.position_.y || 0.5 * (out.Geometries.defaultGeoData.bbox[1] + out.Geometries.defaultGeoData.bbox[3])
        } else {
            //TODO: auto-define user=defined geometries geoCenter
            // out.position_.x = Geometries.userGeometries
            // out.position_.y = Geometries.userGeometries
        }
    }

    // optional: set from URL
    setViewFromURL()
}

const getDefaultZ = function () {
    const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
    if (defaultPosition) {
        return (defaultPosition.pixelSize * 800) / out.width_
    } else if (out.Geometries.defaultGeoData?.bbox) {
        return Math.min(
            (out.Geometries.defaultGeoData.bbox[2] - out.Geometries.defaultGeoData.bbox[0]) / out.width_,
            (out.Geometries.defaultGeoData.bbox[3] - out.Geometries.defaultGeoData.bbox[1]) / out.height_
        )
    } else {
        return 100
    }
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
