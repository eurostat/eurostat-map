// The flow legends must never draw one piece over another: the title over the labels, a label over a thick line, a
// label over its neighbour. Each legend is stacked from measured sizes (title, label rows, lines), so this has to
// hold whatever the title, the formatter, the line widths or the legend width are.
//
// Renders the legends in headless Chromium against the built dev bundle, offline (world geometry served from src/assets).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const bundle = new URL('../../build/eurostatmap.js', import.meta.url)
const world = new URL('../../src/assets/topojson/WORLD_4326.json', import.meta.url)

const SCENARIOS = {
    'horizontal width legend, thin and thick lines': { maxWidth: 4, flowWidthLegend: { title: 'Passengers', width: 180 } },
    'horizontal width legend, very thick lines': { maxWidth: 40, flowWidthLegend: { title: 'Passengers (line width)', width: 180 } },
    'horizontal width legend, a long title': { maxWidth: 16, flowWidthLegend: { title: 'Passengers carried in both directions, 2024', width: 180 } },
    'horizontal width legend, long labels in a narrow legend': {
        maxWidth: 16,
        flowWidthLegend: { title: 'Passengers', width: 120, segments: 6, longLabels: true },
    },
    'horizontal width legend, a small title padding': { maxWidth: 30, flowWidthLegend: { title: 'Passengers', titlePadding: 0, width: 180 } },
    'horizontal width legend with max/min captions': { maxWidth: 24, flowWidthLegend: { title: 'Passengers', width: 180, maxMin: true } },
    'vertical width legend, thin and thick lines': { maxWidth: 30, flowWidthLegend: { title: 'Passengers', orientation: 'vertical', segments: 5 } },
    'vertical width legend, a small title padding': {
        maxWidth: 30,
        flowWidthLegend: { title: 'Passengers', orientation: 'vertical', titlePadding: 0 },
    },
    'horizontal colour legend with thresholds and bounds': {
        flowColorLegend: {
            title: 'Share of seats that are empty',
            orientation: 'horizontal',
            width: 200,
            items: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#c00'].map((color) => ({ color })),
            thresholds: ['10%', '15%', '20%', '25%', '30%'],
            minLabel: '4%',
            maxLabel: '62%',
        },
    },
    'horizontal colour legend, long labels in a narrow bar': {
        flowColorLegend: {
            title: 'Class',
            orientation: 'horizontal',
            width: 120,
            items: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'].map((color) => ({ color })),
            thresholds: ['10 000', '15 000', '20 000', '25 000'],
            minLabel: '0 passengers',
            maxLabel: '30 000 passengers',
        },
    },
    'horizontal colour legend, a label per swatch': {
        flowColorLegend: {
            title: 'Type',
            orientation: 'horizontal',
            width: 150,
            items: [
                { label: 'Domestic', color: '#256982' },
                { label: 'International', color: '#a14927' },
                { label: 'Other', color: '#999' },
            ],
        },
    },
}

/** The pieces of the legend that are drawn: texts (bounding boxes) and the line strokes of the width legend. */
function collect(container) {
    const boxes = []
    for (const text of container.querySelectorAll('text')) {
        const box = text.getBBox()
        if (box.width && box.height) boxes.push({ kind: 'text', name: text.textContent, x: box.x, y: box.y, w: box.width, h: box.height })
    }
    for (const line of container.querySelectorAll('.em-flow-legend-lines line:not(.em-flow-legend-baseline), :scope > line')) {
        const width = parseFloat(line.style.strokeWidth || line.getAttribute('stroke-width') || '1')
        const y = (parseFloat(line.getAttribute('y1')) + parseFloat(line.getAttribute('y2'))) / 2
        const x1 = parseFloat(line.getAttribute('x1'))
        const x2 = parseFloat(line.getAttribute('x2'))
        boxes.push({ kind: 'line', name: 'line ' + width.toFixed(1) + 'px', x: Math.min(x1, x2), y: y - width / 2, w: Math.abs(x2 - x1), h: width })
    }
    return boxes
}

const overlap = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5

for (const [name, scenario] of Object.entries(SCENARIOS)) {
    test(name, async () => {
        const browser = await chromium.launch()
        try {
            const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
            const errors = []
            page.on('pageerror', (error) => errors.push(error.message))
            await page.route('**/WORLD_4326.json', (route) => route.fulfill({ path: fileURLToPath(world) }))
            await page.setContent('<svg id="map"></svg>')
            await page.addScriptTag({ path: fileURLToPath(bundle) })
            const { maxWidth = 16, ...legend } = scenario
            await page.evaluate(
                ({ maxWidth, legend }) => {
                    // a function cannot be sent to the page: build the long-label formatter there
                    if (legend.flowWidthLegend?.longLabels)
                        legend.flowWidthLegend.labelFormatter = (v) => Math.round(v).toLocaleString('en') + ' passengers'
                    eurostatmap
                        .map('flow')
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
                                { id: 'ES', x: -4, y: 40 },
                            ],
                            links: [
                                { source: 'FR', target: 'DE', value: 4000000 },
                                { source: 'ES', target: 'DE', value: 100000 },
                            ],
                        })
                        .flowSettings({ lineType: 'straight', bidirectional: false, maxWidth, nodes: true, color: () => '#c00' })
                        .legend({ x: 10, y: 10, ...legend })
                        .build()
                },
                { maxWidth, legend }
            )
            await page
                .locator('.em-flow-width-legend-horizontal, .em-flow-width-legend, .em-flow-color-legend')
                .first()
                .waitFor({ state: 'attached' })

            const found = await page.evaluate((collectSource) => {
                const collect = new Function('return ' + collectSource)()
                const out = {}
                for (const selector of ['.em-flow-width-legend-horizontal', '.em-flow-width-legend', '.em-flow-color-legend']) {
                    const container = document.querySelector(selector)
                    if (container) out[selector] = collect(container)
                }
                return out
            }, collect.toString())

            assert.ok(Object.keys(found).length, 'a flow legend was drawn')
            for (const [selector, boxes] of Object.entries(found)) {
                assert.ok(boxes.length > 1, `${selector} has content`)
                for (let i = 0; i < boxes.length; i++) {
                    for (let j = i + 1; j < boxes.length; j++) {
                        if (boxes[i].kind === 'line' && boxes[j].kind === 'line') continue // lines of the width legend sit side by side or stacked on purpose
                        assert.ok(!overlap(boxes[i], boxes[j]), `${selector}: "${boxes[i].name}" overlaps "${boxes[j].name}"`)
                    }
                }
            }
            assert.deepEqual(errors, [])
        } finally {
            await browser.close()
        }
    })
}
