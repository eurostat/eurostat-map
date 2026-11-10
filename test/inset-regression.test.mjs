// Differential regression harness for inset maps (and the main map around them).
//
// Renders a broad matrix of map configurations in headless Chromium against the built dev bundle
// (build/eurostatmap.js), fully offline and deterministic: Nuts2json requests are answered with a
// synthetic topology (main map: 12 countries split into NUTS 1/2/3; insets: a few regions placed
// at each inset's default view), Eurostat API requests with hash-based mock JSON-stat (with
// missing values and status flags), and Math.random is seeded. After every step (build, a second
// updateStatData(), a rebuild from the geometry cache, inset changes, legend/mode changes, ...)
// it waits until the page is settled (no pending request, no DOM mutation for a while) and
// serialises the whole document: every element with its attributes (long path data hashed),
// inline styles, the computed paint/visibility styles that matter for a map, text, the tooltip
// shown when hovering a region or symbol of the main map and of every inset, and the
// eurostat-map rules of the #custom-styles sheet that target elements still in the document.
// Random inset svg ids are normalised. The result is compared with test/baselines/inset-regression.json.gz.
//
// Usage: node test/inset-regression.test.mjs [--capture] [--only <substring>] [--jobs <n>] [--verbose]
//                                             [--against <old build dir>] [--build <dir>] [--dump <dir>]
//   --capture   write the baseline from the current build instead of comparing with it
//   --against   compare live with another build directory (containing eurostatmap.js) instead
//               of the stored baseline
//   --build     render with the bundle of another build directory (e.g. to capture a baseline
//               for a new scenario from the code before a change)
//   --dump      write the serialised snapshots (one file per scenario) for manual diffing

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'http://em-inset-test.local'
const BASELINE = path.join(ROOT, 'test', 'baselines', 'inset-regression.json.gz')
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null)
const CAPTURE = process.argv.includes('--capture')
const VERBOSE = process.argv.includes('--verbose')
const ONLY = arg('--only')
const JOBS = +(arg('--jobs') || 4)
const AGAINST = arg('--against')
const DUMP = arg('--dump')
const BUILD_DIR = path.resolve(arg('--build') || path.join(ROOT, 'build'))
const QUIET_MS = 1000

let chromium
try {
    ;({ chromium } = await import('playwright'))
} catch (e) {
    console.error('inset-regression.test: playwright is not installed (npm install)')
    process.exit(1)
}

// --------------------------------------------------------------------------- synthetic geometry
// Main (EUR) map: 12 countries on a 4 x 3 grid around the default EUR view. Each country splits in
// 2 NUTS 1 regions (vertical halves), each NUTS 1 in 2 NUTS 2 (horizontal halves), each NUTS 2 in
// 2 NUTS 3 (vertical halves).
const COUNTRIES = [
    ['FR', 'eu'],
    ['DE', 'eu'],
    ['ES', 'eu'],
    ['IT', 'eu'],
    ['PT', 'eu'],
    ['NO', 'efta'],
    ['MT', 'eu'],
    ['LI', 'efta'],
    ['IS', 'efta'],
    ['RS', 'cc'],
    ['PL', 'eu'],
    ['NL', 'eu'],
]
const EUR_CENTER = [4790000, 3420000]
const CS = 900000 // country square size (m)

function eurRegions() {
    const out = [[], [], [], []] // per level: {id, rect:[x,y,w,h], flag}
    COUNTRIES.forEach(([c, flag], i) => {
        const x = EUR_CENTER[0] - 2 * CS + (i % 4) * CS
        const y = EUR_CENTER[1] - 1.5 * CS + Math.floor(i / 4) * CS
        const s = CS * 0.9
        out[0].push({ id: c, rect: [x, y, s, s], flag })
        for (let a = 1; a <= 2; a++) {
            const r1 = [x + (a - 1) * (s / 2), y, s / 2, s]
            out[1].push({ id: `${c}${a}`, rect: r1, flag })
            for (let b = 1; b <= 2; b++) {
                const r2 = [r1[0], r1[1] + (b - 1) * (s / 2), r1[2], s / 2]
                out[2].push({ id: `${c}${a}${b}`, rect: r2, flag })
                for (let d = 1; d <= 2; d++) {
                    const r3 = [r2[0] + (d - 1) * (r2[2] / 2), r2[1], r2[2] / 2, r2[3]]
                    out[3].push({ id: `${c}${a}${b}${d}`, rect: r3, flag })
                }
            }
        }
    })
    return out
}
const EUR = eurRegions()

// Inset territories: region ids per NUTS level (stat data is generated for these too).
const INSET_IDS = {
    IC: [['ES'], ['ES7'], ['ES70'], ['ES703', 'ES704', 'ES705', 'ES706']],
    GP: [['FR'], ['FRY'], ['FRY1'], ['FRY10']],
    MQ: [['FR'], ['FRY'], ['FRY2'], ['FRY20']],
    GF: [['FR'], ['FRY'], ['FRY3'], ['FRY30']],
    RE: [['FR'], ['FRY'], ['FRY4'], ['FRY40']],
    YT: [['FR'], ['FRY'], ['FRY5'], ['FRY50']],
    CARIB: [['FR'], ['FRY'], ['FRY1', 'FRY2'], ['FRY10', 'FRY20']],
    MT: [['MT'], ['MT0'], ['MT00'], ['MT001', 'MT002']],
    PT20: [['PT'], ['PT2'], ['PT20'], ['PT200']],
    PT30: [['PT'], ['PT3'], ['PT30'], ['PT300']],
    LI: [['LI'], ['LI0'], ['LI00'], ['LI000']],
    IS: [['IS'], ['IS0'], ['IS00'], ['IS001', 'IS002']],
    SJ_SV: [['NO'], ['NO0'], ['NO0B'], ['NO0B1']],
    SJ_JM: [['NO'], ['NO0'], ['NO0B'], ['NO0B2']],
}
// Default views of eurostat-map (src/core/geo/projection.js), to place inset geometry in view.
const DEFAULT_VIEW = {
    IC_32628: [[443468, 3145647], 1000],
    GP_32620: [[669498, 1784552], 130],
    MQ_32620: [[716521, 1621322], 130],
    GF_32622: [[266852, 444074], 500],
    RE_32740: [[348011, 7661627], 130],
    YT_32738: [[516549, 8583920], 70],
    MT_3035: [[4719755, 1441701], 70],
    PT20_32626: [[397418, 4271471], 1500],
    PT30_32628: [[333586, 3622706], 150],
    LI_3035: [[4287060, 2672000], 40],
    IS_3035: [[3011804, 4960000], 700],
    SJ_SV_3035: [[4570000, 6160156], 800],
    SJ_JM_3035: [[3647762, 5408300], 100],
    CARIB_32620: [[636345, 1669439], 500],
}

