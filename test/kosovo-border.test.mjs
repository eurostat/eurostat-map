// Kosovo border styling check (Eurostat rule): the Kosovo/Serbia border must always read as
// "in between" a national and a regional border, on every map type, with the library's own
// default CSS. It may differ from them only by stroke width and colour:
//   - stroke width strictly below the national border, and strictly above the regional border
//     when regional borders are drawn;
//   - effective opacity 1 (opacity and stroke-opacity multiplied up the ancestor chain), since
//     a translucent line's look depends on the fill underneath;
//   - same dash pattern as the national border (solid unless national borders are dashed);
//   - a prominence score (width x contrast with the background x opacity) clearly (10%) below
//     the national border and above the regional border.
//
// Renders each map type in headless Chromium (Playwright, already a devDependency) against the
// built dev bundle (build/eurostatmap.js), fully offline: Nuts2json requests are answered with a
// small synthetic topology whose features carry the same properties the real files do (incl. the
// Kosovo nutsbn feature, id > 100000), Eurostat API requests with mock JSON-stat, and world maps
// use the bundled src/assets/topojson/WORLD_4326.json. Computed styles come from the real CSS
// cascade, so per-map-type overrides (e.g. `.em--ps .em-cntbn`) are covered.
//
// Every scenario runs in each border mode: default (dark borders), lightBorders(true),
// darkMode(true), and both (set before build, and switched on an already-built map). Prominence
// is measured against the mode's background (white land, a mid-grey data fill under light
// borders, the dark land of darkMode), and a national border's halo counts towards it. Light mode must also turn national, Kosovo and regional
// borders white; disputed borders must stay dashed in every mode; insets inherit the mode.
//
// Usage: node test/kosovo-border.test.mjs [--verbose] [--mode <mode name>]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'http://em-test.local'
const VERBOSE = process.argv.includes('--verbose')
const ONLY_MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : null

let chromium
try {
    ;({ chromium } = await import('playwright'))
} catch (e) {
    console.error('kosovo-border.test: playwright is not installed (npm install)')
    process.exit(1)
}

// ---------------------------------------------------------------- synthetic Nuts2json topology
// Ids per NUTS level. Real files: level N contains nutsrg of level N and nutsbn of levels 0..N.
const RG = [
    ['FR', 'DE', 'RS'],
    ['FR1', 'DE1', 'RS1'],
    ['FR10', 'DE11', 'RS11'],
    ['FR101', 'DE111', 'RS110'],
]
const CX = 4300000
const CY = 2700000

