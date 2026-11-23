// Layout regression test for the swatch legends (choropleth ranges/thresholds, horizontal, diverging, max/min,
// no-data, categorical, proportional-symbol colour legend, flow colour legend).
//
// Renders each legend in headless Chromium against the built dev bundle (build/eurostatmap.js), fully offline
// (synthetic Nuts2json and statistics, see test/helpers/synthetic-nuts.mjs), and compares a fingerprint of
// every legend element with test/e2e/baselines/legend-layout.json:
//   - rects and lines: class and bounding box relative to the legend, to 0.5px (font independent);
//   - text: class, content and the x / y / dy / text-anchor attributes (their rendered size depends on the font);
//   - the point-of-divergence group: only its element classes (its lines are sized from the label widths).
// The baseline was captured from the legend code as it was before the shared swatch-stack layout, so passing
// means that layout is a pure refactor. Recapture after a deliberate legend change:
//   node test/e2e/legend-layout.test.mjs --capture
//
// The flow colour legend is checked structurally instead (swatches contiguous, like the choropleth legend),
// because making it contiguous was a deliberate change.
//
// Usage: node test/e2e/legend-layout.test.mjs [--capture] [--bundle-dir <dir holding eurostatmap.js>]

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { ORIGIN, routeFixtures } from '../helpers/synthetic-nuts.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASELINE = path.join(ROOT, 'test', 'e2e', 'baselines', 'legend-layout.json')
const args = process.argv.slice(2)
const CAPTURE = args.includes('--capture')
const bundleDir = args.includes('--bundle-dir') ? path.resolve(args[args.indexOf('--bundle-dir') + 1]) : path.join(ROOT, 'build')

const stat = `{ eurostatDatasetCode: 'demo_r_d3dens', filters: { time: '2021' } }`
const choropleth = (legend, extra = '') => `m.nutsLevel(2).stat(${stat}).numberOfClasses(3)${extra}.legend(${JSON.stringify(legend)})`

// name -> map type and builder snippet (`m` is the map)
const SCENARIOS = {
    'choropleth thresholds': ['choropleth', choropleth({ title: 'Density' })],
    'choropleth ranges': ['choropleth', choropleth({ title: 'Density', labelType: 'ranges' })],
    'choropleth ascending': ['choropleth', choropleth({ title: 'Density', ascending: true })],
    'choropleth thresholds, plain': ['choropleth', choropleth({ title: 'Density', maxMin: false, noData: false })],
    'choropleth ranges, plain': ['choropleth', choropleth({ title: 'Density', labelType: 'ranges', maxMin: false, noData: false })],
    'choropleth thresholds with max/min': ['choropleth', choropleth({ title: 'Density', maxMin: true, maxMinLabels: ['lowest', 'highest'] })],
    'choropleth thresholds with no data': ['choropleth', choropleth({ title: 'Density', noData: true, noDataText: 'No data' })],
    'choropleth ranges with no data': ['choropleth', choropleth({ title: 'Density', labelType: 'ranges', noData: true, noDataText: 'No data' })],
    'choropleth custom labels and sizes': [
        'choropleth',
        choropleth({ title: 'Density', labels: ['low', 'mid', 'high'], shapeWidth: 30, shapeHeight: 14, tickLength: 8, sepLineLength: 40 }),
    ],
    'choropleth thresholds diverging': ['choropleth', choropleth({ title: 'Density', pointOfDivergence: 1, pointOfDivergenceLabel: 'mid' })],
    'choropleth ranges diverging': [
        'choropleth',
        choropleth({ title: 'Density', labelType: 'ranges', pointOfDivergence: 1, pointOfDivergenceLabel: 'mid', pointOfDivergencePadding: 12 }),
    ],
    'choropleth horizontal thresholds': ['choropleth', choropleth({ title: 'Density', orientation: 'horizontal', width: 240, maxMin: true })],
    'choropleth horizontal ranges with no data': [
        'choropleth',
        choropleth({ title: 'Density', orientation: 'horizontal', labelType: 'ranges', width: 240, noData: true, noDataText: 'No data' }),
    ],
    'choropleth with subtitle': ['choropleth', choropleth({ title: 'Density', subtitle: 'people per km2', maxMin: true })],
    'categorical': [
        'categorical',
        `m.nutsLevel(2).stat(${stat}).classToFillStyle({ 10: 'red', 20: 'blue', 30: 'green' }).classToText({ 10: 'A', 20: 'B', 30: 'C' }).legend({ title: 'Classes' })`,
    ],
    'proportional symbols with a colour legend': [
        'proportionalSymbol',
        `m.nutsLevel(2).stat('size', ${stat}).stat('color', ${stat}).psClasses(3).legend({ title: 'Size', colorLegend: { title: 'Colour', noData: true, noDataText: 'No data' } })`,
    ],
}
const FLOW = `m.nutsLevel(0).flowGraph({ nodes: [{ id: 'FR' }, { id: 'DE' }], links: [{ source: 'FR', target: 'DE', value: 10 }] })
    .flowSettings({ color: () => '#c00' }).legend({ flowColorLegend: { title: 'Corridor type', items: [{ label: 'Domestic', color: '#256982' }, { label: 'Cross-border', color: '#a14927' }, { label: 'Other', color: '#999' }] } })`

