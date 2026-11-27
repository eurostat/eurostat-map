import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatLegendValues, getDecimals } from '../../../src/legend/legend-utils.js'

test('the precision of a dataset is its most decimal places', () => {
    assert.equal(getDecimals([1, 2.5, '3.25', ':', '']), 2)
    assert.equal(getDecimals([1, 100]), 0)
    assert.equal(getDecimals([0.1 + 0.2]), 1)
})

test('every number of a legend gets the same decimals', () => {
    assert.deepEqual([1, 50.5, 100].map(formatLegendValues([1, 50.5, 100], [1, 7.5, 100])), ['1.0', '50.5', '100.0'])
    assert.deepEqual([1, 50.5, 100000].map(formatLegendValues([1, 50.5, 100000], [1, 100000])), ['1', '51', '100 000'])
})

test('numbers that would look alike get another decimal', () => {
    assert.deepEqual([1.2, 1.4, 3].map(formatLegendValues([1.2, 1.4, 3], [1, 3])), ['1.2', '1.4', '3.0'])
})

test("millions are written in words, and the author's decimals win", () => {
    assert.equal(formatLegendValues([2500000, 4])(2500000), '2.5 million')
    assert.equal(formatLegendValues([5], [5], 2)(5), '5.00')
})