function topology(level) {
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

function centroids(level) {
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
function jsonstat(urlStr) {
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

// --------------------------------------------------------------------------- scenarios
const stat = (code = 'demo_r_d3dens', filters = {}) => ({ eurostatDatasetCode: code, filters: { time: '2021', ...filters } })

// Each scenario is a builder-chain snippet evaluated in the page with `m` = eurostatmap.map(type)
const SCENARIOS = []
const add = (name, type, setup, svgId = 'map') => SCENARIOS.push({ name, type, setup, svgId })

// Border modes. bg is the background the borders are judged against: white land by default, a
// mid-grey data fill for light (white) borders, and the dark land darkMode paints itself.
const MODES = [
    { name: 'default', lightBorders: false, darkMode: false, bg: '#ffffff' },
    { name: 'light', lightBorders: true, darkMode: false, bg: '#808080' },
    { name: 'dark', lightBorders: false, darkMode: true, bg: 'land' },
    { name: 'light+dark', lightBorders: true, darkMode: true, bg: 'land' },
    // both switched on an already-built map (and its insets), as an app toggling them would
    { name: 'light+dark, set after build', lightBorders: true, darkMode: true, bg: 'land', afterBuild: true },
].filter((m) => !ONLY_MODE || m.name === ONLY_MODE)

for (const lvl of [0, 2, 3, 'mixed']) {
    const L = JSON.stringify(lvl)
    add(`choropleth nutsLevel ${lvl}`, 'choropleth', `m.nutsLevel(${L}).stat(${JSON.stringify(stat())})`)
    add(`proportionalSymbol nutsLevel ${lvl}`, 'proportionalSymbol', `m.nutsLevel(${L}).stat('size', ${JSON.stringify(stat())})`)
}
add('categorical nutsLevel 2', 'categorical', `m.nutsLevel(2).stat(${JSON.stringify(stat())})`)
add(
    'bivariateChoropleth nutsLevel 2',
    'bivariateChoropleth',
    `m.nutsLevel(2).stat('v1', ${JSON.stringify(stat())}).stat('v2', ${JSON.stringify(stat('x'))})`
)
add(
    'trivariateChoropleth nutsLevel 2',
    'trivariateChoropleth',
    `m.nutsLevel(2).stat('v1', ${JSON.stringify(stat())}).stat('v2', ${JSON.stringify(stat('x'))}).stat('v3', ${JSON.stringify(stat('y'))})`
)
add('valueByAlpha nutsLevel 2', 'valueByAlpha', `m.nutsLevel(2).stat(${JSON.stringify(stat())})`)
const comp = `'composition', { eurostatDatasetCode: 'apro_mt_ls_r', filters: { time: '2021' }, categoryParameter: 'animals', categoryCodes: ['A2000', 'A3100'], categoryLabels: ['a', 'b'], categoryColors: ['#0060FA', '#E04040'] }`
add('stripeComposition nutsLevel 2', 'stripeComposition', `m.nutsLevel(2).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('pieChart nutsLevel 0', 'pieChart', `m.nutsLevel(0).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('pieChart nutsLevel 2', 'pieChart', `m.nutsLevel(2).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('coxcomb nutsLevel 0', 'coxcomb', `m.nutsLevel(0).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('coxcomb nutsLevel 2', 'coxcomb', `m.nutsLevel(2).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('waffle nutsLevel 2', 'waffle', `m.nutsLevel(2).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('bar nutsLevel 2', 'bar', `m.nutsLevel(2).stat(${comp}).encoding('composition', { stat: 'composition' })`)
add('mushroom nutsLevel 2', 'mushroom', `m.nutsLevel(2).stat('v1', ${JSON.stringify(stat())}).stat('v2', ${JSON.stringify(stat('x'))})`)
add('sparkline nutsLevel 0', 'sparkline', `m.nutsLevel(0).statSpark({ eurostatDatasetCode: 'demo_r_d3dens', filters: {}, dates: ['2020', '2021'] })`)
add('sparkline nutsLevel 2', 'sparkline', `m.nutsLevel(2).statSpark({ eurostatDatasetCode: 'demo_r_d3dens', filters: {}, dates: ['2020', '2021'] })`)
const flow = `.flowGraph({ nodes: [{ id: 'FR' }, { id: 'DE' }], links: [{ source: 'FR', target: 'DE', value: 10 }] })`
add('flow nutsLevel 0', 'flow', `m.nutsLevel(0)${flow}`)
add('flow nutsLevel 2', 'flow', `m.nutsLevel(2)${flow}`)
add('flow default nutsLevel (3)', 'flow', `m${flow}`)
// insets must inherit the border mode of the main map (checked on the inset's own svg)
add(
    'choropleth nutsLevel 2, inset',
    'choropleth',
    `m.nutsLevel(2).stat(${JSON.stringify(stat())}).insets([{ geo: 'MT', svgId: 'inset', x: 0, y: 0, width: 200, height: 200, scale: '01M' }])`,
    'inset'
)
add('choropleth WORLD', 'choropleth', `m.geo('WORLD').stat(${JSON.stringify(stat())})`)
add('proportionalSymbol WORLD', 'proportionalSymbol', `m.geo('WORLD').stat('size', ${JSON.stringify(stat())})`)

// --------------------------------------------------------------------------- in-page probe
// Returns the style facts of the first national / Kosovo / regional border in the map svg.
function probe(svgId) {
    const svg = document.getElementById(svgId)
    // only elements of this map's own svg (an inset's svg sits inside the main map's svg)
    const pick = (sels) => {
        for (const s of sels) {
            const el = Array.from(svg.querySelectorAll(s)).find((e) => e.closest('svg.em-map') === svg)
            if (el) return el
        }
        return null
    }
    const national = pick(['#em-cntbn path.em-bn-eu:not(.em-bn-co)', '#em-cntbn path:not(.em-bn-co):not(.em-bn-d)', '#em-worldbn path.em-worldbn'])
    const halo = pick([
        '#em-cntbn-halo path.em-bn-eu:not(.em-bn-co)',
        '#em-cntbn-halo path:not(.em-bn-co):not(.em-bn-d)',
        '#em-worldbn-halo path.em-worldbn-halo:not(.em-bn-d)',
    ])
    const kosovo = pick(['path.em-kosovo-bn', '.em-kosovo-bn path'])
    const regional = pick([
        '#em-nutsbn path.em-bn-3',
        '#em-nutsbn path.em-bn-2',
        '#em-nutsbn path.em-bn-1',
        ".em-nutsrg-3 path[lvl='3']",
        ".em-nutsrg-2 path[lvl='2']",
        ".em-nutsrg-1 path[lvl='1']",
    ])
    const disputed = pick(['#em-cntbn path.em-bn-d', '#em-worldbn path.em-bn-d'])
    const coast = pick(['#em-cntbn path.em-bn-co', '#em-nutsbn path.em-bn-co', '#em-worldbn path.em-bn-co'])
    const land = pick(['.em-cntrg path', 'path.em-worldrg', '.em-worldrg path'])
    const sea = pick(['.em-sea'])
    const parseColor = (c) => {
        const m = /rgba?\(([^)]+)\)/.exec(c || '')
        if (!m) return null
        const p = m[1]
            .split(/[ ,/]+/)
            .filter(Boolean)
            .map(Number)
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
    }
    const facts = (el) => {
        if (!el) return null
        const cs = getComputedStyle(el)
        let op = 1
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
            const s = getComputedStyle(n)
            op *= parseFloat(s.opacity)
            if (n === el) op *= parseFloat(s.strokeOpacity)
        }
        const col = parseColor(cs.stroke)
        return {
            className: el.getAttribute('class') || el.parentElement.getAttribute('class'),
            stroke: cs.stroke,
            rgb: col,
            width: cs.stroke === 'none' || !col || cs.display === 'none' ? 0 : parseFloat(cs.strokeWidth),
            dash: cs.strokeDasharray === 'none' ? 'none' : cs.strokeDasharray,
            opacity: +(op * (col ? col.a : 1)).toFixed(4),
            display: cs.display,
        }
    }
    const fill = (el) => (el ? parseColor(getComputedStyle(el).fill) : null)
    return {
        svgClass: svg.getAttribute('class'),
        national: facts(national),
        halo: facts(halo),
        kosovo: facts(kosovo),
        regional: facts(regional),
        disputed: facts(disputed),
        coast: facts(coast),
        land: fill(land),
        sea: fill(sea),
    }
}

// --------------------------------------------------------------------------- checks
function luminance({ r, g, b }) {
    const f = (v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const hexRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })
const background = (res, mode) => (mode.bg === 'land' ? res.land || hexRgb('#000000') : hexRgb(mode.bg))
// How strongly a line stands out against the background: width x luminance contrast x opacity.
// Against white this is the original width x darkness x opacity score.
const prominence = (f, bg) => (f && f.rgb && f.width ? +(f.width * Math.abs(luminance(bg) - luminance(f.rgb)) * f.opacity).toFixed(4) : 0)
const WHITE = 'rgb(255, 255, 255)'

function check(res, mode) {
    const errs = []
    const { national: N, halo: H, kosovo: K, regional: R, disputed: D } = res
    if (!K) return ['no Kosovo border drawn']
    if (!N) return ['no national border drawn']
    const bg = background(res, mode)
    // a national border is as prominent as the more visible of its line and its halo
    const pn = Math.max(prominence(N, bg), prominence(H, bg))
    const pk = prominence(K, bg)
    const pr = R ? prominence(R, bg) : null
    if (!(K.width > 0)) errs.push(`Kosovo border invisible (stroke ${K.stroke}, width ${K.width})`)
    if (!(K.width < N.width)) errs.push(`Kosovo width ${K.width} not < national ${N.width}`)
    if (R && !(K.width > R.width)) errs.push(`Kosovo width ${K.width} not > regional ${R.width}`)
    if (K.opacity !== 1) errs.push(`Kosovo effective opacity ${K.opacity} != 1`)
    if (K.dash !== N.dash) errs.push(`Kosovo dash "${K.dash}" != national dash "${N.dash}"`)
    // "clearly" in between: at least 10% apart from either
    if (!(pk < 0.9 * pn)) errs.push(`Kosovo prominence ${pk} not clearly < national ${pn}`)
    if (R && !(pk > 1.1 * pr)) errs.push(`Kosovo prominence ${pk} not clearly > regional ${pr}`)
    // disputed borders stay dashed in every mode
    if (!D) errs.push('no disputed border drawn')
    else if (D.dash === 'none' || !(D.width > 0)) errs.push(`disputed border not a visible dashed line (dash ${D.dash}, width ${D.width})`)
    // the mode classes are on this map's own svg (insets inherit them)
    const cls = (res.svgClass || '').split(/\s+/)
    if (cls.includes('em--borders-light') !== mode.lightBorders)
        errs.push(`svg class "${res.svgClass}" does not match lightBorders ${mode.lightBorders}`)
    if (cls.includes('em--dark') !== mode.darkMode) errs.push(`svg class "${res.svgClass}" does not match darkMode ${mode.darkMode}`)
    if (mode.lightBorders) {
        for (const [label, f] of [
            ['national', N],
            ['Kosovo', K],
            ['regional', R],
        ])
            if (f && f.stroke !== WHITE) errs.push(`light borders: ${label} stroke ${f.stroke} is not white`)
        if (H && H.width > 0) errs.push(`light borders: national halo still drawn (${H.stroke} ${H.width}px)`)
    }
    if (mode.darkMode) {
        if (!res.land || luminance(res.land) > 0.1) errs.push(`dark mode: land fill ${JSON.stringify(res.land)} is not dark`)
        if (!res.sea || luminance(res.sea) > 0.1) errs.push(`dark mode: sea fill ${JSON.stringify(res.sea)} is not dark`)
    }
    return errs
}

// --------------------------------------------------------------------------- runner
const bundle = fs.readFileSync(path.join(ROOT, 'build', 'eurostatmap.js'))
const world = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'topojson', 'WORLD_4326.json'))

const browser = await chromium.launch({ headless: true })
let failures = 0
const rows = []
try {
    for (const mode of MODES)
        for (const sc of SCENARIOS) {
            const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
            const pageErrors = []
            page.on('pageerror', (e) => pageErrors.push(e.message))
            await page.route('**/*', async (route) => {
                const u = route.request().url()
                const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
                if (u === ORIGIN + '/')
                    return route.fulfill({
                        status: 200,
                        contentType: 'text/html',
                        body: '<!doctype html><html><body><svg id="map"></svg></body></html>',
                    })
                if (u.startsWith(ORIGIN + '/build/')) {
                    const f = path.join(ROOT, 'build', path.basename(new URL(u).pathname))
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
            await page.goto(ORIGIN + '/')
            await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
            await page.evaluate(
                ({ type, setup, origin, mode }) => {
                    const m = window.eurostatmap
                        .map(type)
                        .svgId('map')
                        .width(800)
                        .nuts2jsonBaseURL(origin + '/nuts2json/v2')
                    if (m.worldTopojsonURL) m.worldTopojsonURL(origin + '/WORLD_4326.json')
                    new Function('m', setup)(m)
                    if (!mode.afterBuild && mode.lightBorders) m.lightBorders(true)
                    if (!mode.afterBuild && mode.darkMode) m.darkMode(true)
                    if (m.zoomButtons) m.zoomButtons(false)
                    m.build()
                    window.__map = m
                },
                { type: sc.type, setup: sc.setup, origin: ORIGIN, mode }
            )
            let res
            try {
                await page.waitForFunction((id) => document.querySelector('#' + id + ' .em-kosovo-bn'), sc.svgId, { timeout: 15000 })
                await page.waitForTimeout(500) // let data-driven styling (mixed NUTS strokes, etc.) settle
                if (mode.afterBuild) await page.evaluate((md) => window.__map.lightBorders(md.lightBorders).darkMode(md.darkMode), mode)
                res = await page.evaluate(probe, sc.svgId)
            } catch (e) {
                res = {
                    national: null,
                    kosovo: null,
                    regional: null,
                    svgClass: await page.evaluate((id) => document.getElementById(id)?.getAttribute('class'), sc.svgId),
                }
            }
            const errs = check(res, mode)
            const bg = background(res, mode)
            if (errs.length) failures++
            const fmt = (f) =>
                f
                    ? `${f.stroke} ${f.width}px${f.dash !== 'none' ? ' dash ' + f.dash : ''}${f.opacity !== 1 ? ' op ' + f.opacity : ''} [p=${prominence(f, bg)}]`
                    : '-'
            rows.push({
                name: `[${mode.name}] ${sc.name}`,
                ok: !errs.length,
                N: fmt(res.national),
                H: fmt(res.halo),
                D: fmt(res.disputed),
                C: fmt(res.coast),
                K: fmt(res.kosovo),
                R: fmt(res.regional),
                errs,
                pageErrors,
                svgClass: res.svgClass,
            })
            await page.close()
        }
} finally {
    await browser.close()
}

for (const r of rows) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}`)
    if (VERBOSE || !r.ok) {
        console.log(`       svg class: ${r.svgClass}`)
        console.log(
            `       national ${r.N} (halo ${r.H})\n       kosovo   ${r.K}\n       regional ${r.R}\n       disputed ${r.D}\n       coast    ${r.C}`
        )
        r.errs.forEach((e) => console.log('       - ' + e))
        if (VERBOSE && r.pageErrors.length)
            console.log('       page errors (mock data, informational): ' + [...new Set(r.pageErrors)].slice(0, 3).join(' | '))
    }
}
console.log(`kosovo-border.test: ${rows.length - failures}/${rows.length} map configurations pass`)
if (failures) process.exit(1)