// ---------------------------------------------------------------- in-page fingerprint
function fingerprint() {
    const half = (n) => Math.round(n * 2) / 2
    const legend = document.querySelector('#map .em-legend')
    if (!legend) return null
    const origin = legend.getBoundingClientRect()
    const out = []
    legend.querySelectorAll('rect, line, text, path, circle').forEach((el) => {
        if (el.matches('.em-legend-background')) return
        const cls = el.getAttribute('class') || ''
        if (el.closest('.em-legend-divergence-container')) return out.push(`${el.tagName} ${cls} (divergence)`)
        if (el.tagName === 'text') {
            const a = (n) => el.getAttribute(n) ?? ''
            return out.push(`text ${cls} "${el.textContent.trim()}" x=${a('x')} y=${a('y')} dy=${a('dy')} anchor=${a('text-anchor')}`)
        }
        const b = el.getBoundingClientRect()
        out.push(`${el.tagName} ${cls} ${half(b.left - origin.left)},${half(b.top - origin.top)} ${half(b.width)}x${half(b.height)}`)
    })
    return out
}

// ---------------------------------------------------------------- runner
async function render(browser, type, setup) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await routeFixtures(page, { root: ROOT, bundleDir })
    await page.goto(ORIGIN + '/')
    await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
    await page.evaluate(
        ({ type, setup, origin }) => {
            const m = window.eurostatmap.map(type).svgId('map').width(800).nuts2jsonBaseURL(origin + '/nuts2json/v2')
            new Function('m', setup)(m)
            m.build()
        },
        { type, setup, origin: ORIGIN }
    )
    await page.waitForSelector('#map .em-legend text', { timeout: 15000 })
    await page.waitForTimeout(400)
    return { page, errors }
}

const browser = await chromium.launch({ headless: true })
let failures = 0
try {
    const results = {}
    for (const [name, [type, setup]] of Object.entries(SCENARIOS)) {
        const { page, errors } = await render(browser, type, setup)
        results[name] = await page.evaluate(fingerprint)
        await page.close()
        assert.deepEqual(errors, [], `${name}: page errors`)
    }

    if (CAPTURE) {
        fs.writeFileSync(BASELINE, JSON.stringify(results, null, 1) + '\n')
        console.log(`captured ${Object.keys(results).length} legends -> ${path.relative(ROOT, BASELINE)}`)
    } else {
        const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
        for (const name of Object.keys(SCENARIOS)) {
            try {
                assert.ok(results[name]?.length, 'legend did not render')
                assert.deepEqual(results[name], baseline[name])
                console.log(`  ok   ${name}`)
            } catch (e) {
                failures++
                console.error(`  FAIL ${name}\n${e.message.split('\n').slice(0, 14).join('\n')}`)
            }
        }
    }

    // flow colour legend: swatches are contiguous, like the choropleth legend
    const { page, errors } = await render(browser, 'flow', FLOW)
    const rects = await page.evaluate(() =>
        [...document.querySelectorAll('#map .em-flow-color-legend .em-legend-rect')].map((r) => [+r.getAttribute('y'), +r.getAttribute('height')])
    )
    await page.close()
    try {
        assert.deepEqual(errors, [])
        assert.equal(rects.length, 3)
        rects.slice(1).forEach(([y], i) => assert.equal(y, rects[i][0] + rects[i][1], 'flow colour swatches touch'))
        console.log('  ok   flow colour legend swatches are contiguous')
    } catch (e) {
        failures++
        console.error(`  FAIL flow colour legend: ${e.message}`)
    }
} finally {
    await browser.close()
}
if (failures) {
    console.error(`${failures} legend layout check(s) failed`)
    process.exit(1)
}
