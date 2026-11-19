import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseVennValue, vennCircleHits, vennMask, vennPalette } from '../../../src/layers/choropleth/venn-utils.js'

test('Venn values retain zero and accept signed numeric data', () => {
    assert.equal(parseVennValue(0), 0)
    assert.equal(parseVennValue('12.4'), 12.4)
    assert.equal(parseVennValue(-1), -1)
    for (const invalid of [':', '', ' ', null, undefined, false, NaN, Infinity]) {
        assert.equal(parseVennValue(invalid), undefined)
    }
})

test('Venn classes combine independent inclusive thresholds and use multiplied colors', () => {
    const thresholds = [10, 20, 30]
    assert.equal(vennMask([9, 19, 29], thresholds), 0)
    assert.equal(vennMask([10, 21, 29], thresholds), 3)
    assert.equal(vennMask([15, 20, 30], thresholds), 7)
    const palette = vennPalette(['#00ffff', '#ffff00', '#ff00ff'], '#eee')
    assert.equal(palette[0], '#eee')
    assert.equal(palette[3], '#00ff00')
    assert.equal(palette[7], '#000000')
})

test('Venn pointer detection identifies separate and overlapping circles', () => {
    const centres = [
        [0, 0],
        [12, 0],
        [6, 10],
    ]
    assert.deepEqual(vennCircleHits(centres, 10, -8, 0), [0])
    assert.deepEqual(vennCircleHits(centres, 10, 6, -4), [0, 1])
    assert.deepEqual(vennCircleHits(centres, 10, 6, 4), [0, 1, 2])
    assert.deepEqual(vennCircleHits(centres, 10, 25, 20), [])
})