function insetRegions(geo, proj) {
    const ids = INSET_IDS[geo] || [[geo], [geo + '1'], [geo + '11'], [geo + '111']]
    const [center, px] = DEFAULT_VIEW[`${geo}_${proj}`] || [[1000000, 1000000], 1000]
    const out = [[], [], [], []]
    const size = px * 20
    for (let lvl = 0; lvl < 4; lvl++) {
        const n = ids[lvl].length
        ids[lvl].forEach((id, i) => {
            out[lvl].push({ id, rect: [center[0] - size + (i * 2 * size) / n, center[1] - size / 2, (2 * size) / n - px, size], flag: 'eu' })
        })
    }
    return { regions: out, center, size }
}

function topology(regionsByLevel, level, extent, withKosovo) {
    const arcs = []
    const ring = ([x, y, w, h]) => {
        arcs.push([
            [Math.round(x), Math.round(y)],
            [Math.round(x + w), Math.round(y)],
            [Math.round(x + w), Math.round(y + h)],
            [Math.round(x), Math.round(y + h)],
            [Math.round(x), Math.round(y)],
        ])
        return [[arcs.length - 1]]
    }
    const seg = (x1, y1, x2, y2) => {
        arcs.push([
            [Math.round(x1), Math.round(y1)],
            [Math.round(x2), Math.round(y2)],
        ])
        return [arcs.length - 1]
    }
    const flags = (flag, extra = {}) => ({
        eu: flag === 'eu' ? 'T' : 'F',
        efta: flag === 'efta' ? 'T' : 'F',
        cc: flag === 'cc' ? 'T' : 'F',
        oth: 'F',
        co: 'F',
        ...extra,
    })
    const nutsrg = regionsByLevel[level].map((r) => ({ type: 'Polygon', arcs: ring(r.rect), properties: { id: r.id, na: 'Name ' + r.id } }))
    const [ex, ey, ew, eh] = extent
    const cntrg = [
        { type: 'Polygon', arcs: ring([ex - ew * 0.15, ey, ew * 0.1, eh * 0.4]), properties: { id: 'UA', na: 'Ukraine' } },
        { type: 'Polygon', arcs: ring([ex + ew * 1.05, ey + eh * 0.5, ew * 0.1, eh * 0.4]), properties: { id: 'BY', na: 'Belarus' } },
    ]
    const nutsbn = []
    let bid = 1
    for (let lvl = 0; lvl <= level; lvl++) {
        for (const r of regionsByLevel[lvl]) {
            const [x, y, , h] = r.rect
            // left edge of each region, plus a coastal top edge for level-0 regions
            nutsbn.push({ type: 'LineString', arcs: seg(x, y, x, y + h), properties: { id: bid++, lvl, ...flags(r.flag) } })
            if (lvl === 0)
                nutsbn.push({ type: 'LineString', arcs: seg(x, y, x + r.rect[2], y), properties: { id: bid++, lvl, ...flags(r.flag, { co: 'T' }) } })
        }
    }
    if (withKosovo) {
        const rs = regionsByLevel[0].find((r) => r.id === 'RS')
        if (rs) {
            const [x, y, w, h] = rs.rect
            nutsbn.push({
                type: 'LineString',
                arcs: seg(x + w * 0.6, y + h * 0.5, x + w * 0.9, y + h * 0.8),
                properties: { id: 100001, lvl: 0, ...flags('cc') },
            })
        }
    }
    const cntbn = []
    regionsByLevel[0].forEach((r, i) => {
        const [x, y, w, h] = r.rect
        cntbn.push({ type: 'LineString', arcs: seg(x + w, y, x + w, y + h), properties: { id: i + 1, ...flags(r.flag) } })
    })
    cntbn.push({ type: 'LineString', arcs: seg(ex, ey + eh, ex + ew, ey + eh), properties: { id: 900, ...flags('eu', { co: 'T' }) } })
    cntbn.push({ type: 'LineString', arcs: seg(ex - ew * 0.15, ey, ex - ew * 0.05, ey), properties: { id: 901, ...flags('oth', { ps: 1 }) } })
    const gra = [
        { type: 'LineString', arcs: seg(ex, ey + eh / 2, ex + ew, ey + eh / 2), properties: {} },
        { type: 'LineString', arcs: seg(ex + ew / 2, ey, ex + ew / 2, ey + eh), properties: {} },
    ]
    const gc = (geometries) => ({ type: 'GeometryCollection', geometries })
    return {
        type: 'Topology',
        bbox: [ex - ew * 0.2, ey - eh * 0.1, ex + ew * 1.2, ey + eh * 1.1],
        objects: { nutsrg: gc(nutsrg), cntrg: gc(cntrg), nutsbn: gc(nutsbn), cntbn: gc(cntbn), gra: gc(gra) },
        arcs,
    }
}

function centroids(regionsByLevel, level) {
    return {
        type: 'FeatureCollection',
        features: regionsByLevel[level].map((r) => ({
            type: 'Feature',
            properties: { id: r.id, na: 'Name ' + r.id },
            geometry: { type: 'Point', coordinates: [Math.round(r.rect[0] + r.rect[2] / 2), Math.round(r.rect[1] + r.rect[3] / 2)] },
        })),
    }
}

