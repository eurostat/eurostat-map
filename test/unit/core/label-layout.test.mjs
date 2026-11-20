import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chooseVisibleLabels, flowNodeLabelPlacement } from '../../../src/core/decoration/label-layout.js'

const box = (left, top, width = 40, height = 12) => ({ left, top, right: left + width, bottom: top + height })
const frame = { left: 0, top: 0, right: 200, bottom: 100 }

test('a label is kept when nothing is in its way', () => {
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(100, 50)], [], frame), [true, true])
})

test('of two overlapping labels the first (highest priority) wins', () => {
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(30, 14)], [], frame), [true, false])
    assert.deepEqual(chooseVisibleLabels([box(30, 14), box(10, 10)], [], frame), [true, false])
})

test('a hidden label does not hide the labels after it', () => {
    // b overlaps a (hidden), c overlaps only b: c stays
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(40, 10), box(75, 10)], [], frame, 0), [true, false, true])
})

test('labels are hidden when they overlap an obstacle such as the legend or the title', () => {
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(150, 60)], [box(0, 0, 60, 30)], frame), [false, true])
})

test('labels that leave the frame are hidden', () => {
    assert.deepEqual(chooseVisibleLabels([box(-5, 10), box(170, 10), box(10, 95), box(10, 10)], [], frame), [false, false, false, true])
})

test('padding keeps labels that nearly touch apart', () => {
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(51, 10)], [], frame, 0), [true, true])
    assert.deepEqual(chooseVisibleLabels([box(10, 10), box(51, 10)], [], frame, 2), [true, false])
})

test('an empty or missing label box is not an obstacle and is never hidden', () => {
    assert.deepEqual(chooseVisibleLabels([null, box(0, 0, 0, 0), box(10, 10)], [], frame), [true, true, true])
})

test('node labels sit on the edge of the symbol, pushed away by em offsets', () => {
    assert.deepEqual(flowNodeLabelPlacement('top', 10), { x: 0, y: -10, dx: '0', dy: '-0.8em', anchor: 'middle' })
    assert.deepEqual(flowNodeLabelPlacement('bottom', 10), { x: 0, y: 10, dx: '0', dy: '0.8em', anchor: 'middle' })
    assert.deepEqual(flowNodeLabelPlacement('left', 10), { x: -10, y: 0, dx: '-0.4em', dy: '0', anchor: 'end' })
    assert.deepEqual(flowNodeLabelPlacement('right', 10), { x: 10, y: 0, dx: '0.4em', dy: '0', anchor: 'start' })
})

test('node label placement defaults to the top and tolerates a missing radius', () => {
    assert.deepEqual(flowNodeLabelPlacement(), flowNodeLabelPlacement('top', 0))
    assert.deepEqual(flowNodeLabelPlacement('nonsense', undefined), flowNodeLabelPlacement('top', 0))
})
