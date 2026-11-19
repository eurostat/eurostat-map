import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const bundle = new URL('../../build/eurostatmap.js', import.meta.url)
const world = new URL('../../src/assets/topojson/WORLD_4326.json', import.meta.url)

test('flow colour legend highlights the matching routes on its own map', async () => {
    const browser = await chromium.launch()
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
        await page.route('**/WORLD_4326.json', (route) => route.fulfill({ path: fileURLToPath(world) }))
        await page.setContent('<svg id="by-color"></svg><svg id="by-key"></svg><svg id="top-origin"></svg>')
        await page.addScriptTag({ path: fileURLToPath(bundle) })
        await page.evaluate(() => {
            function buildMap(id, flowSettings, items) {
                eurostatmap
                    .map('flow')
                    .svgId(id)
                    .geo('WORLD')
                    .proj('4326')
                    .worldTopojsonURL('https://map.test/WORLD_4326.json')
                    .width(800)
                    .height(500)
                    .insets(false)
                    .flowGraph({
                        nodes: [
                            { id: 'FR', x: 2, y: 45 },
                            { id: 'DE', x: 10, y: 52 },
                            { id: 'US', x: -100, y: 40 },
                            { id: 'CA', x: -110, y: 52 },
                        ],
                        links: [
                            { source: 'FR', target: 'DE', value: 400 },
                            { source: 'US', target: 'CA', value: 100 },
                        ],
                    })
                    .flowSettings({ arrows: false, ...flowSettings })
                    .legend(items ? { flowColorLegend: { items } } : {})
                    .build()
            }

            buildMap('by-color', { lineType: 'curved', color: (link) => (link.value > 200 ? '#369' : '#a22') }, [
                { label: 'Higher', color: 'rgb(51, 102, 153)' },
                { label: 'Empty class', color: '#afa' },
            ])
            buildMap('by-key', { lineType: 'curved', color: () => '#369' }, [{ label: 'Germany', color: '#369', key: 'DE' }])
            buildMap('top-origin', { lineType: 'straight', nodes: true, topLocations: 1, topLocationsType: 'origin' })
        })

        for (const [id, rows] of [
            ['by-color', [['data-dest', 'DE'], null]],
            ['by-key', [['data-dest', 'DE']]],
            [
                'top-origin',
                [
                    ['data-color-key', 'FR'],
                    ['data-color-key', 'Other'],
                ],
            ],
        ]) {
            const map = page.locator('#' + id)
            const swatches = map.locator('.em-flow-color-legend .em-legend-rect')
            await swatches.first().waitFor()
            assert.equal(await swatches.count(), rows.length)
            for (const [i, expected] of rows.entries()) {
                await swatches.nth(i).hover()
                const highlighted = map.locator('.em-flow-link.highlighted')
                assert.equal(await highlighted.count(), expected ? 1 : 0)
                assert.equal(await map.locator('.em-flow-link.dimmed').count(), expected ? 1 : 0)
                if (expected) assert.equal(await highlighted.getAttribute(expected[0]), expected[1])
                assert.equal(await page.locator('.em-flow-link.highlighted').count(), expected ? 1 : 0)
                assert.equal(await page.locator('.em-flow-link.dimmed').count(), expected ? 1 : 0)
                await page.mouse.move(0, 0)
                assert.equal(await page.locator('.em-flow-link.highlighted, .em-flow-link.dimmed').count(), 0)
            }
        }
    } finally {
        await browser.close()
    }
})
