// Synthetic offline fixtures for browser tests: a tiny Nuts2json topology (same properties as the real files),
// matching centroids and mock Eurostat JSON-stat, plus a router that serves them to a Playwright page.
// Used by the e2e tests that render real maps without network access.
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------- synthetic Nuts2json topology
// Ids per NUTS level. Real files: level N contains nutsrg of level N and nutsbn of levels 0..N.
export const RG = [
    ['FR', 'DE', 'RS'],
    ['FR1', 'DE1', 'RS1'],
    ['FR10', 'DE11', 'RS11'],
    ['FR101', 'DE111', 'RS110'],
]
const CX = 4300000
const CY = 2700000

export function topology(level) {
    const arcs = []
    const line = (i) => {
        const x = CX - 600000 + (i % 12) * 100000
        const y = CY - 400000 + Math.floor(i / 12) * 100000
        arcs.push([
            [x, y],
            [x + 60000, y + 60000],
        ])
        return [arcs.length - 1]
    }
    const square = (i) => {
        const x = CX - 600000 + (i % 12) * 100000
        const y = CY + 300000 + Math.floor(i / 12) * 100000
        arcs.push([
            [x, y],
            [x + 80000, y],
            [x + 80000, y + 80000],
            [x, y + 80000],
            [x, y],
        ])
        return [[arcs.length - 1]]
    }
    let n = 0
    const nutsrg = RG[level].map((id) => ({ type: 'Polygon', arcs: square(n++), properties: { id, na: id } }))
    const cntrg = [{ type: 'Polygon', arcs: square(n++), properties: { id: 'UA', na: 'UA' } }]
    let b = 0
    const nutsbn = []
    for (let lvl = 0; lvl <= level; lvl++) {
        nutsbn.push({ type: 'LineString', arcs: line(b++), properties: { id: 1000 + lvl, lvl, eu: 'T', efta: 'F', cc: 'F', oth: 'F', co: 'F' } })
    }
    // Kosovo border: in Nuts2json it is a level-0 nutsbn feature with id > 100000
    nutsbn.push({ type: 'LineString', arcs: line(b++), properties: { id: 100001, lvl: 0, eu: 'F', efta: 'F', cc: 'T', oth: 'F', co: 'F' } })
    nutsbn.push({ type: 'LineString', arcs: line(b++), properties: { id: 2000, lvl: 0, eu: 'T', efta: 'F', cc: 'F', oth: 'F', co: 'T' } })
    const cntbn = [
        { type: 'LineString', arcs: line(b++), properties: { id: 1, eu: 'T', efta: 'F', cc: 'F', oth: 'F', co: 'F' } },
        { type: 'LineString', arcs: line(b++), properties: { id: 2, eu: 'F', efta: 'F', cc: 'T', oth: 'F', co: 'F' } },
        { type: 'LineString', arcs: line(b++), properties: { id: 3, eu: 'T', efta: 'F', cc: 'F', oth: 'F', co: 'T' } },
        // disputed border (Nuts2json >= 2.1 flags them with ps > 0)
        { type: 'LineString', arcs: line(b++), properties: { id: 4, eu: 'T', efta: 'F', cc: 'F', oth: 'F', co: 'F', ps: 1 } },
    ]
    const gra = [{ type: 'LineString', arcs: line(b++), properties: {} }]
    const gc = (geometries) => ({ type: 'GeometryCollection', geometries })
    return {
        type: 'Topology',
        bbox: [CX - 2000000, CY - 1500000, CX + 2000000, CY + 1500000],
        objects: { nutsrg: gc(nutsrg), cntrg: gc(cntrg), nutsbn: gc(nutsbn), cntbn: gc(cntbn), gra: gc(gra) },
        arcs,
    }
}

export function centroids(level) {
    return {
        type: 'FeatureCollection',
        features: RG[level].map((id, i) => ({
            type: 'Feature',
            properties: { id, na: id },
            geometry: { type: 'Point', coordinates: [CX - 500000 + i * 150000, CY + 300000] },
        })),
    }
}

// --------------------------------------------------------------------------- mock JSON-stat
export function jsonstat(urlStr) {
    const url = new URL(urlStr)
    const dims = {}
    for (const [k, v] of url.searchParams.entries()) {
        if (['format', 'lang', 'geoLevel', 'geolevel'].includes(k)) continue
        ;(dims[k.toLowerCase()] = dims[k.toLowerCase()] || []).push(v)
    }
    if (!dims.time) dims.time = ['2020', '2021']
    dims.geo = [...RG.flat(), 'UA']
    const id = Object.keys(dims)
    const size = id.map((d) => [...new Set(dims[d])].length)
    const dimension = {}
    id.forEach((d) => {
        const cats = [...new Set(dims[d])]
        dimension[d] = {
            label: d,
            category: { index: Object.fromEntries(cats.map((c, i) => [c, i])), label: Object.fromEntries(cats.map((c) => [c, c])) },
        }
    })
    const total = size.reduce((a, b) => a * b, 1)
    return {
        version: '2.0',
        class: 'dataset',
        label: 'mock',
        id,
        size,
        dimension,
        value: Array.from({ length: total }, (_, i) => 10 + ((i * 37) % 90)),
    }
}


export const ORIGIN = 'http://em-test.local'

/**
 * Route every request of a page to the fixtures: the bundle from `bundleDir`, WORLD topojson, Nuts2json,
 * centroids and Eurostat statistics. The page is served at ORIGIN + '/' with the given body.
 */
export async function routeFixtures(page, { root, bundleDir = path.join(root, 'build'), bodyHtml = '<svg id="map"></svg>' }) {
    const world = fs.readFileSync(path.join(root, 'src', 'assets', 'topojson', 'WORLD_4326.json'))
    await page.route('**/*', async (route) => {
        const u = route.request().url()
        const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
        if (u === ORIGIN + '/') return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"></head><body>${bodyHtml}</body></html>` })
        if (u.startsWith(ORIGIN + '/build/')) {
            const f = path.join(bundleDir, path.basename(new URL(u).pathname))
            if (fs.existsSync(f)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) })
            return route.fulfill({ status: 404, body: '' })
        }
        if (/world_4326/i.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: world })
        let m = /\/nutspt_(\d)\.json/.exec(u)
        if (m) return json(centroids(+m[1]))
        m = /nuts2json.*\/(\d)\.json/i.exec(u)
        if (m) return json(topology(+m[1]))
        if (/dissemination\/statistics/i.test(u)) return json(jsonstat(u))
        return route.fulfill({ status: 404, body: '' })
    })
}
