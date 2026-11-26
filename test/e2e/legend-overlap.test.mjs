// No legend may draw one thing over another, whatever the map type. Every legend type is rendered under stress (long
// titles, no title padding, no margin between its parts, large symbols, narrow bars) and checked:
//   - no two labels overlap;
//   - no two parts of the legend (titles, size legend, colour legend, no-data and pattern items) overlap.
// The flow legends are checked piece by piece in flow-legend-overlap.test.mjs.
//
// Renders in headless Chromium against the built dev bundle, fully offline (see test/helpers/synthetic-nuts.mjs).
//
// Usage: node --test test/e2e/legend-overlap.test.mjs
import assert from 'node:assert/strict'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { ORIGIN, routeFixtures } from '../helpers/synthetic-nuts.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const st = `{ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'inhabitants per square kilometre', filters: { time: '2021' } }`
const st2 = `{ eurostatDatasetCode: 'x', filters: { time: '2021' } }`
const comp = `{ eurostatDatasetCode: 'apro_mt_ls_r', filters: { time: '2021' }, categoryParameter: 'animals', categoryCodes: ['A2000', 'A3100', 'A4100'], categoryLabels: ['Bovine animals, all ages', 'Pigs', 'Sheep'], categoryColors: ['#0060FA', '#E04040', '#40A040'] }`
const LONG = 'A rather long legend title for stress'
const base = (extra) => `m.nutsLevel(2)${extra}`
const ch = (legend) => base(`.stat(${st}).numberOfClasses(5).legend(${JSON.stringify(legend)})`)
const composition = (legend) =>
    base(`.stat('composition', ${comp}).encoding('composition', { stat: 'composition' }).legend(${JSON.stringify(legend)})`)
const symbols = (legend, settings = '{}') =>
    base(`.stat('size', ${st}).stat('color', ${st2}).psSettings(${settings}).psClasses(4).legend(${JSON.stringify(legend)})`)
const two = (legend) => base(`.stat('v1', ${st}).stat('v2', ${st2}).legend(${JSON.stringify(legend)})`)
const tight = { titlePadding: 0, marginTop: 0 }