// /nuts2json/v2/<year>/[<geo>/]<proj>/[<scale>/]<level>.json and .../<proj>/nutspt_<level>.json
function geoRequest(url) {
    const m = /\/nuts2json\/v2\/(.*)$/.exec(new URL(url).pathname)
    if (!m) return null
    const segs = m[1].split('/')
    let geo = 'EUR'
    let rest = segs.slice(1)
    if (isNaN(+segs[1])) {
        geo = segs[1]
        rest = segs.slice(2)
    }
    const proj = rest[0]
    const file = rest[rest.length - 1]
    const pt = /^nutspt_(\d)\.json$/.exec(file)
    const lv = /^(\d)\.json$/.exec(file)
    if (!pt && !lv) return null
    return { geo, proj, level: +(pt || lv)[1], centroids: !!pt }
}

function geoResponse(req) {
    if (req.geo === 'EUR') {
        const extent = [EUR_CENTER[0] - 2 * CS, EUR_CENTER[1] - 1.5 * CS, 4 * CS, 3 * CS]
        return req.centroids ? centroids(EUR, req.level) : topology(EUR, req.level, extent, true)
    }
    const { regions, center, size } = insetRegions(req.geo, req.proj)
    const extent = [center[0] - size, center[1] - size / 2, 2 * size, size]
    return req.centroids ? centroids(regions, req.level) : topology(regions, req.level, extent, false)
}

// --------------------------------------------------------------------------- mock JSON-stat
const ALL_IDS = [0, 1, 2, 3].map((l) => [...new Set([...EUR[l].map((r) => r.id), ...Object.values(INSET_IDS).flatMap((ids) => ids[l])])])

