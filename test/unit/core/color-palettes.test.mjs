import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EUROSTAT_SINGLE_HUES, isSingleHueName, singleHuePalette } from '../../../src/core/color-palettes.js'

test('single-hue palettes have the requested length, run light to dark and are hex', () => {
    for (const name of Object.keys(EUROSTAT_SINGLE_HUES)) {
        for (const n of [2, 5, 9]) {
            const p = singleHuePalette(name, n)
            assert.equal(p.length, n)
            p.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/))
        }
    }
})

test('single-hue palettes match the Eurostat notebook (chroma.js)', () => {
    assert.deepEqual(singleHuePalette('teal', 6), ['#b8f9ff', '#8dcdd6', '#63a2ad', '#3b7a84', '#16535d', '#002e38'])
    assert.deepEqual(singleHuePalette('plum', 3), ['#ff98c2', '#a64b72', '#510029'])
})

test('palette names are case-insensitive; unknown names are rejected', () => {
    assert.equal(isSingleHueName('Teal'), true)
    assert.equal(isSingleHueName('darkorchid'), true)
    assert.equal(isSingleHueName('nope'), false)
    assert.equal(isSingleHueName(['#fff']), false)
    assert.throws(() => singleHuePalette('nope', 5))
})
