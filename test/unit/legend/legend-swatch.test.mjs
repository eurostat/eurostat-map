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

import { swatchBarLayout, swatchStackStart } from '../../../src/legend/legend-swatch.js'

test('the stack starts below the title, subtitle, padding and extras added together', () => {
    assert.equal(swatchStackStart(), 0)
    assert.equal(swatchStackStart({ titleHeight: 16, titlePadding: 10 }), 26)
    assert.equal(swatchStackStart({ titlePadding: 5, extraPadding: 10, subtitleHeight: 14 }), 29)
})

test('a swatch bar splits its width evenly', () => {
    const b = swatchBarLayout({ count: 4, width: 200 })
    assert.equal(b.itemWidth, 50)
    assert.deepEqual([0, 1, 2, 3].map(b.itemX), [0, 50, 100, 150])
    assert.deepEqual([0, 1, 2].map(b.seamX), [50, 100, 150])
    assert.equal(b.breakX, null)
})

test('a break opens a gap before the given swatch and shifts the rest right', () => {
    const b = swatchBarLayout({ count: 4, width: 220, breakAt: 2, breakSize: 20 })
    assert.equal(b.itemWidth, 50)
    assert.deepEqual([0, 1, 2, 3].map(b.itemX), [0, 50, 120, 170])
    assert.deepEqual([0, 1, 2].map(b.seamX), [50, 100, 170])
    assert.equal(b.breakX, 110)
})

test('a break of zero size leaves the bar unchanged but still reports its position', () => {
    const b = swatchBarLayout({ count: 4, width: 200, breakAt: 2, breakSize: 0 })
    assert.deepEqual([0, 1, 2, 3].map(b.itemX), [0, 50, 100, 150])
    assert.equal(b.breakX, 100)
})