function hash(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function jsonstat(urlStr) {
    const url = new URL(urlStr)
    const code = url.pathname.split('/').pop()
    const dims = {}
    let geoLevel = null
    for (const [k, v] of url.searchParams.entries()) {
        if (['format', 'lang'].includes(k)) continue
        if (k.toLowerCase() === 'geolevel') {
            geoLevel = v
            continue
        }
        ;(dims[k.toLowerCase()] = dims[k.toLowerCase()] || []).push(v)
    }
    if (!dims.time) dims.time = ['2021']
    const lvl = { country: 0, nuts1: 1, nuts2: 2, nuts3: 3 }[geoLevel]
    const geos = dims.geo || (lvl === undefined ? ALL_IDS.flat() : ALL_IDS[lvl])
    dims.geo = geos
    const id = Object.keys(dims)
    const cats = id.map((d) => [...new Set(dims[d])])
    const size = cats.map((c) => c.length)
    const dimension = {}
    id.forEach((d, i) => {
        dimension[d] = {
            label: d,
            category: { index: Object.fromEntries(cats[i].map((c, j) => [c, j])), label: Object.fromEntries(cats[i].map((c) => [c, 'Label ' + c])) },
        }
    })
    const total = size.reduce((a, b) => a * b, 1)
    const value = {}
    const status = {}
    for (let i = 0; i < total; i++) {
        let rem = i
        const key = []
        for (let d = id.length - 1; d >= 0; d--) {
            key.unshift(cats[d][rem % size[d]])
            rem = Math.floor(rem / size[d])
        }
        const h = hash(code + '|' + id.map((d, j) => d + '=' + key[j]).join('|'))
        if (h % 13 === 0) continue // missing value (':')
        value[i] = 1 + (h % 50000) / 10
        if (h % 7 === 0) status[i] = 'p'
    }
    return { version: '2.0', class: 'dataset', label: 'mock ' + code, updated: '2024-01-01', id, size, dimension, value, status }
}

// --------------------------------------------------------------------------- scenarios
const st = (code = 'demo_r_d3dens', filters = {}, extra = {}) => ({
    eurostatDatasetCode: code,
    unitText: 'u',
    filters: { time: '2021', ...filters },
    ...extra,
})
const J = JSON.stringify
const nuts3 = { geoLevel: 'nuts3' }

// Inset variants
const INSETS = {
    default: `.insets('default')`,
    image: `.insets('image')`,
    eu: `.insets('eu')`,
    custom: `.insets([
        { geo: 'MT', scale: '01M', title: 'Malta', width: 120, height: 90, x: 0, y: 0, showScalebar: true },
        { geo: 'PT20', x: 0, y: 100, width: 120, height: 90, position: { z: 2000 }, title: 'Azores' },
        { geo: 'GF', svgId: 'customInsetGF', x: 130, y: 0, width: 90, height: 90, scale: '03M', title: 'Guyane' },
        { geo: 'GP', x: 130, y: 100, width: 90, height: 90 },
        { geo: 'GP', x: 130, y: 200, width: 40, height: 40, position: { z: 60, x: 640000, y: 1800000 } },
    ]).insetBoxPosition([520, 20])`,
    own: `.insets([
        { geo: 'MT', nutsLevel: 0, x: 0, y: 0, width: 100, height: 80, title: 'MT nl0' },
        { geo: 'IC', nutsYear: 2021, scale: '03M', x: 0, y: 90, width: 100, height: 80, title: 'IC 2021' },
        { geo: 'PT30', proj: '3035', x: 110, y: 0, width: 100, height: 80, title: 'PT30 3035' },
        { geo: 'LI', nutsLevel: 3, numberOfClasses: 3, x: 110, y: 90, width: 100, height: 80, title: 'LI nl3' },
        { geo: 'IS', nutsLevel: 2, x: 0, y: 180, width: 100, height: 80, position: { x: 3011804, y: 4960000, z: 900 } },
    ])`,
    nested: `.insets([
        { geo: 'IC', x: 0, y: 0, width: 150, height: 120, title: 'IC', insetBoxPosition: [100, 60], insetBoxPadding: 2,
          insets: [{ geo: 'MT', x: 0, y: 0, width: 40, height: 40, title: 'MT in IC' }] },
        { geo: 'RE', x: 0, y: 130, width: 80, height: 80 },
    ])`,
    external: `.insets([{ geo: 'MT', svgId: 'ext1', width: 150, height: 100 }, { geo: 'GP', svgId: 'ext2', width: 150, height: 100 }])`,
}

const SCENARIOS = []
// steps: list of [label, js] run after the initial build; default: updateStatData then rebuild
const STAT_UPDATE = `for (const k of Object.keys(m.stat_)) { const c = m.stat_[k]; if (c && c.filters && !c.categoryCodes) m.stat(k, Object.assign({}, c, { filters: Object.assign({}, c.filters, { time: '2020' }) })) } m.updateStatData()`
const DEFAULT_STEPS = [
    ['updateStatData', STAT_UPDATE],
    ['rebuild (geometry cached)', `m.build()`],
]
const add = (name, type, setup, opts = {}) => SCENARIOS.push({ name, type, setup, steps: opts.steps || DEFAULT_STEPS, ...opts })

const legendTitle = (cfg) => ['legend title change', `m.legend(Object.assign({}, m.legend() || {}, ${J(cfg)}))`]

// ---- choropleth
add('choropleth nl3 default insets', 'choropleth', `m.nutsLevel(3).stat(${J(st())})${INSETS.default}.legend({ title: 'T', x: 10, y: 10 })`, {
    steps: [...DEFAULT_STEPS, legendTitle({ title: 'T2' })],
})
add(
    'choropleth mixed image insets (nuts3 data)',
    'choropleth',
    `m.nutsLevel('mixed').stat(${J(st('nama_10r_3gdp', nuts3))})${INSETS.image}.legend({ title: 'GDP' })`,
    {
        steps: [...DEFAULT_STEPS, legendTitle({ title: 'GDP 2' }), ['darkMode on', `m.darkMode(true)`], ['rebuild dark', `m.build()`]],
    }
)
add(
    'choropleth mixed image insets (manual data all levels)',
    'choropleth',
    `m.nutsLevel('mixed').statData('default').setData(window.__manual(0))
     m${INSETS.image}`,
    {
        steps: [
            ['setData+updateStatValues', `m.statData('default').setData(window.__manual(1)); m.updateStatValues()`],
            ['rebuild', `m.build()`],
        ],
    }
)
add('choropleth nl2 custom insets', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.custom}`)
add('choropleth nl2 insets with own level/year/proj/scale/position', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.own}`)
add('choropleth nl2 nested insets', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.nested}`)
add('choropleth nl2 external inset svgs', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.external}`)
add('choropleth nl2 eu insets darkMode', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.eu}.darkMode(true)`)
add('choropleth mixed image insets lightBorders', 'choropleth', `m.nutsLevel('mixed').stat(${J(st('x', nuts3))})${INSETS.image}.lightBorders(true)`, {
    steps: [...DEFAULT_STEPS, ['lightBorders off, darkMode on', `m.lightBorders(false).darkMode(true)`]],
})
add(
    'choropleth nl2 pattern fill + filtersDefinitionFunction',
    'choropleth',
    `m.nutsLevel(2).stat(${J(st())})${INSETS.default}
     .patternFill([{ pattern: 'hatching', regionIds: ['FR', 'DE', 'MT', 'PT', 'FRY'] }])
     .filtersDefinitionFunction((svg, n) => { svg.selectAll('.em-fill-pattern').remove(); for (let i = 0; i < n; i++) svg.append('pattern').attr('class', 'em-fill-pattern').attr('id', 'pattern_' + i).attr('width', 5).attr('height', 5).attr('patternUnits', 'userSpaceOnUse').append('circle').attr('cx', 2.5).attr('cy', 2.5).attr('r', 0.5 + i / 2) })
     .classToFillStyle((ecl) => 'url(#pattern_' + ecl + ')')`
)
add('choropleth nl3 continuous', 'choropleth', `m.nutsLevel(3).stat(${J(st())}).colorSchemeType('continuous')${INSETS.default}`)
add(
    'choropleth nl2 histogram legend',
    'choropleth',
    `m.nutsLevel(2).stat(${J(st())})${INSETS.custom}.legend({ histogram: { orientation: 'vertical' }, title: 'H' })`
)
add('choropleth nl2 stat delayed (geometry first)', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.image}`, { delays: { stat: 700 } })
add('choropleth nl2 one inset geometry delayed (stat first)', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.image}`, {
    delays: { geo: { MT: 900, PT20: 400 } },
})
add('choropleth nl2 main geometry delayed', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.default}`, { delays: { geo: { EUR: 700 } } })
add('choropleth nl2 one inset geometry fails', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.default}`, { fail: ['GF'] })
add('choropleth nl2 insets added/removed between builds', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.default}`, {
    steps: [
        ['insets(false) + build', `m.insets(false).build()`],
        ['insets(image) + build', `m.insets('image').build()`],
        ['custom insets + build', `m${INSETS.custom}.build()`],
        ['insets([]) + build', `m.insets([]).build()`],
        ['default insets again + build', `m.insets('default').build()`],
    ],
})
add('choropleth nl2 updateGeoData after scale/nutsLevel change', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.default}`, {
    steps: [
        ['scale 10M + updateGeoData', `m.scale('10M').updateGeoData()`],
        ['nutsLevel 3 + updateGeoData + updateStatData', `m.nutsLevel(3).updateGeoData().updateStatData()`],
        ['updateGeoData twice', `m.updateGeoData(); m.updateGeoData()`],
        ['build twice in a row', `m.build(); m.build()`],
    ],
})
add('choropleth nl2 class/colour changes after build', 'choropleth', `m.nutsLevel(2).stat(${J(st())})${INSETS.image}`, {
    steps: [
        ['numberOfClasses 4', `m.numberOfClasses(4).updateClassification().updateStyle()`],
        ['colors', `m.colors(['#fee','#fcc','#f99','#f55','#c00']).updateStyle()`],
        ['legend change (noData)', `m.legend({ title: 'X', noData: false })`],
        ['rebuild', `m.build()`],
    ],
})
add(
    'choropleth multi-layer (choropleth + ps)',
    null,
    `m.nutsLevel(2)
    .stat('density', ${J(st())}).stat('gdp', ${J(st('nama_10r_3gdp'))})
    .layers([
        { type: 'choropleth', encoding: { fill: { stat: 'density' } }, legend: { title: 'Density' } },
        { type: 'proportionalSymbol', encoding: { size: { stat: 'gdp' } }, psSettings: { maxSize: 20, fill: '#ff7800' }, legend: { title: 'GDP', x: 10, y: 300 } },
    ])${INSETS.default}`
)

// ---- categorical, bivariate, trivariate, value by alpha
add('categorical nl2 default insets', 'categorical', `m.nutsLevel(2).stat(${J(st('cat'))})${INSETS.default}`)
add('categorical mixed image insets', 'categorical', `m.nutsLevel('mixed').stat(${J(st('cat', nuts3))})${INSETS.image}`)
add('bivariate nl2 default insets', 'bivariateChoropleth', `m.nutsLevel(2).stat('v1', ${J(st())}).stat('v2', ${J(st('x'))})${INSETS.default}`, {
    steps: [...DEFAULT_STEPS, legendTitle({ label1: 'A', label2: 'B' })],
})
add(
    'bivariate mixed image insets',
    'bivariateChoropleth',
    `m.nutsLevel('mixed').stat('v1', ${J(st('a', nuts3))}).stat('v2', ${J(st('b', nuts3))})${INSETS.image}`
)
add(
    'trivariate nl2 custom insets',
    'trivariateChoropleth',
    `m.nutsLevel(2).stat('v1', ${J(st())}).stat('v2', ${J(st('x'))}).stat('v3', ${J(st('y'))})${INSETS.custom}`
)
add(
    'valueByAlpha nl3 default insets',
    'valueByAlpha',
    `m.nutsLevel(3).stat('value', ${J(st())}).stat('opacityValue', ${J(st('y'))})${INSETS.default}`
)

// ---- proportional symbols
add('ps nl3 default insets', 'proportionalSymbol', `m.nutsLevel(3).stat('size', ${J(st())})${INSETS.default}.legend({ title: 'S' })`, {
    steps: [...DEFAULT_STEPS, legendTitle({ title: 'S2' })],
})
add(
    'ps mixed image insets (IMAGE GDP case)',
    'proportionalSymbol',
    `m.nutsLevel('mixed').stat('size', ${J(st('nama_10r_3gdp', nuts3))})${INSETS.image}.legend({ title: 'GDP' })`,
    {
        steps: [
            ...DEFAULT_STEPS,
            legendTitle({ title: 'GDP 2' }),
            ['darkMode on', `m.darkMode(true)`],
            ['rebuild dark', `m.build()`],
            ['lightBorders on', `m.lightBorders(true)`],
            ['psMaxSize + restyle', `m.psSettings({ maxSize: 12 }); m.updateClassification().updateStyle()`],
            ['rebuild', `m.build()`],
        ],
    }
)
add('ps mixed image insets darkMode', 'proportionalSymbol', `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}.darkMode(true)`)
add(
    'ps mixed image insets lightBorders',
    'proportionalSymbol',
    `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}.lightBorders(true)`
)
add(
    'ps mixed image insets (manual data all levels)',
    'proportionalSymbol',
    `m.nutsLevel('mixed').statData('size').setData(window.__manual(0))
     m${INSETS.image}`,
    {
        steps: [
            ['setData+updateStatValues', `m.statData('size').setData(window.__manual(1)); m.updateStatValues()`],
            ['rebuild', `m.build()`],
        ],
    }
)
add(
    'ps nl2 size+colour custom insets',
    'proportionalSymbol',
    `m.nutsLevel(2).stat('size', ${J(st())}).stat('color', ${J(st('c'))})
     .psSettings({ thresholds: [1000, 2000, 3000, 4000], colors: ['#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'], shape: 'circle', maxSize: 15 })
     .legend({ sizeLegend: { title: 'size', values: [4000, 100] }, colorLegend: { title: 'colour' } })${INSETS.custom}`,
    { steps: [...DEFAULT_STEPS, legendTitle({ sizeLegend: { title: 'size 2', values: [4000, 100] }, colorLegend: { title: 'colour 2' } })] }
)
add('ps nl2 bars own-config insets', 'proportionalSymbol', `m.nutsLevel(2).stat('size', ${J(st())}).psSettings({ shape: 'bar' })${INSETS.own}`)
add('ps nl2 spikes nested insets', 'proportionalSymbol', `m.nutsLevel(2).stat('size', ${J(st())}).psSettings({ shape: 'spike' })${INSETS.nested}`)
add(
    'ps nl0 squares external insets',
    'proportionalSymbol',
    `m.nutsLevel(0).stat('size', ${J(st())}).psSettings({ shape: 'square' })${INSETS.external}`
)
add(
    'ps nl2 dorling (not animated, no worker)',
    'proportionalSymbol',
    `m.nutsLevel(2).stat('size', ${J(st())}).dorling(true).animateDorling(false).dorlingWorker(false)${INSETS.default}`
)
// must render exactly like the scenario above (the worker runs the same simulation off the main thread)
add(
    'ps nl2 dorling (not animated, worker)',
    'proportionalSymbol',
    `m.nutsLevel(2).stat('size', ${J(st())}).dorling(true).animateDorling(false).dorlingWorker(true)${INSETS.default}`
)
add('ps nl2 dorling animated', 'proportionalSymbol', `m.nutsLevel(2).stat('size', ${J(st())}).dorling(true).dorlingWorker(false)${INSETS.default}`, {
    steps: [['dorling off + rebuild', `m.dorling(false).build()`]],
})
add(
    'ps nl2 pattern fill',
    'proportionalSymbol',
    `m.nutsLevel(2).stat('size', ${J(st())}).patternFill([{ pattern: 'hatching', regionIds: ['UA', 'DE', 'MT'] }])${INSETS.default}`
)
add('ps nl2 insets added/removed between builds', 'proportionalSymbol', `m.nutsLevel(2).stat('size', ${J(st())})${INSETS.image}`, {
    steps: [
        ['insets(false) + build', `m.insets(false).build()`],
        ['insets(default) + build', `m.insets('default').build()`],
        ['custom insets + build', `m${INSETS.custom}.build()`],
        ['image insets + build', `m.insets('image').build()`],
    ],
})
add('ps mixed one inset geometry fails', 'proportionalSymbol', `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}`, {
    fail: ['GF'],
})
add('ps mixed stat delayed', 'proportionalSymbol', `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}`, {
    delays: { stat: 700 },
})
add('ps mixed inset geometry delayed', 'proportionalSymbol', `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}`, {
    delays: { geo: { MT: 900, IC: 300 } },
})
add('ps mixed updateGeoData twice / build twice', 'proportionalSymbol', `m.nutsLevel('mixed').stat('size', ${J(st('s', nuts3))})${INSETS.image}`, {
    steps: [
        ['updateGeoData twice', `m.updateGeoData(); m.updateGeoData()`],
        ['build twice in a row', `m.build(); m.build()`],
    ],
})

// ---- composition types, sparkline, flow, mushroom
const comp = (time = '2021') =>
    `{ eurostatDatasetCode: 'apro_mt_ls_r', filters: { time: '${time}' }, categoryParameter: 'animals', categoryCodes: ['A2000', 'A3100', 'A4100'], categoryLabels: ['a', 'b', 'c'], categoryColors: ['#0060FA', '#E04040', '#40A040'] }`
const compSteps = [
    ['updateStatData', `m.stat('composition', ${comp('2020')}); m.updateStatData()`],
    ['rebuild (geometry cached)', `m.build()`],
]
for (const [type, insets] of [
    ['pieChart', INSETS.default],
    ['coxcomb', INSETS.custom],
    ['waffle', INSETS.default],
    ['bar', INSETS.default],
    ['stripeComposition', INSETS.default],
])
    add(`${type} nl2 insets`, type, `m.nutsLevel(2).stat('composition', ${comp()}).encoding('composition', { stat: 'composition' })${insets}`, {
        steps: compSteps,
    })
add(
    'pieChart mixed image insets',
    'pieChart',
    `m.nutsLevel('mixed').stat('composition', ${comp()}).encoding('composition', { stat: 'composition' })${INSETS.image}`,
    {
        steps: compSteps,
    }
)
add(
    'sparkline nl2 default insets',
    'sparkline',
    `m.nutsLevel(2).statSpark({ eurostatDatasetCode: 'demo_r_d3dens', filters: {}, dates: ['2019', '2020', '2021'] })${INSETS.default}`,
    {
        steps: [
            ['updateStatData', `m.updateStatData()`],
            ['rebuild (geometry cached)', `m.build()`],
        ],
    }
)
add(
    'flow nl2 default insets',
    'flow',
    `m.nutsLevel(2).flowGraph({ nodes: [{ id: 'FR' }, { id: 'DE' }, { id: 'MT' }], links: [{ source: 'FR', target: 'DE', value: 10 }, { source: 'MT', target: 'FR', value: 4 }] })${INSETS.default}`,
    { steps: [['rebuild (geometry cached)', `m.build()`]] }
)
add('mushroom nl2 default insets', 'mushroom', `m.nutsLevel(2).stat('v1', ${J(st())}).stat('v2', ${J(st('x'))})${INSETS.default}`)

// ---- cartograms, world
add('grid cartogram choropleth (insets configured)', 'choropleth', `m.nutsLevel(0).gridCartogram(true).stat(${J(st())})${INSETS.default}`, {
    steps: [...DEFAULT_STEPS, ['grid off + rebuild', `m.gridCartogram(false).build()`]],
})
add('grid cartogram ps', 'proportionalSymbol', `m.nutsLevel(0).gridCartogram(true).stat('size', ${J(st())})`)
add('WORLD choropleth', 'choropleth', `m.geo('WORLD').stat(${J(st('w', { geoLevel: 'country' }))})`)
add('WORLD proportionalSymbol', 'proportionalSymbol', `m.geo('WORLD').stat('size', ${J(st('w', { geoLevel: 'country' }))})`)

// --------------------------------------------------------------------------- in-page helpers
const INIT_SCRIPT = `
(() => {
    // seeded Math.random (mulberry32)
    let s = 1234567
    Math.random = function () {
        s |= 0; s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    window.__lastMutation = performance.now()
    new MutationObserver(() => { window.__lastMutation = performance.now() }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
    window.__onBuildCount = 0
    window.__manual = (v) => {
        const ids = ${J(ALL_IDS)}
        const out = {}
        ids.forEach((lvl, l) => lvl.forEach((id, i) => { if ((i + v + l) % 5 !== 0) out[id] = (i * 37 + l * 11 + v * 5) % 900 + 10 }))
        return out
    }
})()
`

function serialize() {
    const PROPS = [
        'display',
        'visibility',
        'opacity',
        'fill',
        'fill-opacity',
        'stroke',
        'stroke-width',
        'stroke-opacity',
        'stroke-dasharray',
        'font-size',
        'font-weight',
        'text-anchor',
        'pointer-events',
        'filter',
    ]
    const hashStr = (str) => {
        let h = 2166136261
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i)
            h = Math.imul(h, 16777619)
        }
        return (h >>> 0).toString(36) + ':' + str.length
    }
    const lines = []
    const walk = (el, depth) => {
        const tag = el.tagName.toLowerCase()
        if (tag === 'script' || tag === 'style') return
        const attrs = Array.from(el.attributes)
            .map((a) => [a.name, a.name === 'd' || a.value.length > 200 ? hashStr(a.value) : a.value])
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(' ')
        const cs = getComputedStyle(el)
        const comp = PROPS.map((p) => cs.getPropertyValue(p)).join(';')
        lines.push(`${depth} <${tag} ${attrs}> {${comp}}`)
        for (const c of el.childNodes) {
            if (c.nodeType === 1) walk(c, depth + 1)
            else if (c.nodeType === 3 && c.textContent.trim()) lines.push(`${depth + 1} #text ${JSON.stringify(c.textContent.trim())}`)
        }
    }
    walk(document.body, 0)

    // eurostat-map's own rules, for elements still in the document
    const sheet = document.getElementById('custom-styles')
    const rules = sheet && sheet.sheet ? Array.from(sheet.sheet.cssRules).map((r) => r.cssText) : []
    const liveRules = rules.filter((r) => {
        const m = /^#([^\s.:#[]+)/.exec(r)
        return !m || document.getElementById(m[1])
    })

    // inset svg ids, in traversal order (for normalisation)
    const ids = []
    const visit = (map) => {
        if (!map || !map.insetTemplates_) return
        for (const geo in map.insetTemplates_) {
            const g = map.insetTemplates_[geo]
            const list = Array.isArray(g) ? g.flat(2) : [g]
            for (const inset of list) {
                if (inset && inset.svgId_ && !ids.includes(inset.svgId_)) ids.push(inset.svgId_)
                visit(inset)
            }
        }
    }
    visit(window.__map)
    document.querySelectorAll('svg.em-inset, g.em-inset > svg').forEach((s) => s.id && !ids.includes(s.id) && ids.push(s.id))
    const m = window.__map
    return {
        lines,
        liveRules,
        ruleCount: rules.length,
        insetIds: ids,
        onBuildCount: window.__onBuildCount,
        loading: [m._loadingGeoCount_, m._loadingStatCount_],
    }
}

