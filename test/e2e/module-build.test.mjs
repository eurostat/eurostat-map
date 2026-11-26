// The ES module build as an application gets it: bundled with webpack against the package's dependencies, then run in
// a browser. Covers both import forms, the externalised dependencies and annotations (whose package brings old D3).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { ORIGIN, routeFixtures } from '../helpers/synthetic-nuts.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const webpack = createRequire(import.meta.url)('webpack')

async function bundleApplication(directory) {
    const library = JSON.stringify(path.join(ROOT, 'build', 'eurostatmap.mjs'))
    fs.writeFileSync(
        path.join(directory, 'app.js'),
        `import eurostatmap, { map, version } from ${library}\nwindow.app = { eurostatmap, map, version }\n`
    )
    const stats = await new Promise((resolve, reject) =>
        webpack(
            {
                mode: 'production',
                context: ROOT,
                entry: path.join(directory, 'app.js'),
                output: { path: directory, filename: 'app.bundle.js' },
                devtool: false,
                performance: false,
                resolve: { modules: ['node_modules', path.join(ROOT, 'node_modules')] },
            },
            (error, result) => (error ? reject(error) : resolve(result))
        )
    )
    const { errors, warnings } = stats.toJson({ all: false, errors: true, warnings: true })
    assert.deepEqual(
        [...errors, ...warnings].map((e) => e.message),
        []
    )
    return path.join(directory, 'app.bundle.js')
}

test('the package points bundlers at the module build, which leaves its dependencies as imports', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    assert.equal(pkg.module, 'build/eurostatmap.mjs')
    const source = fs.readFileSync(path.join(ROOT, pkg.module), 'utf8')
    const imported = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1])
    assert.ok(imported.includes('d3-selection'), imported.join(', '))
    const undeclared = imported.filter((name) => !Object.keys(pkg.dependencies).some((d) => name === d || name.startsWith(d + '/')))
    assert.deepEqual(undeclared, [])
    // included, with its old D3: dragging breaks when an application installs two copies of d3-selection 1
    assert.ok(!imported.includes('d3-svg-annotation'), 'd3-svg-annotation must stay inside the module build')
    assert.deepEqual(imported.filter((name) => name.startsWith('proj4')), [])
})

test('an application bundled against it draws a map', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'em-module-'))
    const browser = await chromium.launch()
    try {
        const bundle = await bundleApplication(directory)
        const page = await browser.newPage()
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        await routeFixtures(page, { root: ROOT })
        await page.goto(ORIGIN + '/')
        await page.addScriptTag({ path: bundle })
        const result = await page.evaluate(async (origin) => {
            const { eurostatmap, map, version } = window.app
            const m = eurostatmap
                .map('ch')
                .width(600)
                .height(500)
                .nutsLevel(0)
                .nuts2jsonBaseURL(origin + '/nuts2json/v2')
            m.stat({ eurostatDatasetCode: 'x', filters: { time: '2021' } })
                .annotations({ annotations: [{ x: 100, y: 100, dx: 20, dy: 20, note: { label: 'Note' } }], editMode: true })
                .legend({ title: 'Title' })
            await new Promise((resolve) => m.onBuild(resolve).build())
            await new Promise((resolve) => setTimeout(resolve, 700))
            return {
                sameFunction: map === eurostatmap.map,
                version: typeof version,
                regions: document.querySelectorAll('#em-nutsrg path[ecl]').length,
                annotations: document.querySelectorAll('g.annotation').length,
                swatches: document.querySelectorAll('.em-legend-rect').length > 0,
            }
        }, ORIGIN)
        assert.deepEqual(result, { sameFunction: true, version: 'string', regions: 3, annotations: 1, swatches: true })
        // annotations can be dragged in edit mode
        const note = () => page.getAttribute('g.annotation-note', 'transform')
        const handle = await page.locator('.annotation-note .handle').first().boundingBox()
        const before = await note()
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
        await page.mouse.down()
        await page.mouse.move(handle.x + 60, handle.y + 40, { steps: 6 })
        await page.mouse.up()
        assert.notEqual(await note(), before, 'the note follows the pointer')
        assert.deepEqual(errors, [])
    } finally {
        await browser.close()
        fs.rmSync(directory, { recursive: true, force: true })
    }
})
