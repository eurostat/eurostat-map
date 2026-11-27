import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSqrtScale } from '../../../src/core/scale.js'
import {
    DEFAULT_NEGATIVE_FILL,
    DEFAULT_POSITIVE_FILL,
    getSignStyle,
    hasNegativeValues,
    sizeByMagnitude,
    usesNeutralBackground,
} from '../../../src/layers/proportional-symbol/ps-sign.js'

const data = (...values) => ({ getArray: () => values })

test('negative values are detected among numbers and numeric text', () => {
    assert.equal(hasNegativeValues(data(1, 0, ':', 'category1')), false)
    assert.equal(hasNegativeValues(data(1, -2)), true)
    assert.equal(hasNegativeValues(data('-2')), true)
    assert.equal(hasNegativeValues(undefined), false)
})

test('a negative value gets the size of the same positive amount, and zero none', () => {
    const scale = sizeByMagnitude(createSqrtScale([100, 25], 30, 0))
    assert.equal(scale(-100), scale(100))
    assert.equal(scale(-25), 15)
    assert.equal(scale(0), 0)
    assert.equal(scale(':'), 0)
    assert.deepEqual(scale.domain(), [25, 100])
})

test('without colours of the author, the signs are blue and red on a neutral background', () => {
    const layer = { _psSigned: true, _psFillChosen: false, psFill_: '#009569' }
    assert.deepEqual(getSignStyle(layer, false), { fill: DEFAULT_POSITIVE_FILL })
    assert.deepEqual(getSignStyle(layer, true), { fill: DEFAULT_NEGATIVE_FILL })
    assert.equal(usesNeutralBackground(layer), true)
})

test("the author's single colour is solid for positive values and an outline for negative ones", () => {
    const layer = { _psSigned: true, _psFillChosen: true, psFill_: 'purple' }
    assert.deepEqual(getSignStyle(layer, false), { fill: 'purple' })
    assert.deepEqual(getSignStyle(layer, true), { fill: 'transparent', outline: 'purple' })
    assert.equal(usesNeutralBackground(layer), false)
})

test("the author's sign colours win, with the default for the one not given", () => {
    const layer = { _psSigned: true, _psFillChosen: false, psFill_: '#009569', psNegativeFill_: 'black' }
    assert.deepEqual(getSignStyle(layer, true), { fill: 'black' })
    assert.deepEqual(getSignStyle(layer, false), { fill: DEFAULT_POSITIVE_FILL })
})

test('colour classes of a second variable are kept, with outlines for negative values', () => {
    const layer = { _psSigned: true, classifierColor_: () => 0, psNegativeFill_: 'black' }
    assert.deepEqual(getSignStyle(layer, false, '#abc'), { fill: '#abc' })
    assert.deepEqual(getSignStyle(layer, true, '#abc'), { fill: 'transparent', outline: '#abc' })
    assert.equal(usesNeutralBackground(layer), false)
})
