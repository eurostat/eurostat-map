import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { LAYER_ROLES, getLayerType, getRole, isLayerTypeRegistered, registerLayerType } from '../../../src/core/layer-registry.js'

describe('layer roles', () => {
    it('region-fill types are bases and symbol/vector types are overlays', () => {
        for (const type of ['ch', 'choropleth', 'categorical', 'bivariateChoropleth', 'valueByAlpha', 'stripe']) {
            assert.equal(getRole(type), 'base', type)
        }
        for (const type of ['ps', 'proportionalSymbol', 'pie', 'coxcomb', 'waffle', 'mushroom', 'spark', 'flow']) {
            assert.equal(getRole(type), 'overlay', type)
        }
    })

    it('every static role is either base or overlay', () => {
        for (const [type, role] of Object.entries(LAYER_ROLES)) assert.ok(role === 'base' || role === 'overlay', type)
    })

    it('an unknown type is treated as a base', () => {
        assert.equal(getRole('unit-test-unknown-type'), 'base')
    })
})

describe('layer type registration', () => {
    it('an unregistered type is reported as such', () => {
        assert.equal(isLayerTypeRegistered('unit-test-missing'), false)
        assert.equal(getLayerType('unit-test-missing'), undefined)
    })

    it('does not mistake Object.prototype members for registered types', () => {
        assert.equal(isLayerTypeRegistered('toString'), false)
        assert.equal(isLayerTypeRegistered('constructor'), false)
    })

    it('registers a type with its role and decorator', () => {
        const decorate = () => {}
        registerLayerType('unit-test-overlay', 'overlay', decorate)
        assert.equal(isLayerTypeRegistered('unit-test-overlay'), true)
        assert.deepEqual(getLayerType('unit-test-overlay'), { role: 'overlay', decorate })
        assert.equal(getRole('unit-test-overlay'), 'overlay')
    })

    it('falls back to the static role when none is given', () => {
        registerLayerType('pie', undefined, () => {})
        assert.equal(getLayerType('pie').role, 'overlay')
    })
})
