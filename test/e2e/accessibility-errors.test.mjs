// Accessibility (names, keyboard access, reduced motion) and error reporting, in a real browser on offline fixtures.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { ORIGIN, routeFixtures } from '../helpers/synthetic-nuts.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')

let browser
test.before(async () => (browser = await chromium.launch()))
test.after(async () => browser.close())

/** A page with the bundle loaded and `makeMap()` returning a choropleth on the fixtures. */
async function open({ route, reducedMotion } = {}) {
    const page = await browser.newPage({ reducedMotion })
    const warnings = []
    const errors = []
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await routeFixtures(page, { root: ROOT, bodyHtml: '<button id="before">before</button><div style="width:700px"><svg id="map"></svg></div>' })
    if (route) await page.route(route[0], route[1])
    await page.goto(ORIGIN + '/')
    await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
    await page.evaluate((origin) => {
        window.makeMap = () =>
            window.eurostatmap
                .map('choropleth')
                .width(600)
                .height(500)
                .nutsLevel(0)
                .nuts2jsonBaseURL(origin + '/nuts2json/v2')
                .stat({ eurostatDatasetCode: 'demo_r_d3dens', filters: { time: '2021' } })
        window.errorsSeen = []
        window.built = (map) => new Promise((resolve) => map.onBuild(() => setTimeout(resolve, 700)).build())
    }, ORIGIN)
    return { page, warnings, errors }
}

test('the map has an accessible name and description that follow its settings', async () => {
    const { page, errors } = await open()
    const result = await page.evaluate(async () => {
        const map = window.makeMap().title('Density <tspan>2021</tspan>').subtitle('People per km2').ariaDescription('Highest in the west.')
        await window.built(map)
        const svg = document.querySelector('#map')
        const read = () => ({ role: svg.getAttribute('role'), label: svg.getAttribute('aria-label'), desc: [...svg.querySelectorAll(':scope > desc')].map((d) => d.textContent), titles: svg.querySelectorAll(':scope > title').length })
        const first = read()
        map.ariaLabel('My map').ariaDescription('New text.')
        return { first, second: read(), duration: map.transitionDuration() }
    })
    assert.deepEqual(result.first, { role: 'group', label: 'Density 2021. People per km2', desc: ['Highest in the west.'], titles: 0 })
    assert.deepEqual(result.second, { role: 'group', label: 'My map', desc: ['New text.'], titles: 0 })
    assert.equal(result.duration, 500)
    assert.deepEqual(errors, [])
    await page.close()
})

test("a page's own label on the svg is left alone, and reduced motion removes transitions", async () => {
    const { page } = await open({ reducedMotion: 'reduce' })
    const result = await page.evaluate(async () => {
        document.querySelector('#map').setAttribute('aria-label', 'Written by the page')
        const map = window.makeMap().title('Title')
        await window.built(map)
        return { label: document.querySelector('#map').getAttribute('aria-label'), duration: map.transitionDuration() }
    })
    assert.deepEqual(result, { label: 'Written by the page', duration: 0 })
    await page.close()
})

test('regions and buttons work from the keyboard', async () => {
    const { page, errors } = await open()
    await page.evaluate(async () => {
        window.map = window.makeMap().zoomButtons(true)
        await window.built(window.map)
    })
    const state = () =>
        page.evaluate(() => ({
            focused: [...document.querySelectorAll('.em-keyboard-focus')].map((e) => e.__data__.properties.id),
            announced: document.querySelector('#em-announcer-map')?.textContent ?? '',
            tooltipOpacity: document.querySelector('.em-tooltip') && getComputedStyle(document.querySelector('.em-tooltip')).opacity,
        }))

    await page.focus('#before')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'em-drawing-map')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100) // the tooltip fades in with a (zero length) transition
    const first = await state()
    assert.deepEqual(first.focused, ['DE'])
    assert.match(first.announced, /DE.*\d/)
    assert.equal(first.tooltipOpacity, '1')
    await page.keyboard.press('ArrowRight')
    assert.deepEqual((await state()).focused, ['FR'])
    await page.keyboard.press('ArrowLeft')
    assert.deepEqual((await state()).focused, ['DE'])
    await page.keyboard.press('End')
    assert.deepEqual((await state()).focused, ['UA']) // a neighbouring country has a tooltip too, as for the mouse
    await page.keyboard.press('PageDown')
    assert.deepEqual((await state()).focused, ['DE'])
    await page.keyboard.press('Escape')
    const gone = await state()
    assert.deepEqual(gone.focused, [])

    // the next tab stops are the zoom buttons: Enter zooms
    const zoom = () => page.evaluate(() => document.querySelector('#em-zoom-group-map').getAttribute('transform') || '')
    const before = await zoom()
    await page.focus('.em-zoom-in')
    assert.equal(await page.getAttribute('.em-zoom-in', 'role'), 'button')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    assert.notEqual(await zoom(), before)

    await page.evaluate(() => window.map.keyboardNavigation(false))
    assert.equal(await page.getAttribute('#em-drawing-map', 'tabindex'), null)
    assert.deepEqual(errors, [])
    await page.close()
})

