import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCircleRingValue } from '../../../src/layers/proportional-symbol/symbols/circle-ring.js'

test('circle rings accept percentages and numeric CSV values', () => {
    for (const value of [0, 0.5, 25.7, 100, '0', ' 25.7 ', '100']) {
        assert.equal(parseCircleRingValue(value), Number(value))
    }
})

test('circle rings distinguish unavailable or out-of-range percentages from zero', () => {
    for (const value of [undefined, null, '', ' ', ':', false, [], -1, 101, NaN, Infinity]) {
        assert.equal(parseCircleRingValue(value), undefined)
    }
})
