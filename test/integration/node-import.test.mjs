// The built package can be imported where there is no browser (server rendering, a consumer's Node tests).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../build')
const require = createRequire(import.meta.url)

for (const bundle of ['eurostatmap.min.js', 'eurostatmap.js']) {
    test(`${bundle} imports in Node`, () => {
        const library = require(path.join(BUILD, bundle))
        assert.equal(typeof library.map, 'function')
        assert.equal(typeof library.version, 'string')
    })
}