/** Focuses a group and presses the keys, returning what was announced and highlighted after each. */
async function walk(page, selector, keys) {
    await page.focus(selector)
    const steps = []
    for (const key of keys) {
        await page.keyboard.press(key)
        await page.waitForTimeout(100)
        steps.push(
            await page.evaluate(() => ({
                said: document.querySelector('#em-announcer-map')?.textContent,
                focused: document.querySelectorAll('.em-keyboard-focus').length,
                dimmed: new Set([...document.querySelectorAll('#em-nutsrg path[ecl]')].map((p) => getComputedStyle(p).fill)).size,
            }))
        )
    }
    return steps
}

test('a legend is one tab stop whose arrow keys highlight the map as hovering does', async () => {
    const { page, errors } = await open()
    await page.evaluate(async () => {
        window.map = window.makeMap().numberOfClasses(3).legend({ title: 'Density' })
        await window.built(window.map)
    })
    const legend = '.em-legend[tabindex]'
    assert.match(await page.getAttribute(legend, 'aria-label'), /^Legend: Density .*arrow keys/)
    const fills = () => page.evaluate(() => [...document.querySelectorAll('#em-nutsrg path')].map((p) => getComputedStyle(p).fill))
    const before = await fills()
    const [first, second, escaped] = await walk(page, legend, ['ArrowDown', 'ArrowDown', 'Escape'])
    assert.equal(first.focused, 1)
    assert.equal(first.dimmed, 2, 'one class keeps its colour and the others are dimmed')
    assert.ok(first.said && second.said && first.said !== second.said, `announced "${first.said}" then "${second.said}"`)
    assert.equal(escaped.focused, 0)
    assert.deepEqual(await fills(), before, 'leaving restores the map')

    // a redrawn legend keeps its tab stop; keyboardNavigation(false) removes it
    await page.evaluate(() => window.map.legend({ title: 'New title' }))
    await page.waitForTimeout(300)
    assert.match(await page.getAttribute('.em-legend[tabindex]', 'aria-label'), /New title/)
    await page.evaluate(() => window.map.keyboardNavigation(false))
    assert.equal(await page.$('.em-legend[tabindex]'), null)
    assert.deepEqual(errors, [])
    await page.close()
})

test('a flow map can be walked through its places and flows', async () => {
    const { page, errors } = await open()
    await page.evaluate(
        (origin) =>
            new Promise((resolve) => {
                window.eurostatmap
                    .map('flow')
                    .width(600)
                    .height(500)
                    .nutsLevel(0)
                    .nuts2jsonBaseURL(origin + '/nuts2json/v2')
                    .flowGraph({
                        nodes: [{ id: 'FR' }, { id: 'DE' }, { id: 'RS' }],
                        links: [
                            { source: 'RS', target: 'FR', value: 20 },
                            { source: 'FR', target: 'DE', value: 80 },
                        ],
                    })
                    .flowSettings({ nodes: true, lineType: 'straight' })
                    .onBuild(() => setTimeout(resolve, 700))
                    .build()
            }),
        ORIGIN
    )
    const steps = await walk(page, '#em-drawing-map', ['ArrowRight', 'PageDown', 'ArrowRight', 'Escape'])
    assert.match(steps[0].said, /Incoming/) // a place
    assert.match(steps[1].said, /FR.*DE.*80/) // Page Down: the flows, the largest first
    assert.match(steps[2].said, /RS.*FR.*20/)
    assert.equal(steps[3].focused, 0)
    assert.deepEqual(errors, [])
    await page.close()
})

test('an svg id that matches no element is warned about', async () => {
    const { page, warnings } = await open()
    await page.evaluate(() => window.makeMap().svgId('mapp').build())
    await page.waitForTimeout(500)
    assert.ok(warnings.some((w) => /No element with the id "mapp"/.test(w)), warnings.join('\n'))
    await page.close()
})