// name -> [map type, builder snippet (`m` is the map)]
const SCENARIOS = {
    'choropleth with subtitle': ['choropleth', ch({ title: LONG, subtitle: 'a subtitle' })],
    'choropleth, short swatches': ['choropleth', ch({ title: 'T', titlePadding: 0, maxMin: true, noData: true, shapeHeight: 8 })],
    'choropleth ranges, short swatches': ['choropleth', ch({ title: 'T', labelType: 'ranges', titlePadding: 0, shapeHeight: 8 })],
    'choropleth diverging': ['choropleth', ch({ title: 'T', pointOfDivergence: 2, pointOfDivergenceLabel: 'EU average value', maxMin: true })],
    'choropleth horizontal with long bounds': [
        'choropleth',
        ch({ title: LONG, orientation: 'horizontal', width: 150, maxMin: true, maxMinLabels: [' lowest value', ' highest value'] }),
    ],
    'choropleth horizontal ranges, narrow': [
        'choropleth',
        ch({ title: 'T', orientation: 'horizontal', labelType: 'ranges', width: 150, noData: true }),
    ],
    'choropleth horizontal diverging': [
        'choropleth',
        ch({ title: 'T', orientation: 'horizontal', width: 150, pointOfDivergence: 2, pointOfDivergenceLabel: 'EU average value', titlePadding: 0 }),
    ],
    continuous: ['choropleth', base(`.stat(${st}).colorSchemeType('continuous').legend({ title: 'T', titlePadding: 0, noData: true, width: 100 })`)],
    'continuous vertical': [
        'choropleth',
        base(`.stat(${st}).colorSchemeType('continuous').legend({ title: 'T', orientation: 'vertical', ticks: 8, height: 90 })`),
    ],
    histogram: ['choropleth', base(`.stat(${st}).legend({ title: '${LONG}', histogram: true })`)],
    'histogram vertical': ['choropleth', base(`.stat(${st}).legend({ title: 'T', histogram: { orientation: 'vertical' }, titlePadding: 0 })`)],
    categorical: [
        'categorical',
        base(
            `.stat(${st}).classToFillStyle({ 10: 'red', 20: 'blue', 30: 'green' }).classToText({ 10: 'A', 20: 'B', 30: 'C' }).legend({ title: '${LONG}', titlePadding: 0, shapeHeight: 4, shapePadding: 0 })`
        ),
    ],
    'pattern fill': [
        'choropleth',
        base(
            `.stat(${st}).patternFill([{ pattern: 'hatching', regionIds: ['FR'], legendLabel: 'Hatched' }]).legend({ title: '${LONG}', titlePadding: 0 })`
        ),
    ],
    'proportional circles of similar size': [
        'proportionalSymbol',
        symbols(
            { sizeLegend: { title: 'Size', titlePadding: 0, values: [100, 90, 80, 10] }, colorLegend: { title: 'Colour', noData: true, ...tight } },
            '{ maxSize: 40 }'
        ),
    ],
    'proportional squares': [
        'proportionalSymbol',
        symbols({ sizeLegend: { title: 'Size', titlePadding: 0 }, colorLegend: tight }, "{ shape: 'square', maxSize: 50 }"),
    ],
    'proportional bars': [
        'proportionalSymbol',
        symbols({ sizeLegend: { title: 'Size', titlePadding: 0 }, colorLegend: tight }, "{ shape: 'bar', maxSize: 60 }"),
    ],
    'proportional spikes': [
        'proportionalSymbol',
        symbols({ sizeLegend: { title: 'Size', titlePadding: 0 }, colorLegend: tight }, "{ shape: 'spike', maxSize: 60 }"),
    ],
    'proportional stars': [
        'proportionalSymbol',
        symbols({ sizeLegend: { title: 'Size', titlePadding: 0 }, colorLegend: tight }, "{ shape: 'star', maxSize: 40 }"),
    ],
    'proportional horizontal colour': ['proportionalSymbol', symbols({ colorLegend: { title: 'Colour', orientation: 'horizontal', width: 120 } })],
    pie: [
        'pieChart',
        composition({
            title: LONG,
            sizeLegend: { title: 'Total population size', titlePadding: 0 },
            colorLegend: { title: 'Types of animal', ...tight },
        }),
    ],
    coxcomb: [
        'coxcomb',
        base(
            `.statCoxcomb({ eurostatDatasetCode: 'tour_occ_nim', filters: {}, categoryParameter: 'c_resid', categoryCodes: ['DOM', 'FOR'], categoryLabels: ['Domestic', 'Foreign'], categoryColors: ['#1b9e77', '#d95f02'], timeParameter: 'time', times: ['2019', '2020', '2021'], timeLabels: ['2019', '2020', '2021'] }).legend({ title: '${LONG}', sizeLegend: { title: 'Total', titlePadding: 0 }, colorLegend: { title: 'Type', titlePadding: 0, marginTop: 0 }, timeLegend: { title: 'Year', titlePadding: 0, marginTop: 0 } })`
        ),
    ],
    waffle: ['waffle', composition({ title: LONG, sizeLegend: { title: 'Total size', titlePadding: 0 }, colorLegend: { title: 'Type', ...tight } })],
    'bar composition': ['bar', composition({ title: LONG, colorLegend: { title: 'Type', ...tight }, widthLegend: { title: 'Width', ...tight } })],
    stripes: ['stripeComposition', composition({ title: LONG, titlePadding: 0, colorLegend: { title: 'Type', titlePadding: 0 } })],
    sparklines: [
        'sparkline',
        base(
            `.statSpark({ eurostatDatasetCode: 'demo_r_d3dens', filters: {}, dates: ['2019', '2020', '2021'] }).legend({ title: '${LONG}', titlePadding: 0 })`
        ),
    ],
    mushroom: ['mushroom', two({ title: LONG, sizeLegend: { title: 'Size', titlePadding: 0 }, colorLegend: { title: 'Colour', ...tight } })],
    'sub-legends switched off': ['pieChart', composition({ title: LONG, sizeLegend: false })],
    bivariate: [
        'bivariateChoropleth',
        two({ title: LONG, label1: 'A long first variable', label2: 'A long second variable', titlePadding: 0, noData: true }),
    ],
    'trivariate, default size': [
        'trivariateChoropleth',
        base(`.stat('v1', ${st}).stat('v2', ${st2}).stat('v3', { eurostatDatasetCode: 'y', filters: { time: '2021' } }).legend({ title: '${LONG}', titlePadding: 0 })`),
    ],
    'value by alpha': ['valueByAlpha', base(`.stat('value', ${st}).stat('alpha', ${st2}).legend({ title: '${LONG}', titlePadding: 0 })`)],
}

