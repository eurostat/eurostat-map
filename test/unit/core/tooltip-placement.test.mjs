import assert from 'node:assert/strict'
import test from 'node:test'
import { placeTooltip } from '../../../src/tooltip/placement.js'

const bounds = { left: 20, top: 100, right: 320, bottom: 400 }
const offset = { x: 30, y: 20 }

test('places a short tooltip to the right, then to the left at the right edge', () => {
    const size = { width: 80, height: 45 }
    assert.deepEqual(placeTooltip(bounds, size, { x: 90, y: 250 }, offset), { x: 120, y: 230 })
    assert.deepEqual(placeTooltip(bounds, size, { x: 290, y: 390 }, offset), { x: 180, y: 355 })
})

test('keeps the point visible by moving a wide tooltip below or above it', () => {
    const size = { width: 230, height: 60 }
    assert.deepEqual(placeTooltip(bounds, size, { x: 75, y: 200 }, offset), { x: 20, y: 220 })
    assert.deepEqual(placeTooltip(bounds, size, { x: 260, y: 370 }, offset), { x: 90, y: 290 })
})

test('limits an oversized tooltip to the larger vertical gap', () => {
    const size = { width: 230, height: 230 }
    assert.deepEqual(placeTooltip(bounds, size, { x: 180, y: 230 }, offset), { x: 65, y: 250, maxHeight: 150 })
    assert.deepEqual(placeTooltip(bounds, size, { x: 180, y: 280 }, offset), { x: 65, y: 100, maxHeight: 160 })
})
