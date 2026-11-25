import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getRegionsSelector } from '../../../src/core/utils.js'

const map = (props) => ({ Geometries: {}, geo_: 'EUR', nutsLevel_: 2, _mapType: 'ps', ...props })

describe('getRegionsSelector', () => {
    it('never selects patternFill overlays, which are decoration clones without a datum', () => {
        const selectors = [
            getRegionsSelector(map({ Geometries: { userGeometries: [{}] } })),
            getRegionsSelector(map({ geo_: 'WORLD' })),
            getRegionsSelector(map({ nutsLevel_: 'mixed' })),
            getRegionsSelector(map({ nutsLevel_: 'mixed', _mapType: 'flow' })),
            getRegionsSelector(map({ nutsLevel_: 0 })),
            getRegionsSelector(map({ _mapType: 'flow' })),
        ]
        for (const selector of selectors) {
            const paths = selector.match(/\bpath\b/g).length
            const excluded = selector.match(/path:not\(\.pattern-fill-overlay\)/g).length
            assert.equal(excluded, paths, selector)
        }
    })

    it('keeps the RS and EL exclusions for map types that need them', () => {
        assert.match(getRegionsSelector(map({})), /:not\(#em-cntrg-RS\):not\(#em-cntrg-EL\)/)
    })

    it('leaves grid cartogram cells alone', () => {
        assert.equal(getRegionsSelector(map({ gridCartogram_: true })), '#em-grid-container .em-grid-cell')
    })
})
