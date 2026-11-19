import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseVennValue, vennCircleHits } from '../../../src/layers/proportional-symbol/venn-utils.js'

test('Venn values retain zero and accept non-negative numeric data', () => {
    assert.equal(parseVennValue(0), 0)
    assert.equal(parseVennValue('12.4'), 12.4)
    for (const invalid of [':', '', ' ', null, undefined, false, -1, NaN, Infinity]) {
        assert.equal(parseVennValue(invalid), undefined)
    }
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