// Hover the first region/symbol of the main map and of every inset; return the tooltip shown.
async function probeTooltips(page) {
    const targets = await page.evaluate(() => {
        const out = []
        const svgs = [document.getElementById('map'), ...document.querySelectorAll('svg.em-inset, #ext1, #ext2')]
        svgs.forEach((svg, si) => {
            if (!svg) return
            const own = (e) => (e.closest('svg.em-map') || e.closest('svg')) === svg
            const visible = (e) => {
                const r = e.getBoundingClientRect()
                return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0
            }
            const cands = [
                ...svg.querySelectorAll('g.em-centroid > *'),
                ...svg.querySelectorAll('.em-nutsrg path[ecl]:not([ecl="nd"])'),
                ...svg.querySelectorAll('.em-nutsrg path, .em-worldrg path, path.em-worldrg, .em-grid-cell, .em-cntrg path'),
            ].filter((e) => own(e) && visible(e))
            const el = cands[0]
            if (!el) return
            el.setAttribute('data-probe', String(si))
            const r = el.getBoundingClientRect()
            out.push({ si, x: r.left + r.width / 2, y: r.top + r.height / 2 })
        })
        return out
    })
    const res = []
    for (const t of targets) {
        const html = await page.evaluate(({ si, x, y }) => {
            const el = document.querySelector(`[data-probe="${si}"]`)
            const ev = (type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, view: window }))
            ev('mouseover')
            ev('mousemove')
            const tips = Array.from(document.querySelectorAll('div[id^="em-tooltip"]'))
                .map((d) => `${d.id}|${d.innerHTML}`)
                .join('\n')
            const hoverFill = getComputedStyle(el).fill
            ev('mouseout')
            el.removeAttribute('data-probe')
            return `${hoverFill} ${tips}`
        }, t)
        res.push(`#${t.si} ${html}`)
    }
    return res
}

