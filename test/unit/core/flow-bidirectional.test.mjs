import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parallelFlowPath } from '../../../src/layers/flow/flow-bidirectional.js'

test('reciprocal half-arrows point in opposite directions on separate sides of a corridor', () => {
    const forward = { x1: 0, y1: 0, x2: 100, y2: 0, width: 10 }
    const reverse = { ...forward, x1: 100, x2: 0, width: 5 }
    assert.equal(parallelFlowPath(forward, 20), 'M0,0.75L100,0.75L80,17.25L80,10.75L0,10.75Z')
    assert.equal(parallelFlowPath(reverse, 10), 'M100,-0.75L0,-0.75L10,-9L10,-5.75L100,-5.75Z')
    assert.equal(parallelFlowPath(reverse, 0), 'M100,-0.75L0,-0.75L0,-5.75L100,-5.75Z')
    assert.equal(parallelFlowPath({ ...forward, x2: 0 }, 20), null)
})
