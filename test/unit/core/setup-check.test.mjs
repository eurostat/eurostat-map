import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareRegionIds } from '../../../src/core/setup-check.js'
import { parsePixelSize } from '../../../src/core/option-check.js'

test('region ids that match are counted, and ISO spellings get the NUTS one as a suggestion', () => {
    const onMap = new Set(['EL', 'EL30', 'UK', 'FR'])
    assert.deepEqual(compareRegionIds(['FR', 'GR', 'GR30', 'gb', 'XX'], onMap), {
        matches: 1,
        suggestions: ["'EL' instead of 'GR'", "'EL30' instead of 'GR30'", "'UK' instead of 'gb'"],
    })
})

test('sizes are read from numbers and pixel text only', () => {
    const warn = console.warn
    console.warn = () => {}
    try {
        assert.equal(parsePixelSize(800, 'width'), 800)
        assert.equal(parsePixelSize(' 800px ', 'width'), 800)
        assert.equal(parsePixelSize('640', 'height'), 640)
        for (const bad of ['50%', '', 'wide', -3, 0, NaN, {}]) assert.equal(parsePixelSize(bad, 'width'), undefined)
    } finally {
        console.warn = warn
    }
})
