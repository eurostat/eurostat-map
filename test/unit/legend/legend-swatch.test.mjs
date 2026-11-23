import assert from 'node:assert/strict'
import { test } from 'node:test'
import { swatchStackLayout } from '../../../src/legend/legend-swatch.js'

test('swatches are contiguous by default', () => {
    const l = swatchStackLayout({ count: 3, shapeHeight: 20, startY: 10 })
    assert.deepEqual([0, 1, 2].map(l.rowY), [10, 30, 50])
    assert.equal(l.top, 10)
    assert.equal(l.bottom, 70)
})

test('a gap pushes rows apart and the stack bottom follows the last row', () => {
    const l = swatchStackLayout({ count: 3, shapeHeight: 20, gap: 5 })
    assert.deepEqual([0, 1, 2].map(l.rowY), [0, 25, 50])
    assert.equal(l.bottom, 70)
})

test('an empty stack ends where it starts', () => {
    assert.equal(swatchStackLayout({ count: 0, shapeHeight: 20, startY: 8 }).bottom, 8)
})