/** Labels that overlap each other, and parts (groups directly inside the legend) that overlap each other. */
function overlaps() {
    const legend = document.querySelector('#map .em-legend')
    const rect = (el) => el.getBoundingClientRect()
    const shared = (a, b) => [Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)]
    const found = []
    const texts = [...legend.querySelectorAll('text')].filter(
        (t) => t.textContent.trim() && rect(t).width && getComputedStyle(t).visibility !== 'hidden'
    )
    for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
            // text boxes include the room for ascenders and descenders: neighbouring lines may share a few pixels of it
            // the box of a rotated axis title is far larger than its letters: its empty corners may hold a percentage
            const pair = [texts[i], texts[j]]
            if (pair.some((t) => t.matches('.em-ternary-axis-title')) && pair.some((t) => t.matches('.em-ternary-center-line-label'))) continue
            const [width, height] = shared(rect(texts[i]), rect(texts[j]))
            if (width > 1 && height > 5) found.push(`labels "${texts[i].textContent.trim()}" and "${texts[j].textContent.trim()}"`)
        }
    }
    // what each part draws (letters without their line spacing); a part is a child of the legend's root group
    const drawn = (part) => {
        const selector = 'text, rect, circle, ellipse, path, polygon, line'
        return [...(part.matches(selector) ? [part] : part.querySelectorAll(selector))]
            .filter((el) => !el.closest('defs, clipPath, marker') && !el.matches('.em-legend-background'))
            .map((el) => {
                const r = rect(el)
                const pad = el.tagName === 'text' ? r.height * 0.15 : 0
                return { left: r.left, right: r.right, top: r.top + pad, bottom: r.bottom - pad, width: r.width, height: r.height }
            })
            .filter((r) => r.width || r.height)
    }
    const root = legend.querySelector(':scope > rect.em-legend-background') ? legend : legend.querySelector(':scope > g') || legend
    const parts = [...root.children].filter((el) => el.tagName === 'g' || el.tagName === 'text')
    for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
            const hit = drawn(parts[i]).some((a) => drawn(parts[j]).some((b) => shared(a, b).every((size) => size > 1)))
            const name = (el) => el.getAttribute('class') || el.id || el.textContent.trim()
            if (hit) found.push(`parts "${name(parts[i])}" and "${name(parts[j])}"`)
        }
    }
    return { found, labels: texts.length }
}

let browser
before(async () => {
    browser = await chromium.launch()
})
after(() => browser?.close())

for (const [name, [type, setup]] of Object.entries(SCENARIOS)) {
    test(name, async () => {
        const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } })
        try {
            const errors = []
            page.on('pageerror', (error) => errors.push(error.message))
            await routeFixtures(page, { root: ROOT })
            await page.goto(ORIGIN + '/')
            await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
            await page.evaluate(
                ({ type, setup, origin }) => {
                    const m = window.eurostatmap
                        .map(type)
                        .svgId('map')
                        .width(800)
                        .height(1000)
                        .nuts2jsonBaseURL(origin + '/nuts2json/v2')
                    new Function('m', setup)(m)
                    m.build()
                },
                { type, setup, origin: ORIGIN }
            )
            await page.waitForSelector('#map .em-legend text', { timeout: 15000 })
            await page.waitForTimeout(500)
            const { found, labels } = await page.evaluate(overlaps)
            assert.ok(labels > 0, 'the legend has labels')
            assert.deepEqual(found, [])
            assert.deepEqual(errors, [])
        } finally {
            await page.close()
        }
    })
}
