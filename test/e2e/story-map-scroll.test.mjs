// Scroll-robustness test for examples/misc/story-map (scrollytelling).
// Drives the page in headless Chromium through every step pair, mid-transition reversals and random rapid
// scrolling, then asserts the *settled* state of the map/chart matches what that step should look like.
// Needs network (the example loads d3/flubber from a CDN), so it is not part of `npm test`.
//   node test/e2e/story-map-scroll.test.mjs [--seed N] [--random N] [--labels-only] [--new-stops-only] [--tooltip-only]
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const args = process.argv.slice(2)
const argVal = (k, d) => (args.includes(k) ? +args[args.indexOf(k) + 1] : d)
let seed = argVal('--seed', 1)
const SCROLL_ONLY = args.includes('--scroll-only') // only the wheel scrolling sections
const RANDOM_RUNS = argVal('--random', 25)
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

const URL = pathToFileURL(path.resolve('examples/misc/story-map/index.html')).href
const SETTLE = 6000
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8]
const CHART_STEP = STEPS.at(-1)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1300, height: 800 } })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()))
await page.goto(URL)
await page.waitForFunction(() => document.querySelectorAll('#em-nutsrg path').length > 50, null, { timeout: 30000 })
await page.waitForTimeout(3000)

const go = (n) => page.evaluate((n) => document.getElementById('step-' + n).scrollIntoView({ block: 'center' }), n)

