import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COMPACT_BREAKPOINT, isCompact, setActiveContainerWidth, getActiveWidth } from '../../../src/core/layout-profile.js'
import { legendsBelowMap } from '../../../src/core/legend-below.js'

test('the profile follows the width of the container of the map', () => {
    assert.equal(isCompact({ layout_: 'auto', _containerWidth_: 600 }), true)
    assert.equal(isCompact({ layout_: 'auto', _containerWidth_: COMPACT_BREAKPOINT }), true)
    assert.equal(isCompact({ layout_: 'auto', _containerWidth_: COMPACT_BREAKPOINT + 1 }), false)
})

test('a fixed layout wins over the container', () => {
    assert.equal(isCompact({ layout_: 'compact', _containerWidth_: 2000 }), true)
    assert.equal(isCompact({ layout_: 'desktop', _containerWidth_: 200 }), false)
})

test('a feature can have its own breakpoint', () => {
    const map = { layout_: 'auto', _containerWidth_: 600 }
    assert.equal(isCompact(map, 480), false)
    assert.equal(isCompact(map, 700), true)
})

test('without a map, the map laid out last decides', () => {
    setActiveContainerWidth(500)
    assert.equal(isCompact(), true)
    assert.equal(getActiveWidth(), 500)
    setActiveContainerWidth(1200)
    assert.equal(isCompact(), false)
    setActiveContainerWidth(undefined)
})

test('legends go under the map in the compact layout, unless kept or behind a button', () => {
    const compact = { layout_: 'compact', legendCompactPosition_: 'below' }
    assert.equal(legendsBelowMap(compact), true)
    assert.equal(legendsBelowMap({ ...compact, legendCompactPosition_: 'keep' }), false)
    assert.equal(legendsBelowMap({ ...compact, legendButton_: true }), false)
    assert.equal(legendsBelowMap({ layout_: 'desktop', legendCompactPosition_: 'below' }), false)
})
