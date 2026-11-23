import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COLOR_STRETCHES, colorStretch } from '../../../src/core/color-stretch.js'

test('every stretch is reversible and monotonic, also around a reference', () => {
    for (const name of COLOR_STRETCHES) {
        for (const reference of [0, 5, -3.5]) {
            const { transform, untransform } = colorStretch(name, reference)
            let previous = -Infinity
            for (const v of [-20, -3.5, 0, 1, 5, 100, 7500]) {
                const t = transform(v)
                assert.ok(t >= previous, `${name} is monotonic`)
                previous = t
                assert.ok(Math.abs(untransform(t) - v) < 1e-6 * Math.max(1, Math.abs(v)), `${name} round trip at ${v}`)
            }
            if (name !== 'linear') assert.equal(transform(reference), 0, `${name} puts the reference at 0`)
        }
    }
})

test('stretches compress large distances', () => {
    const linear = colorStretch('linear').transform
    for (const name of ['sqrt', 'cbrt', 'log']) {
        const { transform } = colorStretch(name, 0)
        assert.ok(transform(1000) / transform(10) < linear(1000) / linear(10), name)
    }
})

test('unknown stretches are rejected', () => {
    assert.throws(() => colorStretch('nope'))
})
