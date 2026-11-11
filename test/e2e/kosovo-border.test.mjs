// Kosovo border styling check (Eurostat border guideline): the Kosovo/Serbia border must always read
// as "in between" a national and a regional border, on every map type, with the library's own
// default CSS. It may differ from them only by stroke width and colour. Hard checks, on every map
// type, border mode and template:
//   - stroke width strictly below the national border, and strictly above the regional border
//     when regional borders are drawn;
//   - effective opacity 1 (opacity and stroke-opacity multiplied up the ancestor chain: eurostat-map
//     puts opacity on the <g id="em-kosovo-bn"> group, not the path), since a translucent line's
//     look depends on the fill underneath;
//   - solid, unless national and regional borders are dashed too;
//   - no halo: no Kosovo path in a halo group or with a halo class, no filter, one style for all;
//   - the colour (and on guideline-styled maps, the width) the guideline sets for that mode:
//     default and darkMode #787878 (0.4-0.7px, dark 0.4-0.6px), lightBorders #fff; regional
//     #858585 0.3px (white with lightBorders); map types that mute their national borders, and world
//     maps, have their own documented scaled-down colours (see docs/css.md).
//
// Prominence, measured like IMAGE's e2e spec (image/e2e/kosovo-border.spec.ts): width x CIE L*
// contrast of the line as painted (alpha blended) over a fill, a national border counting its halo.
// It is evaluated over the fills actually rendered on each map: the land and sea colours, the region
// fills, and the map's real data class colours (all classes, plus its no-data colour), not a sweep of
// every possible colour. Kosovo must stay <= 0.7 x national and > regional over each of them.
//
// A solid line vanishes over a fill of its own lightness, so no pair of different solid colours can
// keep Kosovo above regional over every fill. With the guideline's #787878 0.5px Kosovo and #858585
// 0.3px regional borders, Kosovo is not above regional over mid-tone fills (the band printed at the
// end, about L* 43-52). The guideline accepts that; real map fills that land in this band are listed
// as notes, not failures, but only while both lines carry exactly the guideline colours: any other
// Kosovo-below-regional result fails.
//
// Renders each map type in headless Chromium (Playwright, already a devDependency) against the
// built dev bundle (build/eurostatmap.js), fully offline: Nuts2json requests are answered with a
// small synthetic topology whose features carry the same properties the real files do (incl. the
// Kosovo nutsbn feature, id > 100000), Eurostat API requests with mock JSON-stat, and world maps
// use the bundled src/assets/topojson/WORLD_4326.json. Computed styles come from the real CSS
// cascade, so per-map-type overrides (e.g. `.em--ps .em-cntbn`) are covered.
//
// Every scenario runs in each border mode: default (dark borders), lightBorders(true),
// darkMode(true), and both (set before build, and switched on an already-built map). Light mode
// must also turn national, Kosovo and regional borders white (light greys on near-white land);
// disputed borders must stay dashed in every mode; insets inherit the mode.
//
// Usage: node test/e2e/kosovo-border.test.mjs [--verbose] [--mode <mode name>]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
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

