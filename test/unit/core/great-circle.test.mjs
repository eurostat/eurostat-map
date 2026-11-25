import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { geoEquirectangular, geoIdentity } from 'd3-geo'

import { initProj4, projectToMap } from '../../../src/core/geo/proj4.js'
import { arcScreenPoints, greatCircle, greatCirclePath, nodeLonLat, trimmedRange } from '../../../src/layers/flow/great-circle.js'

initProj4()

/** A flow layer stub: nodes carry raw coordinates in the map's own coordinate system. */
function layer(map, nodes) {
    const out = { map, _flowNodeCoordinates: new WeakMap() }
    for (const node of nodes) {
        out._flowNodeCoordinates.set(node, { raw: [node.rawX, node.rawY] })
        const [x, y] = map._projection([node.rawX, node.rawY])
        node.x = x
        node.y = y
    }
    return out
}

const world = () => ({
    geo_: 'WORLD',
    _projection: geoEquirectangular()
        .translate([180, 90])
        .scale(180 / Math.PI),
})
const laea = () => ({ geo_: 'EUR', proj_: '3035', _projection: geoIdentity().reflectY(true).scale(1e-4) })

describe('great-circle nodeLonLat', () => {
    it('reads world map coordinates as lon/lat', () => {
        const node = { rawX: 10, rawY: 50 }
        const out = layer(world(), [node])
        assert.deepEqual(nodeLonLat(out, node), [10, 50])
    })

    it('converts EPSG:3035 coordinates back to lon/lat', () => {
        const map = laea()
        const [x, y] = projectToMap(map, 2.35, 48.85) // Paris
        const node = { rawX: x, rawY: y }
        const [lon, lat] = nodeLonLat(layer(map, [node]), node)
        assert.ok(Math.abs(lon - 2.35) < 1e-6 && Math.abs(lat - 48.85) < 1e-6, `${lon}, ${lat}`)
    })

    it('returns null for a node without usable coordinates', () => {
        const out = layer(world(), [])
        assert.equal(nodeLonLat(out, { rawX: 1, rawY: 1 }), null)
        const bad = { rawX: NaN, rawY: 1 }
        assert.equal(nodeLonLat(layer(world(), [bad]), bad), null)
    })
})

describe('greatCircle', () => {
    it('is null when both ends coincide, so the caller draws a straight line', () => {
        const a = { rawX: 5, rawY: 5 }
        const b = { rawX: 5, rawY: 5 }
        assert.equal(greatCircle(layer(world(), [a, b]), a, b), null)
    })

    it('bows towards the pole between two cities at the same latitude', () => {
        const a = { rawX: -74, rawY: 40.7 } // New York
        const b = { rawX: 2.35, rawY: 48.85 } // Paris
        const out = layer(world(), [a, b])
        const arc = greatCircle(out, a, b)
        const [, midLat] = arc.at(0.5)
        assert.ok(midLat > 48.85, `mid-route latitude ${midLat} should be north of both ends`)
        assert.deepEqual(arc.screenAt(0).map(Math.round), [Math.round(a.x), Math.round(a.y)])
    })
})

describe('greatCirclePath', () => {
    it('cuts a route at the antimeridian instead of drawing it across the map', () => {
        const a = { rawX: 170, rawY: 40 }
        const b = { rawX: -170, rawY: 40 }
        const out = layer(world(), [a, b])
        const d = greatCirclePath(out, greatCircle(out, a, b))
        assert.equal(d.match(/M/g).length, 2, d)
    })

    it('draws one path for a route that stays on one side', () => {
        const a = { rawX: 0, rawY: 40 }
        const b = { rawX: 30, rawY: 45 }
        const out = layer(world(), [a, b])
        assert.equal(greatCirclePath(out, greatCircle(out, a, b)).match(/M/g).length, 1)
    })

    it('projects a CRS map point by point', () => {
        const map = laea()
        const [ax, ay] = projectToMap(map, -9, 38)
        const [bx, by] = projectToMap(map, 24, 60)
        const a = { rawX: ax, rawY: ay }
        const b = { rawX: bx, rawY: by }
        const out = layer(map, [a, b])
        const d = greatCirclePath(out, greatCircle(out, a, b))
        const start = d.match(/-?[\d.]+/g).map(Number)
        assert.ok(Math.hypot(start[0] - a.x, start[1] - a.y) < 0.01)
        assert.ok(!d.includes('NaN'))
    })
})

describe('trimmedRange', () => {
    const a = { rawX: 0, rawY: 0 }
    const b = { rawX: 60, rawY: 0 }
    const out = layer(world(), [a, b])
    const arc = greatCircle(out, a, b)

    it('keeps the whole arc when nothing is trimmed', () => {
        assert.deepEqual(trimmedRange(out, arc, 0, 0), [0, 1])
        assert.deepEqual(trimmedRange(out, arc, 0, 0, 0.5), [0.5, 1])
    })

    it('cuts the requested number of pixels from the end', () => {
        const [t0, t1] = trimmedRange(out, arc, 0, 20)
        assert.equal(t0, 0)
        const [x, y] = arc.screenAt(t1)
        assert.ok(Math.abs(Math.hypot(b.x - x, b.y - y) - 20) < 1, 'about 20px left at the end')
    })

    it('returns null when the cuts exceed the route', () => {
        assert.equal(trimmedRange(out, arc, 200, 200), null)
    })
})

describe('arcScreenPoints', () => {
    it('follows the arc, and starts straight for a route crossing the antimeridian', () => {
        const a = { rawX: 170, rawY: 40 }
        const b = { rawX: -170, rawY: 40 }
        const out = layer(world(), [a, b])
        const points = arcScreenPoints(out, a, b, 3)
        assert.equal(points.length, 3)
        // straight fallback: the points sit on the chord between the nodes
        points.forEach((p, i) => {
            const t = (i + 1) / 4
            assert.ok(Math.abs(p.x - (a.x + (b.x - a.x) * t)) < 1e-9)
        })
    })

    it('bows away from the chord for an ordinary route', () => {
        const a = { rawX: -74, rawY: 40.7 }
        const b = { rawX: 2.35, rawY: 48.85 }
        const out = layer(world(), [a, b])
        const [, middle] = arcScreenPoints(out, a, b, 3)
        const chordY = (a.y + b.y) / 2
        assert.ok(Math.abs(middle.y - chordY) > 1, 'the arc leaves the chord')
    })
})
