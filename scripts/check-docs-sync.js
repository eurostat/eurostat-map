#!/usr/bin/env node
/**
 * Fails when the hand-written docs/reference.md has drifted from the TypeScript declarations.
 *
 *  1. Every public method of MapInstance (src/types/core/MapInstance.d.ts) must be documented.
 *  2. Every property of each legend / ranked-bar-chart config interface must be documented in
 *     the matching section of reference.md (e.g. ProportionalSymbolSizeLegendConfig -> the
 *     "Proportional symbol legends" section).
 *
 * "Documented" means the name appears as **name** (table cell) or as `name:` (code example)
 * inside the relevant text. Anything intentionally undocumented goes in IGNORED_* below, with
 * a reason. Run: node scripts/check-docs-sync.js (also part of `npm run type-check`).
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')

const reference = read('docs/reference.md')

// MapInstance members that are internal / deprecated / documented under another name.
const IGNORED_METHODS = new Set([
    'geoCenter', // deprecated, replaced by position()
    'layers_', // internal state exposed for typing only
    'activeLayerIndex_', // internal state exposed for typing only
])

// Legend config interface name pattern -> reference.md "###"/"##" heading that must document it.
const SECTION_FOR_INTERFACE = [
    [/^Histogram/, 'Choropleth legends'],
    [/^Choropleth/, 'Choropleth legends'],
    [/^Bivariate/, 'Bivariate choropleth legends'],
    [/^Trivariate/, 'Trivariate choropleth legends'],
    [/^ProportionalSymbol/, 'Proportional symbol legends'],
    [/^PieChart/, 'Pie chart legends'],
    [/^Categorical/, 'Categorical legends'],
    [/^StripeComposition/, 'Stripe composition legends'],
    [/^Sparkline/, 'Sparkline legends'],
    [/^(Flow|NodeSize|RegionColor)/, 'Flow map legends'],
    [/^Coxcomb/, 'Coxcomb legends'],
    [/^Mushroom/, 'Mushroom legends'],
    [/^Waffle/, 'Waffle chart legends'],
    [/^BarChart/, 'Bar chart legends'],
    [/^RankedBarChart/, 'Ranked bar chart'],
]

// "Interface.property" entries that are intentionally not documented.
const IGNORED_PROPERTIES = new Set([])

// ---------------------------------------------------------------------------

function listFiles(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name)
        return e.isDirectory() ? listFiles(rel) : [rel]
    })
}

/** Returns [{name, props[]}] for each exported interface (only 4-space-indented own members). */
function parseInterfaces(text) {
    const out = []
    const re = /export interface (\w+)(?:\s+extends [^{]+)?\s*\{/g
    let m
    while ((m = re.exec(text))) {
        let depth = 1
        let i = re.lastIndex
        while (depth > 0 && i < text.length) {
            if (text[i] === '{') depth++
            else if (text[i] === '}') depth--
            i++
        }
        const body = text.slice(re.lastIndex, i - 1)
        const props = [...body.matchAll(/^ {4}(\w+)\??\s*[:(]/gm)].map((x) => x[1])
        out.push({ name: m[1], props: [...new Set(props)] })
    }
    return out
}

/** Text of the section starting at the given heading, up to the next heading of same/higher level. */
function sectionText(heading) {
    const m = reference.match(new RegExp('^(#{2,4}) ' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'm'))
    if (!m) return null
    const level = m[1].length
    const rest = reference.slice(m.index + m[0].length)
    const next = rest.search(new RegExp('^#{1,' + level + '} ', 'm'))
    return next === -1 ? rest : rest.slice(0, next)
}

const isDocumented = (name, text) => new RegExp('\\*\\*' + name + '\\*\\*|\\b' + name + '\\s*:|\\.' + name + '\\(').test(text)

const problems = []

// 1. MapInstance methods
const mapInstance = parseInterfaces(read('src/types/core/MapInstance.d.ts')).find((i) => i.name === 'MapInstance')
for (const method of mapInstance.props) {
    if (IGNORED_METHODS.has(method)) continue
    if (!isDocumented(method, reference)) problems.push(`MapInstance.${method}() is not documented in docs/reference.md`)
}

// 2. Legend / ranked bar chart config properties
const files = [...listFiles('src/types/legend'), 'src/types/core/decoration/RankedBarChartConfig.d.ts']
for (const file of files.filter((f) => f.endsWith('.d.ts'))) {
    for (const iface of parseInterfaces(read(file))) {
        if (iface.name === 'LegendConfig') continue // the base table, checked below
        const rule = SECTION_FOR_INTERFACE.find(([re]) => re.test(iface.name))
        if (!rule) {
            if (iface.props.length) problems.push(`${iface.name} (${file}) has no section mapping in scripts/check-docs-sync.js`)
            continue
        }
        const text = sectionText(rule[1])
        if (text === null) {
            problems.push(`docs/reference.md has no "${rule[1]}" section (needed for ${iface.name})`)
            continue
        }
        for (const prop of iface.props) {
            if (IGNORED_PROPERTIES.has(`${iface.name}.${prop}`)) continue
            if (!isDocumented(prop, text)) problems.push(`${iface.name}.${prop} is not documented in the "${rule[1]}" section`)
        }
    }
}

// 3. Base legend parameters
const base = parseInterfaces(read('src/types/legend/LegendConfig.d.ts')).find((i) => i.name === 'LegendConfig')
const baseText = sectionText('Map legend')
for (const prop of base.props) {
    if (prop === 'layer') continue // internal
    if (!isDocumented(prop, baseText)) problems.push(`LegendConfig.${prop} is not documented in the "Map legend" section`)
}

if (problems.length) {
    console.error('docs/reference.md is out of sync with src/types:\n')
    problems.forEach((p) => console.error('  - ' + p))
    console.error(`\n${problems.length} problem(s). Document them, or add an entry to the IGNORED_* lists in scripts/check-docs-sync.js.`)
    process.exit(1)
}
console.log('docs/reference.md is in sync with src/types')