function normalise(snap, tips) {
    const ids = [...snap.insetIds].map((id, i) => [id, `INSET${i}`]).sort((a, b) => b[0].length - a[0].length)
    const fix = (s) => {
        for (const [id, rep] of ids) s = s.split(id).join(rep)
        return s
    }
    return {
        lines: snap.lines.map(fix),
        liveRules: snap.liveRules.map(fix),
        tooltips: tips.map(fix),
        onBuildCount: snap.onBuildCount,
        loading: snap.loading,
    }
}

// --------------------------------------------------------------------------- runner
const world = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'topojson', 'WORLD_4326.json'))

async function runScenario(browser, sc, buildDir) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 900 } })
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)))
    let pending = 0
    await page.addInitScript(INIT_SCRIPT)
    await page.route('**/*', async (route) => {
        const u = route.request().url()
        pending++
        try {
            const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
            const delay = (ms) => (ms ? new Promise((r) => setTimeout(r, ms)) : null)
            if (u === ORIGIN + '/')
                return await route.fulfill({
                    status: 200,
                    contentType: 'text/html',
                    body: '<!doctype html><html><head><meta charset="utf-8"></head><body><svg id="map"></svg><svg id="ext1"></svg><svg id="ext2"></svg></body></html>',
                })
            if (u.startsWith(ORIGIN + '/build/')) {
                const f = path.join(buildDir, path.basename(new URL(u).pathname))
                if (fs.existsSync(f)) return await route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) })
                return await route.fulfill({ status: 404, body: '' })
            }
            if (/world_4326/i.test(u)) return await route.fulfill({ status: 200, contentType: 'application/json', body: world })
            const g = geoRequest(u)
            if (g) {
                if (sc.fail && sc.fail.includes(g.geo)) return await route.fulfill({ status: 404, body: '' })
                await delay(sc.delays && sc.delays.geo && sc.delays.geo[g.geo])
                return await json(geoResponse(g))
            }
            if (/dissemination\/statistics/i.test(u)) {
                await delay(sc.delays && sc.delays.stat)
                return await json(jsonstat(u))
            }
            return await route.fulfill({ status: 404, body: '' })
        } finally {
            pending--
        }
    })

    const settle = async () => {
        const t0 = Date.now()
        await page.waitForTimeout(50)
        for (;;) {
            const since = await page.evaluate(() => performance.now() - window.__lastMutation)
            if (pending === 0 && since >= QUIET_MS) return
            if (Date.now() - t0 > 30000) throw new Error('page did not settle within 30 s')
            await page.waitForTimeout(100)
        }
    }

    const snaps = []
    const snap = async (label) => {
        await settle()
        const s = await page.evaluate(serialize)
        const tips = await probeTooltips(page)
        await settle()
        snaps.push({ label, ...normalise(s, tips) })
    }

    try {
        await page.goto(ORIGIN + '/')
        await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
        await page.evaluate(
            ({ type, setup, origin }) => {
                const m = (type ? window.eurostatmap.map(type) : window.eurostatmap.map())
                    .svgId('map')
                    .width(800)
                    .nuts2jsonBaseURL(origin + '/nuts2json/v2')
                    .onBuild(() => window.__onBuildCount++)
                if (m.worldTopojsonURL) m.worldTopojsonURL(origin + '/WORLD_4326.json')
                window.__map = m
                new Function('m', setup)(m)
                m.build()
            },
            { type: sc.type, setup: sc.setup, origin: ORIGIN }
        )
        await snap('build')
        for (const [label, js] of sc.steps) {
            await page.evaluate((code) => new Function('m', code)(window.__map), js)
            await snap(label)
        }
    } catch (e) {
        snaps.push({ label: 'ERROR', error: e.message })
    }
    await context.close()
    return { snaps, pageErrors: [...new Set(pageErrors)], consoleErrors: [...new Set(consoleErrors)] }
}

