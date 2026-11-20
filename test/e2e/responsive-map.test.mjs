import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const bundle = fileURLToPath(new URL('../../build/eurostatmap.js', import.meta.url))
const world = fileURLToPath(new URL('../../src/assets/topojson/WORLD_4326.json', import.meta.url))

test('responsive maps scale their display without changing their layout or exports', async () => {
    const browser = await chromium.launch()
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, acceptDownloads: true })
        await page.route('**/WORLD_4326.json', (route) => route.fulfill({ path: world }))
        await page.setContent('<div id="host" style="width: 400px"><svg id="map"></svg></div>')
        await page.addScriptTag({ path: bundle })
        await page.evaluate(() => {
            window.map = eurostatmap
                .map('flow', { responsive: true })
                .svgId('map')
                .geo('WORLD')
                .proj('4326')
                .worldTopojsonURL('https://map.test/WORLD_4326.json')
                .width(800)
                .height(500)
                .header(true)
                .title('Responsive map')
                .insets(false)
                .flowGraph({
                    nodes: [{ id: 'FR', x: 2, y: 45 }, { id: 'DE', x: 10, y: 52 }],
                    links: [{ source: 'FR', target: 'DE', value: 400 }],
                })
                .flowSettings({ arrows: false, color: () => '#369' })
                .legend({ flowColorLegend: { items: [{ label: 'Route', color: '#369' }] } })
                .build()
        })
        const svg = page.locator('#map')
        const swatch = svg.locator('.em-flow-color-legend .em-legend-rect')
        await swatch.waitFor()
        await page.waitForTimeout(100)

        const dimensions = async () => svg.evaluate((el) => ({
            width: el.getAttribute('width'),
            height: el.getAttribute('height'),
            viewBox: el.getAttribute('viewBox'),
            renderedWidth: el.getBoundingClientRect().width,
            renderedHeight: el.getBoundingClientRect().height,
        }))
        const before = await dimensions()
        assert.equal(before.renderedWidth, 400)
        assert.equal(before.viewBox, `0 0 ${before.width} ${before.height}`)
        assert.ok(Math.abs(before.renderedHeight / before.renderedWidth - Number(before.height) / Number(before.width)) < 0.001)

        async function exportFile(format) {
            const download = page.waitForEvent('download')
            await page.evaluate((kind) => {
                if (kind === 'svg') window.map.exportMapToSVG('map')
                else window.map.exportMapToPNG(undefined, undefined, 'map')
            }, format)
            return readFile(await (await download).path())
        }

        const svgBefore = await exportFile('svg')
        const pngBefore = await exportFile('png')
        await page.locator('#host').evaluate((host) => { host.style.width = '800px' })
        const after = await dimensions()
        assert.equal(after.renderedWidth, 800)
        assert.equal(after.renderedHeight, before.renderedHeight * 2)
        assert.equal(after.viewBox, before.viewBox)
        assert.equal(after.width, before.width)
        assert.equal(after.height, before.height)
        assert.deepEqual(await exportFile('svg'), svgBefore)
        assert.deepEqual(await exportFile('png'), pngBefore)

        await page.locator('#host').evaluate((host) => { host.style.width = '1200px' })
        assert.equal((await dimensions()).renderedWidth, 800)
        await swatch.hover()
        assert.equal(await svg.locator('.em-flow-link.highlighted').count(), 1)
        await page.locator('#host').evaluate((host) => { host.style.width = '300px' })
        assert.equal((await dimensions()).renderedWidth, 300)
        await page.evaluate(() => window.map.responsive(false))
        assert.equal((await dimensions()).renderedWidth, 800)
        assert.equal(await svg.getAttribute('viewBox'), null)
        await page.evaluate(() => window.map.responsive(true))
        assert.equal((await dimensions()).renderedWidth, 300)
        assert.equal(await svg.getAttribute('viewBox'), before.viewBox)
    } finally {
        await browser.close()
    }
})

test('responsive sizing leaves nested IMAGE-style SVG maps and existing viewBoxes alone', async () => {
    const browser = await chromium.launch()
    try {
        const page = await browser.newPage()
        await page.setContent('<svg id="outer" width="797" viewBox="0 0 797 797"><g id="nested"></g></svg><svg id="custom" viewBox="0 0 1000 500"></svg>')
        await page.addScriptTag({ path: bundle })
        const result = await page.evaluate(() => {
            const nested = eurostatmap.map('choropleth', { svgId: 'nested', responsive: true, width: 797, height: 625 })
            nested.buildMapTemplateBase()
            const custom = eurostatmap.map('choropleth', { svgId: 'custom', responsive: true, width: 800, height: 400 })
            custom.buildMapTemplateBase()
            custom.responsive(false)
            return {
                outer: document.querySelector('#outer').getAttribute('viewBox'),
                nested: document.querySelector('#nested').getAttribute('viewBox'),
                custom: document.querySelector('#custom').getAttribute('viewBox'),
            }
        })

        assert.deepEqual(result, { outer: '0 0 797 797', nested: null, custom: '0 0 1000 500' })
    } finally {
        await browser.close()
    }
})

test('a responsive map scales down to fit but does not grow beyond its configured size', async () => {
    const browser = await chromium.launch()
    try {
        const page = await browser.newPage({ viewport: { width: 600, height: 900 } })
        await page.setContent('<style>body { margin: 0 }</style><div><svg id="map"></svg></div>')
        await page.addScriptTag({ path: bundle })
        await page.evaluate(() => {
            const map = eurostatmap.map('choropleth', {
                insetsVisibilityBreakpoint: 0,
                insets: [{ geo: 'WORLD', proj: '4326', svgId: 'test-inset', width: 100, height: 80 }],
            })
            if (!map.responsive()) throw new Error('responsive sizing should be enabled by default')
            map.buildMapTemplateBase()
        })
        const svg = page.locator('#map')
        const inset = page.locator('#test-inset')
        assert.equal((await svg.boundingBox()).width, 600)
        const insetWidth = (await inset.boundingBox()).width
        assert.ok(insetWidth > 100)
        assert.equal(await svg.getAttribute('width'), '600')
        await page.setViewportSize({ width: 1100, height: 900 })
        assert.equal((await svg.boundingBox()).width, 600)
        assert.ok(Math.abs((await inset.boundingBox()).width / insetWidth - 1) < 0.001)
        assert.equal(await inset.getAttribute('width'), '100')
        assert.equal(await svg.getAttribute('width'), '600')
        await page.setViewportSize({ width: 350, height: 900 })
        assert.equal((await svg.boundingBox()).width, 350)
        await page.setViewportSize({ width: 1100, height: 900 })
        assert.equal((await svg.boundingBox()).width, 600)

        const fixed = await page.evaluate(() => {
            const map = eurostatmap.map('choropleth', { svgId: 'fixed', width: 800, height: 500, responsive: false, insets: false })
            map.buildMapTemplateBase()
            const svg = document.querySelector('#fixed')
            return { responsive: map.responsive(), wrapperClass: svg.parentElement.className, renderedWidth: svg.getBoundingClientRect().width }
        })
        assert.deepEqual(fixed, { responsive: false, wrapperClass: 'em-map-wrapper', renderedWidth: 800 })
    } finally {
        await browser.close()
    }
})
