import { geoDistance, geoInterpolate, geoPath, geoTransform } from 'd3-geo'
import { projectFromMap, projectToMap } from '../../core/geo/proj4.js'

/**
 * Great-circle routes for flow maps.
 *
 * A great circle is the shortest path on the globe. Flow nodes carry raw coordinates in the map's own
 * coordinate system (lon/lat on world maps and with a custom projection function, the map CRS - EPSG:3035,
 * for example - otherwise), so each route is converted to lon/lat, densified along the geodesic and then sent
 * through the map's projection. d3's geoPath does the clipping and antimeridian cutting for projections
 * that have a sphere; for CRS maps the points are projected one by one.
 */

/** Angular spacing (degrees) between the points a route is densified to before projecting. */
const STEP_DEGREES = 1.5
const MAX_STEPS = 512

/** true if the raw node coordinates of this map are lon/lat (world maps and custom projection functions). */
const rawIsLonLat = (map) => map.geo_ === 'WORLD' || !!map.projectionFunction_

/** Raw (pre-projection) coordinates of a flow node. */
function rawCoordinates(out, node) {
    return out._flowNodeCoordinates?.get(node)?.raw || null
}

/** Lon/lat of a flow node, or null if it has no usable coordinates. */
export function nodeLonLat(out, node) {
    const raw = rawCoordinates(out, node)
    if (!raw || !Number.isFinite(raw[0]) || !Number.isFinite(raw[1])) return null
    const lonLat = rawIsLonLat(out.map) ? raw : projectFromMap(out.map, raw[0], raw[1])
    return lonLat && Number.isFinite(lonLat[0]) && Number.isFinite(lonLat[1]) ? lonLat : null
}

/** Screen position of a lon/lat position. */
function toScreen(out, lon, lat) {
    const map = out.map
    return map._projection(rawIsLonLat(map) ? [lon, lat] : projectToMap(map, lon, lat))
}

/**
 * A great-circle arc between two flow nodes.
 * @returns {{a: number[], b: number[], at: (t:number)=>number[], screenAt: (t:number)=>number[], length: number}|null}
 *   `null` when either node has no coordinates or both ends coincide (the caller then draws a straight line).
 */
export function greatCircle(out, nodeA, nodeB) {
    const a = nodeLonLat(out, nodeA)
    const b = nodeLonLat(out, nodeB)
    if (!a || !b) return null
    const angle = geoDistance(a, b)
    if (!(angle > 1e-9)) return null
    const at = geoInterpolate(a, b)
    return { a, b, angle, at, screenAt: (t) => toScreen(out, ...at(t)) }
}

/** Number of segments a route of this angular length is densified to. */
const stepsFor = (angle) => Math.min(MAX_STEPS, Math.max(8, Math.ceil((angle * 180) / Math.PI / STEP_DEGREES)))

/**
 * Parameter range [t0, t1] of the arc left once `startPx` / `endPx` screen pixels are cut from its two ends
 * (to clear node circles and arrow heads). Measured along the projected route.
 */
export function trimmedRange(out, arc, startPx = 0, endPx = 0, from = 0) {
    if (!(startPx > 0 || endPx > 0)) return [from, 1]
    const steps = 96
    const points = []
    for (let i = 0; i <= steps; i++) points.push(arc.screenAt(from + ((1 - from) * i) / steps))
    const cumulative = [0]
    for (let i = 1; i < points.length; i++) {
        cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
    }
    const total = cumulative[steps]
    if (!(total > startPx + endPx)) return null
    const tAt = (distance) => {
        let i = 1
        while (i < steps && cumulative[i] < distance) i++
        const span = cumulative[i] - cumulative[i - 1] || 1
        const f = (distance - cumulative[i - 1]) / span
        return from + ((1 - from) * (i - 1 + f)) / steps
    }
    return [startPx > 0 ? tAt(startPx) : from, endPx > 0 ? tAt(total - endPx) : 1]
}

/**
 * SVG path data of the arc between parameters t0 and t1, in screen space.
 * @returns {string|null}
 */
export function greatCirclePath(out, arc, t0 = 0, t1 = 1) {
    const steps = Math.max(2, Math.round(stepsFor(arc.angle) * (t1 - t0)))
    const coordinates = []
    for (let i = 0; i <= steps; i++) coordinates.push(arc.at(t0 + ((t1 - t0) * i) / steps))
    const line = { type: 'LineString', coordinates }

    const map = out.map
    const projection = rawIsLonLat(map)
        ? map._projection
        : // CRS maps: project each (already dense) point; there is no antimeridian to cut in a regional CRS
          geoTransform({
              point(lon, lat) {
                  const [x, y] = toScreen(out, lon, lat)
                  this.stream.point(x, y)
              },
          })
    return geoPath(projection)(line)
}

/** true if the route jumps across the +-180 degree meridian (consecutive longitudes more than 180 degrees apart). */
function crossesAntimeridian(arc, count) {
    let previous = arc.a[0]
    for (let j = 1; j <= count + 1; j++) {
        const lon = arc.at(j / (count + 1))[0]
        if (Math.abs(lon - previous) > 180) return true
        previous = lon
    }
    return false
}

/**
 * Screen-space points along a route, used as the starting shape of edge bundling.
 * Falls back to a straight sampling when the route has no arc, or when it crosses the antimeridian: a bundled route is
 * one polyline, which cannot be cut at the map edge the way a plain arc is.
 */
export function arcScreenPoints(out, source, target, count) {
    let arc = greatCircle(out, source, target)
    if (arc && crossesAntimeridian(arc, count)) arc = null
    const points = []
    for (let j = 1; j <= count; j++) {
        const t = j / (count + 1)
        if (arc) {
            const [x, y] = arc.screenAt(t)
            if (Number.isFinite(x) && Number.isFinite(y)) {
                points.push({ x, y })
                continue
            }
        }
        points.push({ x: source.x + (target.x - source.x) * t, y: source.y + (target.y - source.y) * t })
    }
    return points
}