// Border modes
const MODES = [
    { name: 'default', lightBorders: false, darkMode: false },
    { name: 'light', lightBorders: true, darkMode: false },
    { name: 'dark', lightBorders: false, darkMode: true },
    { name: 'light+dark', lightBorders: true, darkMode: true },
    // both switched on an already-built map (and its insets), as an app toggling them would
    { name: 'light+dark, set after build', lightBorders: true, darkMode: true, afterBuild: true },
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
add(
    'bivariateChoropleth WORLD',
    'bivariateChoropleth',
    `m.geo('WORLD').stat('v1', ${JSON.stringify(stat())}).stat('v2', ${JSON.stringify(stat('x'))})`
)
add('categorical WORLD', 'categorical', `m.geo('WORLD').stat(${JSON.stringify(stat())})`)

// --------------------------------------------------------------------------- in-page probe
// Returns the style facts of the first national / Kosovo / regional border in the map svg, and the
// fills the borders are actually drawn over on this map.
function probe({ svgId, type }) {
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
    // the empty land: a land path without a data colour of its own (filled world maps colour most)
    const plain = (e) => !e.style.fill && !e.getAttribute('fill')
    const land =
        Array.from(svg.querySelectorAll('.em-cntrg path, path.em-worldrg, .em-worldrg path')).find(
            (e) => e.closest('svg.em-map') === svg && plain(e)
        ) || pick(['.em-cntrg path', 'path.em-worldrg', '.em-worldrg path'])
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

    // Kosovo halo checks: no Kosovo path in a halo group or carrying a halo class, no filter (glow,
    // shadow), and a single style for every Kosovo path of this map (no second, wider copy)
    const kosovoPaths = Array.from(svg.querySelectorAll('path.em-kosovo-bn, .em-kosovo-bn path')).filter((e) => e.closest('svg.em-map') === svg)
    const kosovoHalo = {
        inHalo: kosovoPaths.filter((e) => e.closest('[id$="-halo"], [class*="halo"]')).length,
        styles: [...new Set(kosovoPaths.map((e) => getComputedStyle(e).stroke + ' ' + getComputedStyle(e).strokeWidth))],
        filter: kosovoPaths.map((e) => getComputedStyle(e).filter).find((f) => f && f !== 'none') || 'none',
    }

    // The fills the borders run over on this map: sea, every region as rendered (data colours
    // included; fill-opacity and opacity blended over the sea), the pattern fills of stripe maps, and
    // the map's full set of data class colours and its no-data colour (the mock data only hits a few).
    const toRgb = (c) => {
        const d = document.createElement('div')
        d.style.color = c
        document.body.appendChild(d)
        const v = parseColor(getComputedStyle(d).color)
        d.remove()
        return v
    }
    const seaRgb = fill(sea) || { r: 255, g: 255, b: 255, a: 1 }
    const blend = (c, a) => ({
        r: Math.round(c.r * a + seaRgb.r * (1 - a)),
        g: Math.round(c.g * a + seaRgb.g * (1 - a)),
        b: Math.round(c.b * a + seaRgb.b * (1 - a)),
    })
    const fills = []
    const addFill = (c, source) => {
        if (c && !(c.a === 0)) fills.push({ r: c.r, g: c.g, b: c.b, source })
    }
    addFill(fill(sea), 'sea')
    for (const el of svg.querySelectorAll('.em-cntrg path, .em-nutsrg path, path.em-worldrg, .em-worldrg path, pattern *')) {
        if (el.closest('svg.em-map') !== svg) continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        const c = parseColor(cs.fill)
        if (!c) continue
        let a = c.a * parseFloat(cs.fillOpacity)
        for (let n = el; n && n !== svg; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity)
        if (a === 0) continue
        addFill(blend(c, a), el.closest('pattern') ? 'pattern' : el.closest('.em-cntrg') ? 'country' : 'region')
    }
    const m = window.__map
    try {
        const f = m.classToFillStyle && m.classToFillStyle()
        const n = (m.numberOfClasses && m.numberOfClasses()) || 0
        if (typeof f === 'function') {
            for (let i = 0; i < n; i++) {
                if (type === 'bivariateChoropleth') for (let j = 0; j < n; j++) addFill(toRgb(f(i, j)), 'class')
                else addFill(toRgb(f(i, n)), 'class')
            }
        } else if (f && typeof f === 'object') Object.values(f).forEach((c) => addFill(toRgb(c), 'class'))
    } catch (e) {
        /* not a classified map type */
    }
    // explicit no-data (':') regions get the no-data colour, except on sparkline, flow and mushroom maps
    if (!['sparkline', 'flow', 'mushroom'].includes(type))
        try {
            const nd = m.noDataFillStyle && m.noDataFillStyle()
            if (typeof nd === 'string') addFill(toRgb(nd), 'no data')
        } catch (e) {
            /* no no-data colour */
        }
    const seen = new Set()
    const uniqueFills = fills.filter((c) => {
        const k = `${c.r},${c.g},${c.b}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })

    return {
        kosovoHalo,
        fills: uniqueFills,
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
const lstar = ({ r, g, b }) => {
    const lin = [r, g, b].map((c) => {
        const v = c / 255
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y
}
const hexRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })
const rgbStr = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`
const sameColour = (f, hex) => !!(f && f.rgb && rgbStr(f.rgb) === rgbStr(hexRgb(hex)))
const WHITE = 'rgb(255, 255, 255)'

// Map types whose land is near-white (#f2f2f2): light borders are light greys there, not white.
const NEAR_WHITE_LAND = ['em--ps', 'em--bar', 'em--waffle', 'em--spark']
const classes = (res) => (res.svgClass || '').split(/\s+/)
const nearWhiteLight = (res, mode) => mode.lightBorders && !mode.darkMode && classes(res).some((c) => NEAR_WHITE_LAND.includes(c))

// ------------------------------------------------------------------ guideline colours and widths
// Guideline: national #353535 0.8px + 1.9px white halo, Kosovo #787878 (0.4-0.7px; 0.4-0.6px in dark
// mode), regional #858585 0.3px, in the default and dark modes; with white borders national #fff 1px,
// Kosovo #fff 0.4-0.7px, regional #fff 0.3px. Map types that mute their national borders, and world
// maps (0.5px national borders), scale Kosovo down with them: their colours are in docs/css.md.
const GUIDELINE = {
    national: '#353535',
    nationalWidth: 0.8,
    halo: '#ffffff',
    haloWidth: 1.9,
    kosovo: '#787878',
    regional: '#858585',
    regionalWidth: 0.3,
}
const KOSOVO_WIDTH = { default: [0.4, 0.7], dark: [0.4, 0.6], light: [0.4, 0.7] }
const styleKind = (res, sc) => {
    const c = classes(res)
    if (/WORLD/.test(sc.name)) return c.includes('em--ps') ? 'world-ps' : 'world'
    if (c.includes('em--ps')) return 'ps' // also pie and coxcomb
    if (c.includes('em--flow')) return 'flow'
    if (c.includes('em--spark')) return 'spark'
    if (c.includes('em--bar') || c.includes('em--waffle')) return 'barwaffle'
    return 'guideline'
}
const KOSOVO_COLOUR = {
    default: {
        guideline: '#787878',
        ps: '#999999',
        flow: '#999999',
        spark: '#b5b5b5',
        barwaffle: '#c2c2c2',
        world: '#8a8a8a',
        'world-ps': '#8a8a8a',
    },
    dark: { guideline: '#787878', ps: '#808080', flow: '#6e6e80', spark: '#80808e', barwaffle: '#9a9aa8', world: '#8a8a9a', 'world-ps': '#8a8a9a' },
}
function expectedKosovoColour(res, mode, kind) {
    if (mode.lightBorders) return nearWhiteLight(res, mode) || (kind === 'world-ps' && !mode.darkMode) ? '#cfcfcf' : '#ffffff'
    return KOSOVO_COLOUR[mode.darkMode ? 'dark' : 'default'][kind]
}

// ------------------------------------------------------------------ prominence over real fills
// width x CIE L* contrast of the line as painted (alpha blended) over the fill, / 100
const painted = (f, bg) => {
    const a = f.opacity
    return { r: f.rgb.r * a + bg.r * (1 - a), g: f.rgb.g * a + bg.g * (1 - a), b: f.rgb.b * a + bg.b * (1 - a) }
}
const promL = (f, bg) => (f && f.rgb && f.width ? (f.width * Math.abs(lstar(painted(f, bg)) - lstar(bg))) / 100 : 0)
const MAX_KOSOVO_TO_NATIONAL = 0.7

// The inherent limit of the guideline colours: the fill lightnesses over which a #787878 0.5px Kosovo
// line is not above a #858585 0.3px regional line. Documented, never failed on.
const guidelineBand = (() => {
    const K = { rgb: hexRgb(GUIDELINE.kosovo), width: 0.5, opacity: 1 }
    const R = { rgb: hexRgb(GUIDELINE.regional), width: GUIDELINE.regionalWidth, opacity: 1 }
    const greyOfL = (L) => {
        const y = L > 8 ? ((L + 16) / 116) ** 3 : (L * 27) / 24389
        const v = 255 * (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055)
        return { r: v, g: v, b: v }
    }
    const losing = []
    for (let L = 0; L <= 100; L += 0.1) if (!(promL(K, greyOfL(L)) > promL(R, greyOfL(L)))) losing.push(L)
    return losing.length ? [losing[0], losing[losing.length - 1]] : null
})()

const guidelineNotes = []

function check(res, mode, sc) {
    const errs = []
    const { national: N, halo: H, kosovo: K, regional: R, disputed: D } = res
    if (!K) return ['no Kosovo border drawn']
    if (!N) return ['no national border drawn']
    const kind = styleKind(res, sc)
    const modeKey = mode.lightBorders ? 'light' : mode.darkMode ? 'dark' : 'default'

    // ---- hard checks: width, opacity, dash, halo, colour
    if (!(K.width > 0)) errs.push(`Kosovo border invisible (stroke ${K.stroke}, width ${K.width})`)
    if (!(K.width < N.width)) errs.push(`Kosovo width ${K.width} not < national ${N.width}`)
    if (R && !(K.width > R.width)) errs.push(`Kosovo width ${K.width} not > regional ${R.width}`)
    if (K.opacity !== 1) errs.push(`Kosovo effective opacity ${K.opacity} != 1`)
    if (K.dash !== 'none' && !(N.dash !== 'none' && (!R || R.dash !== 'none')))
        errs.push(`Kosovo dashed ("${K.dash}") while national ("${N.dash}") or regional ("${R ? R.dash : '-'}") borders are not`)
    const kh = res.kosovoHalo || {}
    if (kh.inHalo) errs.push(`Kosovo halo: ${kh.inHalo} Kosovo path(s) in a halo group or with a halo class`)
    if (kh.filter && kh.filter !== 'none') errs.push(`Kosovo halo: filter ${kh.filter}`)
    if (kh.styles && kh.styles.length > 1) errs.push(`Kosovo drawn in ${kh.styles.length} different styles: ${kh.styles.join(' | ')}`)
    const kc = expectedKosovoColour(res, mode, kind)
    if (!sameColour(K, kc)) errs.push(`Kosovo stroke ${K.stroke}, expected ${rgbStr(hexRgb(kc))} (${kind}, ${mode.name})`)
    if (R && !mode.lightBorders && !sameColour(R, GUIDELINE.regional))
        errs.push(`regional stroke ${R.stroke}, expected guideline ${GUIDELINE.regional}`)
    if (kind === 'guideline') {
        const [lo, hi] = KOSOVO_WIDTH[modeKey]
        if (!(K.width >= lo && K.width <= hi)) errs.push(`Kosovo width ${K.width} outside the guideline ${lo}-${hi}px (${mode.name})`)
        if (R && R.width !== GUIDELINE.regionalWidth) errs.push(`regional width ${R.width}, expected guideline ${GUIDELINE.regionalWidth}px`)
        if (mode.lightBorders) {
            if (N.width !== 1) errs.push(`light borders: national width ${N.width}, expected 1px`)
        } else {
            if (!sameColour(N, GUIDELINE.national) || N.width !== GUIDELINE.nationalWidth)
                errs.push(`national ${N.stroke} ${N.width}px, expected guideline ${GUIDELINE.national} ${GUIDELINE.nationalWidth}px`)
            if (!H || !sameColour(H, GUIDELINE.halo) || H.width !== GUIDELINE.haloWidth)
                errs.push(`national halo ${H ? H.stroke + ' ' + H.width + 'px' : 'missing'}, expected white ${GUIDELINE.haloWidth}px`)
        }
    }

    // ---- prominence over the fills rendered on this map
    const fills = res.fills || []
    if (!fills.length) errs.push('no rendered fills found')
    const guidelineGreys = sameColour(K, GUIDELINE.kosovo) && sameColour(R, GUIDELINE.regional)
    const badN = []
    const badR = []
    const noted = []
    for (const bg of fills) {
        const pk = promL(K, bg)
        const pn = Math.max(promL(N, bg), promL(H, bg))
        const pr = R ? promL(R, bg) : 0
        const at = `${rgbStr(bg)} ${bg.source} L*${lstar(bg).toFixed(1)}`
        if (!(pk <= MAX_KOSOVO_TO_NATIONAL * pn)) badN.push(`${at} (K ${pk.toFixed(3)} N ${pn.toFixed(3)})`)
        // a fill of exactly the line colour hides both lines: nothing to compare
        if (R && !(pk === 0 && pr === 0) && !(pk > pr)) (guidelineGreys ? noted : badR).push(`${at} (K ${pk.toFixed(3)} R ${pr.toFixed(3)})`)
    }
    if (badN.length)
        errs.push(`Kosovo not <= ${MAX_KOSOVO_TO_NATIONAL} x national over ${badN.length}/${fills.length} rendered fills: ${badN.join(', ')}`)
    if (badR.length) errs.push(`Kosovo not > regional over ${badR.length}/${fills.length} rendered fills: ${badR.join(', ')}`)
    if (noted.length) guidelineNotes.push(`[${mode.name}] ${sc.name}: ${noted.join(', ')}`)

    // ---- disputed borders stay dashed in every mode
    if (!D) errs.push('no disputed border drawn')
    else if (D.dash === 'none' || !(D.width > 0)) errs.push(`disputed border not a visible dashed line (dash ${D.dash}, width ${D.width})`)
    // ---- the mode classes are on this map's own svg (insets inherit them)
    const cls = classes(res)
    if (cls.includes('em--borders-light') !== mode.lightBorders)
        errs.push(`svg class "${res.svgClass}" does not match lightBorders ${mode.lightBorders}`)
    if (cls.includes('em--dark') !== mode.darkMode) errs.push(`svg class "${res.svgClass}" does not match darkMode ${mode.darkMode}`)
    if (mode.lightBorders) {
        const greys = nearWhiteLight(res, mode)
        const land = hexRgb('#f2f2f2')
        for (const [label, f] of [
            ['national', N],
            ['Kosovo', K],
            ['regional', R],
        ]) {
            if (!f) continue
            // pure white, or on near-white land a light grey that is still visible on it
            if (!greys && f.stroke !== WHITE) errs.push(`light borders: ${label} stroke ${f.stroke} is not white`)
            if (greys && !(f.rgb && luminance(f.rgb) > 0.5 && luminance(f.rgb) < luminance(land) - 0.05))
                errs.push(`light borders on near-white land: ${label} stroke ${f.stroke} is not a visible light grey`)
        }
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
                res = await page.evaluate(probe, { svgId: sc.svgId, type: sc.type })
            } catch (e) {
                res = {
                    national: null,
                    kosovo: null,
                    regional: null,
                    svgClass: await page.evaluate((id) => document.getElementById(id)?.getAttribute('class'), sc.svgId),
                }
            }
            const errs = check(res, mode, sc)
            if (errs.length) failures++
            const fmt = (f) =>
                f ? `${f.stroke} ${f.width}px${f.dash !== 'none' ? ' dash ' + f.dash : ''}${f.opacity !== 1 ? ' op ' + f.opacity : ''}` : '-'
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
                fills: (res.fills || []).map((c) => `${rgbStr(c)} ${c.source}`),
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
        if (VERBOSE) console.log(`       fills    ${r.fills.join(', ')}`)
        r.errs.forEach((e) => console.log('       - ' + e))
        if (VERBOSE && r.pageErrors.length)
            console.log('       page errors (mock data, informational): ' + [...new Set(r.pageErrors)].slice(0, 3).join(' | '))
    }
}
if (guidelineBand)
    console.log(
        `guideline limit (not a failure): a ${GUIDELINE.kosovo} 0.5px Kosovo line is not above a ${GUIDELINE.regional} ${GUIDELINE.regionalWidth}px regional line over fills of L* ${guidelineBand[0].toFixed(1)}-${guidelineBand[1].toFixed(1)}.` +
            (guidelineNotes.length
                ? ` Rendered fills in that band on ${guidelineNotes.length} map configuration(s)${VERBOSE ? ':' : ' (--verbose lists them)'}`
                : ' No rendered fill falls in it.')
    )
if (VERBOSE) guidelineNotes.forEach((n) => console.log('       ' + n))
console.log(`kosovo-border.test: ${rows.length - failures}/${rows.length} map configurations pass`)
if (failures) process.exit(1)
