import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { createLinearScale, createRadialScale, createSqrtScale } from '../../../src/core/scale.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

for (const [name, create] of [
    ['createSqrtScale', createSqrtScale],
    ['createRadialScale', createRadialScale],
]) {
    describe(name, () => {
        it('gives the largest value the maximum size', () => {
            close(create([25, 100], 20)(100), 20)
        })

        it('keeps the symbol area proportional to the value', () => {
            const scale = create([25, 100], 20)
            close(scale(25), 10) // a quarter of the value: half the radius
        })

        it('clamps values above the data maximum', () => {
            close(create([25, 100], 20)(400), 20)
        })

        it('draws nothing for zero, negative or non-numeric values', () => {
            const scale = create([25, 100], 20, 2)
            for (const v of [0, -3, 'abc', null, undefined, NaN]) assert.equal(scale(v), 0)
        })

        it('never draws a positive value smaller than the minimum size', () => {
            const scale = create([25, 100], 20, 2)
            assert.equal(scale(0.001), 2)
            assert.equal(scale.minSize(), 2)
        })

        it('builds its domain from the positive numeric values only', () => {
            assert.deepEqual(create([0, 25, 100, -5, 'x', null], 20).domain(), [25, 100])
        })

        it('falls back to a [1, 1] domain without usable data', () => {
            const scale = create()
            assert.deepEqual(scale.domain(), [1, 1])
            close(scale(1), 20)
            assert.equal(scale.maxSize(), 20)
        })
    })
}

describe('createLinearScale', () => {
    it('scales widths linearly from zero', () => {
        const scale = createLinearScale([10, 50], 10)
        close(scale(25), 5)
        close(scale(50), 10)
        close(scale(100), 10)
        assert.deepEqual(scale.domain(), [10, 50])
    })

    it('draws nothing for zero or negative values and respects the minimum size', () => {
        const scale = createLinearScale([10, 50], 10, 1)
        assert.equal(scale(0), 0)
        assert.equal(scale(-1), 0)
        assert.equal(scale(0.01), 1)
    })
})
