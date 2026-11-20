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
            buildMap('top-origin', { lineType: 'straight', arrows: true, nodes: true, topLocations: 1, topLocationsType: 'origin' })
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

        const straightRoute = page.locator('#top-origin .em-flow-link').first()
        const markerId = (await straightRoute.getAttribute('marker-end')).slice(5, -1)
        assert.equal(await page.locator('#' + markerId).getAttribute('refX'), '0')
    } finally {
        await browser.close()
    }
})

test('parallel flows use independent directional widths and clear proportional internal-traffic circles', async () => {
    const browser = await chromium.launch()
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
        await page.route('**/WORLD_4326.json', (route) => route.fulfill({ path: fileURLToPath(world) }))
        await page.setContent('<svg id="map"></svg>')
        await page.addScriptTag({ path: fileURLToPath(bundle) })
        await page.evaluate(() => {
            window.flowMap = eurostatmap
                .map('flow')
                .geo('WORLD')
                .proj('4326')
                .worldTopojsonURL('https://map.test/WORLD_4326.json')
                .width(1000)
                .height(650)
                .insets(false)
                .flowGraph({
                    nodes: [
                        { id: 'FR', x: 2, y: 45 },
                        { id: 'DE', x: 10, y: 52 },
                        { id: 'ES', x: -6, y: 40 },
                    ],
                    links: [
                        { source: { id: 'FR' }, target: { id: 'DE' }, value: 70, kind: 'cross-border' },
                        { source: 'FR', target: 'DE', value: 30 },
                        { source: 'DE', target: 'FR', value: 50 },
                        { source: 'ES', target: 'FR', value: 25 },
                        { source: 'FR', target: 'FR', value: 40000 },
                        { source: 'DE', target: 'DE', value: 10000 },
                    ],
                })
                .flowSettings({
                    lineType: 'straight',
                    bidirectionalLayout: 'parallel',
                    arrows: true,
                    color: (link) => (link.kind === 'cross-border' ? '#345' : '#876'),
                    maxWidth: 12,
                    nodes: true,
                    nodeType: 'circle',
                    nodeSizeBy: 'internal',
                    nodeSizeScale: (value) => Math.sqrt(value) / 20,
                })
                .build()
        })

        const forward = page.locator('.em-flow-link-parallel[data-origin="FR"]')
        const reverse = page.locator('.em-flow-link-parallel[data-origin="DE"]')
        await forward.waitFor()
        assert.equal(await forward.getAttribute('data-nb'), '100')
        assert.equal(await reverse.getAttribute('data-nb'), '50')
        assert.equal(await forward.getAttribute('fill'), '#345')
        assert.equal(await reverse.getAttribute('fill'), '#876')
        assert.equal(await forward.evaluate((path) => path.__data__.width), 12)
        assert.equal(await reverse.evaluate((path) => path.__data__.width), 6)
        assert.equal(await page.locator('line.em-flow-link[data-origin="ES"]').count(), 1)
        assert.equal(await page.locator('.em-flow-link').count(), 3)
        assert.deepEqual(await page.locator('.em-node-circle').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('r'))), ['10', '5'])

        const geometry = await forward.evaluate((path) => {
            const { x1, y1, x2, y2, nodeA, nodeB, originId } = path.__data__
            const [origin, destination] = nodeA.id === originId ? [nodeA, nodeB] : [nodeB, nodeA]
            return {
                d: path.getAttribute('d'),
                start: Math.hypot(x1 - origin.x, y1 - origin.y),
                end: Math.hypot(x2 - destination.x, y2 - destination.y),
            }
        })
        assert.ok(Math.abs(geometry.start - 11) < 0.0001)
        assert.ok(Math.abs(geometry.end - 6) < 0.0001)
        await forward.dispatchEvent('mouseover')
        assert.equal(await forward.getAttribute('fill'), await page.evaluate(() => window.flowMap.hoverColor() || 'black'))
        await forward.dispatchEvent('mouseout')
        assert.equal(await forward.getAttribute('fill'), await forward.getAttribute('data-color'))

        await page.evaluate(() => window.flowMap.updateStatValues())
        assert.equal(await forward.getAttribute('d'), geometry.d)
        await page.evaluate(() => window.flowMap.flowSettings({ bidirectionalLayout: 'midpoint' }).updateStatValues())
        assert.equal(await page.locator('.em-flow-link-parallel').count(), 0)
        assert.equal(await page.locator('line.em-flow-link[data-origin="FR"][data-dest="DE"]').count(), 1)
    } finally {
        await browser.close()
    }
})