if (args.includes('--tooltip-only')) {
    try {
        await go(1)
        await page.waitForTimeout(1000)
        const region = page.locator('#em-nutsrg path').filter({ visible: true }).first()
        const tooltip = page.locator('.em-tooltip').first()
        await region.dispatchEvent('mouseover')
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.em-tooltip')).opacity) > 0.9)
        await page.mouse.wheel(0, 120)
        await tooltip.waitFor({ state: 'hidden' })
        await page.waitForFunction(() => {
            const style = getComputedStyle(document.querySelector('.em-tooltip'))
            return style.visibility === 'visible' && Number(style.opacity) === 0
        })
        await region.dispatchEvent('mouseover')
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.em-tooltip')).opacity) > 0.9)
        console.log('ok   scrolling hides the tooltip and hover restores it')

        const headers = await page.evaluate(() => {
            const samples = new Map()
            for (const node of document.querySelectorAll('#em-nutsrg path')) {
                if (getComputedStyle(node).display === 'none') continue
                const fill = node.getAttribute('fill___')
                if (fill && !samples.has(fill)) samples.set(fill, node)
            }
            return [...samples].map(([fill, node]) => {
                node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
                const { backgroundColor, color } = getComputedStyle(document.querySelector('.em-tooltip .em-tooltip-bar'))
                node.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
                return { fill: d3.rgb(fill).formatRgb(), backgroundColor, color }
            })
        })
        assert.equal(headers.length, 8)
        assert.deepEqual(new Set(headers.map(({ color }) => color)), new Set(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']), JSON.stringify(headers))
        for (const { fill, backgroundColor, color } of headers) {
            assert.equal(backgroundColor, fill)
            const [r, g, b] = backgroundColor.match(/\d+/g).map((channel) => {
                const s = Number(channel) / 255
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
            const contrast = color === 'rgb(0, 0, 0)' ? (luminance + 0.05) / 0.05 : 1.05 / (luminance + 0.05)
            assert.ok(contrast >= 4.5, `Tooltip contrast ${contrast} for ${fill}`)
        }
        console.log('ok   all eight tooltip header colours match the regions with at least 4.5:1 contrast')
    } finally {
        await browser.close()
    }
    process.exit(0)
}

const labelLayout = (step) => page.evaluate((step) => {
    const labels = [...document.querySelectorAll('.story-place-labels text')]
    const frame = document.querySelector('.map-stage').getBoundingClientRect()
    const furniture = [...document.querySelectorAll('.em-legend, .em-footnote, .step.active .step-card')]
        .map((node) => node.getBoundingClientRect())
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    const boxes = labels.map((node) => node.getBoundingClientRect())
    const issues = labels.flatMap((node, i) => {
        const b = boxes[i]
        const style = getComputedStyle(node)
        const visible = style.visibility === 'visible' && style.fontSize === '12px'
        const inFrame = b.left >= Math.max(0, frame.left) && b.right <= Math.min(innerWidth, frame.right)
            && b.top >= Math.max(0, frame.top) && b.bottom <= Math.min(innerHeight, frame.bottom)
        const clear = ![...boxes.slice(0, i), ...furniture].some((other) => overlaps(b, other))
        return visible && inFrame && clear ? [] : [node.textContent]
    })
    const expected = [...document.querySelectorAll('#em-nutsrg path')]
        .filter((node) => {
            const b = node.getBoundingClientRect()
            return b.left < Math.min(innerWidth, frame.right) - 6 && b.right > Math.max(0, frame.left) + 6
                && b.top < frame.bottom - 6 && b.bottom > frame.top + 6
        })
        .map((node) => node.__data__.properties.id)
        .filter((id) => step === 6 ? LOW_ZOOM_REGIONS(id) : HIGH_VALUE(id))
        .sort()
    return { ids: labels.map((node) => node.dataset.region).sort(), expected, issues }
}, step)

if (args.includes('--labels-only')) {
    try {
        for (const [width, height] of [[1300, 800], [900, 650], [390, 844], [320, 568]]) {
            await page.setViewportSize({ width, height })
            await page.reload()
            await page.waitForFunction(() => document.querySelector('.step.active'))
            for (const step of [3, 6]) {
                await go(step)
                await page.waitForSelector(`[data-step="${step}"].active`)
                await page.waitForSelector('.story-place-labels text')
                await page.waitForTimeout(700)
                const { ids, expected, issues } = await labelLayout(step)
                assert.ok(expected.length > 1)
                assert.deepEqual(ids, expected)
                if (step === 3) {
                    for (const id of ['DE71', 'DE11', 'DE60', 'DE21', 'DE30']) {
                        assert.ok(ids.includes(id), `Missing ${id} label at ${width}×${height}`)
                    }
                }
                assert.deepEqual(issues, [], `Clipped, overlapping, or incorrectly sized labels at ${width}×${height}, step ${step}`)
                console.log(`ok   ${width}×${height}, step ${step}, ${ids.length} labels`)
            }
        }
    } finally {
        await browser.close()
    }
    process.exit(0)
}

// What the page looks like right now
const snapshot = () =>
    page.evaluate(() => {
        const num = (v) => (v === '' || v == null ? 1 : parseFloat(v))
        const regions = {}
        document.querySelectorAll('#em-nutsrg path').forEach((el) => {
            if (el.style.display === 'none') return
            const b = el.getBBox()
            regions[el.__data__.properties.id] = {
                x: b.x, y: b.y, w: b.width, h: b.height,
                opacity: num(getComputedStyle(el).opacity),
            }
        })
        const op = (sel) => {
            const el = document.querySelector(sel)
            return el ? num(getComputedStyle(el).opacity) : null
        }
        const overlay = document.querySelectorAll('#em-chart-overlay')
        const zg = document.querySelector('[id^=em-zoom-group]')
        const m = /translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/.exec(zg.getAttribute('transform') || '')
        return {
            title: document.getElementById('map-title').textContent,
            active: [...document.querySelectorAll('.step.active')].map((s) => s.dataset.step),
            regions,
            zoom: m ? { x: +m[1], y: +m[2], k: +m[3] } : { x: 0, y: 0, k: 1 },
            labels: document.querySelectorAll('.story-place-labels text').length,
            overlays: overlay.length,
            overlayOpacity: overlay.length ? num(getComputedStyle(overlay[0]).opacity) : null,
            legend: op('.em-legend'),
            cntbn: op('#em-cntbn'),
            nutsbn: op('#em-nutsbn'),
        }
    })

// Baseline: the untouched step-1 map
await go(1)
await page.waitForTimeout(SETTLE)
const base = await snapshot()
const gdp = await page.evaluate(() => GDP_DATA)
const isHigh = (id) => (gdp[id] || 0) > 130
const isLow = (id) => gdp[id] < 50

const zoomReferences = new Map()
for (const step of [3, 6]) {
    await go(step)
    await page.waitForTimeout(SETTLE)
    const { zoom } = await snapshot()
    assert.ok(zoom.k > 1, `Step ${step} should zoom in`)
    zoomReferences.set(step, { zoom, labels: (await labelLayout(step)).expected.length })
}
const near = (a, b, tol) => Math.abs(a - b) <= tol

function check(step, s, label) {
    const fails = []
    const f = (msg) => fails.push(msg)
    if (s.active.join() !== String(step)) f(`active card ${s.active} != ${step}`)
    const ids = Object.keys(base.regions)
    const mapShape = (id) => {
        const r = s.regions[id], b = base.regions[id]
        return r && near(r.x, b.x, 1) && near(r.y, b.y, 1) && near(r.w, b.w, 1) && near(r.h, b.h, 1)
    }
    if (step === CHART_STEP) {
        const bad = ids.filter((id) => !s.regions[id] || s.regions[id].w > 9.5 || s.regions[id].h > 9.5)
        if (bad.length) f(`${bad.length} regions are not dots (e.g. ${bad[0]})`)
        const dim = ids.filter((id) => s.regions[id] && s.regions[id].opacity < 0.95)
        if (dim.length) f(`${dim.length} dots are dimmed`)
        if (s.overlays !== 1 || s.overlayOpacity < 0.95) f(`overlay count ${s.overlays} opacity ${s.overlayOpacity}`)
        if (s.legend > 0.05) f(`legend visible (${s.legend}) in chart`)
        if (!near(s.zoom.k, 1, 0.001) || Math.abs(s.zoom.x) > 0.5 || Math.abs(s.zoom.y) > 0.5) f(`chart is zoomed ${JSON.stringify(s.zoom)}`)
        if (s.labels) f(`${s.labels} place labels in chart`)
    } else {
        const bad = ids.filter((id) => !mapShape(id))
        if (bad.length) f(`${bad.length} regions not back in map shape (e.g. ${bad[0]})`)
        if (s.overlays) f(`${s.overlays} chart overlays left over`)
        if (s.legend < 0.95) f(`legend hidden (${s.legend})`)
        const highlight = [2, 3].includes(step) ? isHigh : [5, 6].includes(step) ? isLow : null
        if (!highlight) {
            const dim = ids.filter((id) => s.regions[id].opacity < 0.95)
            if (dim.length) f(`${dim.length} regions still dimmed`)
            if (s.cntbn < 0.95 || s.nutsbn < 0.95) f(`borders still faded ${s.cntbn}/${s.nutsbn}`)
        } else {
            const wrong = ids.filter((id) => (highlight(id) ? s.regions[id].opacity < 0.95 : s.regions[id].opacity > 0.15))
            if (wrong.length) f(`${wrong.length} regions with wrong highlight opacity (e.g. ${wrong[0]} ${s.regions[wrong[0]].opacity})`)
            if (!near(s.cntbn, 0.3, 0.05) || !near(s.nutsbn, 0.08, 0.05)) f(`border opacity ${s.cntbn}/${s.nutsbn}`)
        }
        const reference = zoomReferences.get(step)
        if (reference) {
            const z = s.zoom
            const { zoom, labels } = reference
            if (!near(z.k, zoom.k, 0.01) || !near(z.x, zoom.x, 1) || !near(z.y, zoom.y, 1))
                f(`zoom ${JSON.stringify(z)} != reference ${JSON.stringify(zoom)}`)
            if (s.labels !== labels) f(`${s.labels} place labels (expected ${labels}, one per highlighted region in the focus area)`)
        } else {
            if (!near(s.zoom.k, 1, 0.001) || Math.abs(s.zoom.x) > 0.5 || Math.abs(s.zoom.y) > 0.5) f(`map is zoomed on step ${step} ${JSON.stringify(s.zoom)}`)
            if (s.labels) f(`${s.labels} place labels on step ${step}`)
        }
    }
    return fails.map((m) => `[${label}] step ${step}: ${m}`)
}

const failures = []
let runs = 0
async function run(label, seq) {
    // seq: [[step, waitAfterMs], ...] - the last entry is held until settled
    for (const [n, wait] of seq) {
        await go(n)
        await page.waitForTimeout(wait)
    }
    await page.waitForTimeout(SETTLE)
    const last = seq[seq.length - 1][0]
    const out = check(last, await snapshot(), label)
    runs++
    if (out.length) {
        failures.push(...out)
        console.log('FAIL', out.join('\n     '))
    } else console.log('ok  ', label)
}

if (args.includes('--new-stops-only')) {
    await run('high zoom', [[3, 0]])
    for (const n of [4, 5, 6, 7, CHART_STEP]) await run(`forward to ${n}`, [[n, 0]])
    await run('back from chart to low zoom', [[6, 0]])
    await browser.close()
    assert.deepEqual([...failures, ...pageErrors], [])
    process.exit(0)
}

// 1. every ordered pair of steps, fully settled in between
for (const a of STEPS) for (const b of STEPS) if (!SCROLL_ONLY && a !== b) await run(`${a}->${b}`, [[a, SETTLE], [b, 0]])

// 2. reversal mid-flight: a -> b, interrupted after t ms by c
for (const b of SCROLL_ONLY ? [] : STEPS)
    for (const c of STEPS)
        if (b !== c)
            for (const t of [300, 1200]) {
                const a = STEPS.find((s) => s !== b && s !== c)
                await run(`${a}->${b}(${t}ms)->${c}`, [[a, SETTLE], [b, t], [c, 0]])
            }

// 3. random rapid scrolling
for (let i = 0; !SCROLL_ONLY && i < RANDOM_RUNS; i++) {
    const seq = []
    for (let j = 0; j < 7; j++) seq.push([STEPS[Math.floor(rand() * STEPS.length)], 30 + Math.floor(rand() * 2200)])
    await run(`random#${i} ${seq.map(([n, w]) => `${n}@${w}`).join(' ')}`, seq)
}

// 4. real wheel scrolling up and down across the whole story
await go(1)
await page.waitForTimeout(SETTLE)
for (let i = 0; !SCROLL_ONLY && i < 4; i++) {
    for (let k = 0; k < 80; k++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(15) }
    for (let k = 0; k < 80; k++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(15) }
}
await page.waitForTimeout(SETTLE)
const active = await page.evaluate(() => +document.querySelector('.step.active')?.dataset.step)
const wheelOut = check(active, await snapshot(), 'wheel')
runs++
if (wheelOut.length) { failures.push(...wheelOut); console.log('FAIL', wheelOut.join('\n     ')) } else console.log('ok   wheel up/down, ended on step', active)

// 5. continuous wheel scroll from the chart up to step 1 at several speeds,
//    starting both settled and while the chart morph is still in flight
const topEl = () => page.evaluate(() => window.scrollY)
for (const intervalMs of [5, 20, 60, 200])
    for (const startDelay of [SETTLE, 600]) {
        await go(CHART_STEP)
        await page.waitForTimeout(startDelay)
        for (let k = 0; k < 80 && (await topEl()) > 0; k++) {
            await page.mouse.wheel(0, -150)
            await page.waitForTimeout(intervalMs)
        }
        await go(1)
        await page.waitForTimeout(SETTLE)
        const out = check(1, await snapshot(), `scroll ${CHART_STEP}->1 every ${intervalMs}ms after ${startDelay}ms`)
        runs++
        if (out.length) { failures.push(...out); console.log('FAIL', out.join(' | ')) }
        else console.log(`ok   scroll ${CHART_STEP}->1 every ${intervalMs}ms after ${startDelay}ms`)
    }

if (pageErrors.length) failures.push(...pageErrors.map((e) => 'page error: ' + e))
await browser.close()
console.log(`\n${runs} scenarios, ${failures.length} failures`)
process.exit(failures.length ? 1 : 0)
