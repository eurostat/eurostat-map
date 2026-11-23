import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    EUROSTAT_SINGLE_HUES,
    EUROSTAT_DIVERGING_SCHEMES,
    isSingleHueName,
    isDivergingName,
    singleHuePalette,
    divergingInterpolator,
    divergingClassColors,
    divergingPalette,
} from '../../../src/core/color-palettes.js'

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

test('diverging scheme names join two different single hues', () => {
    assert.equal(isDivergingName('cobalt-plum'), true)
    assert.equal(isDivergingName('Teal-Sienna'), true)
    assert.equal(isDivergingName('teal'), false)
    assert.equal(isDivergingName('teal-teal'), false)
    assert.equal(isDivergingName('teal-nope'), false)
    for (const name of EUROSTAT_DIVERGING_SCHEMES) assert.equal(isDivergingName(name), true, name)
    assert.throws(() => divergingInterpolator('teal'))
})

test('diverging interpolator runs hue A, neutral, hue B', () => {
    const f = divergingInterpolator('cobalt-plum')
    assert.equal(f(0.5), '#f5f5f5')
    assert.notEqual(f(0), f(1))
    assert.equal(f(-1), f(0))
    assert.equal(f(2), f(1))
})

test('classed diverging colours put the neutral at the point of divergence', () => {
    const odd = divergingPalette('cobalt-plum', 7)
    assert.equal(odd.length, 7)
    assert.equal(odd[3], '#f5f5f5')
    assert.equal(divergingPalette('cobalt-plum', 6).length, 6)
    assert.ok(!divergingPalette('cobalt-plum', 6).includes('#f5f5f5'))
    // 2 classes below, none containing the pivot, 4 above
    const uneven = divergingClassColors('teal-plum', 2, false, 4)
    assert.equal(uneven.length, 6)
    // no classes on one side
    assert.equal(divergingClassColors('teal-plum', 0, false, 5).length, 5)
    assert.equal(divergingClassColors('teal-plum', 3, true, 0).length, 4)
})