function compare(name, base, cur) {
    const diffs = []
    if (!base) return [`no baseline for this scenario (run with --capture)`]
    const n = Math.max(base.snaps.length, cur.snaps.length)
    for (let i = 0; i < n; i++) {
        const b = base.snaps[i]
        const c = cur.snaps[i]
        if (!b || !c) {
            diffs.push(`step ${i}: ${b ? b.label : '-'} vs ${c ? c.label : '-'} (missing)`)
            continue
        }
        const where = `[${c.label}]`
        if (b.error || c.error) {
            if (b.error !== c.error) diffs.push(`${where} error: ${b.error || '-'} -> ${c.error || '-'}`)
            continue
        }
        for (const key of ['onBuildCount', 'loading']) if (J(b[key]) !== J(c[key])) diffs.push(`${where} ${key}: ${J(b[key])} -> ${J(c[key])}`)
        for (const key of ['lines', 'liveRules', 'tooltips']) {
            const bl = b[key]
            const cl = c[key]
            if (J(bl) === J(cl)) continue
            let shown = 0
            let count = 0
            for (let j = 0; j < Math.max(bl.length, cl.length); j++) {
                if (bl[j] === cl[j]) continue
                count++
                if (shown < (VERBOSE ? 20 : 4)) {
                    diffs.push(`${where} ${key}[${j}]\n      - ${bl[j] ?? '(none)'}\n      + ${cl[j] ?? '(none)'}`)
                    shown++
                }
            }
            diffs.push(`${where} ${key}: ${count} differing entries (${bl.length} -> ${cl.length})`)
        }
    }
    if (J(base.pageErrors) !== J(cur.pageErrors)) diffs.push(`page errors: ${J(base.pageErrors)} -> ${J(cur.pageErrors)}`)
    return diffs
}