// An automated audit finds only part of the WCAG failures: it does not replace testing with a screen reader.
test('axe finds no WCAG A or AA violation on maps with legends and buttons', async () => {
    const axe = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8')
    const stat = { eurostatDatasetCode: 'x', filters: { time: '2021' } }
    const composition = { ...stat, categoryParameter: 'c', categoryCodes: ['A', 'B'], categoryLabels: ['Ay', 'Bee'], categoryColors: ['#a00', '#00a'] }
    const maps = [
        ['choropleth', [['default', stat]]],
        ['proportionalSymbol', [['size', stat]]],
        ['bivariateChoropleth', [['v1', stat], ['v2', stat]]],
        ['trivariateChoropleth', [['v1', stat], ['v2', stat], ['v3', stat]]],
        ['pie', [['default', composition]]],
        ['sparkline', [['default', { eurostatDatasetCode: 'x', filters: {}, dates: ['2020', '2021'] }]]],
    ]
    for (const [type, stats] of maps) {
        const { page, errors } = await open()
        await page.setContent('<!doctype html><html lang="en"><head><title>Map</title></head><body><main><h1>Map</h1><svg id="map"></svg></main></body></html>')
        await page.addScriptTag({ url: ORIGIN + '/build/eurostatmap.js' })
        await page.evaluate(
            async ({ type, stats, origin }) => {
                const map = window.eurostatmap.map(type).width(800).height(600).nutsLevel(0).nuts2jsonBaseURL(origin + '/nuts2json/v2')
                stats.forEach(([key, config]) => map.stat(key, config))
                map.title('Title').zoomButtons(true).legendButton(true).legend({}).build()
                await new Promise((r) => setTimeout(r, 2000))
            },
            { type, stats, origin: ORIGIN }
        )
        await page.addScriptTag({ content: axe })
        const violations = await page.evaluate(async () =>
            (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations.map(
                (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')} ${v.help}`
            )
        )
        assert.deepEqual(violations, [], type)
        assert.deepEqual(errors, [], type)
        await page.close()
    }
})

test('a failed statistics request is reported to onError', async () => {
    const { page, errors } = await open({ route: ['**/dissemination/**', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: [{ label: 'unknown dataset' }] }) })] })
    const seen = await page.evaluate(
        () =>
            new Promise((resolve) => {
                window.makeMap()
                    .onError((error, map) => resolve({ type: error.type, statKey: error.statKey, message: error.message, hasMap: typeof map.build === 'function' }))
                    .build()
            })
    )
    assert.deepEqual(seen, { type: 'data', statKey: 'default', message: 'Eurostat API request failed: unknown dataset', hasMap: true })
    assert.deepEqual(errors, [])
    await page.close()
})

test('failed boundary data shows a message, calls onError, and a later build removes it', async () => {
    let fail = true
    const { page } = await open({ route: ['**/nuts2json/**', (r) => (fail ? r.fulfill({ status: 500, body: 'x' }) : r.fallback())] })
    const seen = await page.evaluate(async () => {
        window.map = window.makeMap().onError((error) => window.errorsSeen.push(error.type))
        window.map.build()
        await new Promise((r) => setTimeout(r, 1500))
        return { types: window.errorsSeen, message: document.querySelector('#map .em-load-error')?.textContent }
    })
    assert.deepEqual(seen.types, ['geometry'])
    assert.match(seen.message, /could not be loaded/)

    fail = false
    const after = await page.evaluate(async () => {
        await window.built(window.map)
        return { message: !!document.querySelector('#map .em-load-error'), regions: document.querySelectorAll('#em-nutsrg path').length }
    })
    assert.deepEqual(after, { message: false, regions: 3 })
    await page.close()
})

test('an unknown classification method and a misspelt legend option are warned about, and the map still draws', async () => {
    const { page, warnings, errors } = await open()
    const classes = await page.evaluate(async () => {
        const map = window.makeMap().classificationMethod('quantil').numberOfClasses(3).legend({ titel: 'x' })
        await window.built(map)
        return [...new Set([...document.querySelectorAll('#em-nutsrg path')].map((p) => p.getAttribute('ecl')))].sort()
    })
    assert.deepEqual(classes, ['0', '1', '2'])
    assert.ok(warnings.some((w) => /Unknown classification method "quantil"/.test(w)), warnings.join('\n'))
    assert.ok(warnings.some((w) => /"legend\.titel": did you mean "title"/.test(w)), warnings.join('\n'))
    assert.deepEqual(errors, [])
    await page.close()
})