async function runAll(buildDir) {
    const browser = await chromium.launch({ headless: true })
    const results = {}
    const queue = SCENARIOS.filter((s) => !ONLY || s.name.includes(ONLY))
    try {
        await Promise.all(
            Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
                for (;;) {
                    const sc = queue.shift()
                    if (!sc) return
                    results[sc.name] = await runScenario(browser, sc, buildDir)
                }
            })
        )
    } finally {
        await browser.close()
    }
    return results
}

const t0 = Date.now()
const current = await runAll(BUILD_DIR)
const names = SCENARIOS.filter((s) => !ONLY || s.name.includes(ONLY)).map((s) => s.name)
if (DUMP) {
    fs.mkdirSync(DUMP, { recursive: true })
    for (const n of names) fs.writeFileSync(path.join(DUMP, n.replace(/[^\w.-]+/g, '_') + '.json'), JSON.stringify(current[n], null, 1))
}
const steps = names.reduce((a, n) => a + current[n].snaps.length, 0)

if (CAPTURE) {
    let all = {}
    if (ONLY && fs.existsSync(BASELINE)) all = JSON.parse(zlib.gunzipSync(fs.readFileSync(BASELINE)))
    for (const n of names) all[n] = current[n]
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true })
    fs.writeFileSync(BASELINE, zlib.gzipSync(JSON.stringify(all), { level: 9 }))
    for (const n of names) {
        const errs = current[n].snaps.filter((s) => s.error)
        console.log(`${errs.length ? 'ERR ' : 'cap '} ${n} (${current[n].snaps.length} steps)${errs.length ? ': ' + errs[0].error : ''}`)
    }
    console.log(`inset-regression.test: captured ${names.length} scenarios / ${steps} snapshots in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    process.exit(0)
}

let base
if (AGAINST) base = await runAll(path.resolve(AGAINST))
else {
    if (!fs.existsSync(BASELINE)) {
        console.error(`inset-regression.test: no baseline at ${BASELINE} (run with --capture)`)
        process.exit(1)
    }
    base = JSON.parse(zlib.gunzipSync(fs.readFileSync(BASELINE)))
}
let failures = 0
for (const n of names) {
    const d = compare(n, base[n], current[n])
    const errs = current[n].snaps.filter((s) => s.error)
    if (d.length || errs.length) failures++
    console.log(`${d.length || errs.length ? 'FAIL' : 'ok  '} ${n} (${current[n].snaps.length} steps)`)
    d.forEach((x) => console.log('       ' + x))
    errs.forEach((x) => console.log('       error: ' + x.error))
}
console.log(
    `inset-regression.test: ${names.length - failures}/${names.length} scenarios (${steps} snapshots) identical to the ${AGAINST ? 'reference build' : 'baseline'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`
)
if (failures) process.exit(1)
