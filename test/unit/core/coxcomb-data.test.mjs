import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    buildMonthData,
    computeCoxStatusMap,
    computeTotals,
    createAngleScale,
    getActiveKeys,
    getRegionTotal,
} from '../../../src/layers/composition/coxcomb-data.js'
import { statData } from '../../../src/core/stat-data.js'

/** A layer with two periods, two categories and, optionally, a total series. */
const layer = ({ total = false } = {}) => {
    const stats = {
        'jan:A': statData().setData({ FR: 2, DE: 1, ES: ':' }),
        'jan:B': statData().setData({ FR: 3 }),
        'feb:A': statData().setData({ FR: 4 }),
        'feb:B': statData().setData({ FR: 1 }),
        'jan:T': statData().setData({ FR: 8 }),
        'feb:T': statData().setData({ FR: 5 }),
    }
    return { _coxTimes: ['jan', 'feb'], _coxCategoryCodes: ['A', 'B'], totalCode_: total ? 'T' : undefined, statData: (key) => stats[key] }
}

describe('coxcomb data', () => {
    it('sums the categories per period and per year', () => {
        const out = layer()
        computeTotals(out)
        assert.equal(out.monthlyTotals.FR.jan, 5)
        assert.equal(getRegionTotal(out, 'FR'), 10)
        assert.equal(getRegionTotal(out, 'IT'), undefined)
    })

    it('uses the total series when there is one', () => {
        const out = layer({ total: true })
        computeTotals(out)
        assert.equal(getRegionTotal(out, 'FR'), 13)
    })

    it('adds what the total has beyond the categories as "other"', () => {
        const out = layer({ total: true })
        const rows = buildMonthData(out, 'FR', out._coxTimes, out._coxCategoryCodes)
        assert.deepEqual(rows, [
            { month: 'jan', A: 2, B: 3, other: 3 },
            { month: 'feb', A: 4, B: 1 },
        ])
        assert.equal(out._anyRegionHasOther_, true)
        assert.deepEqual(getActiveKeys(rows, out._coxCategoryCodes), ['A', 'B', 'other'])
    })

    it('drops empty periods and "other" when nothing is left over', () => {
        const out = layer()
        assert.deepEqual(buildMonthData(out, 'DE', out._coxTimes, out._coxCategoryCodes), [{ month: 'jan', A: 1, B: 0 }])
        assert.deepEqual(buildMonthData(out, 'IT', out._coxTimes, out._coxCategoryCodes), [])
        assert.deepEqual(getActiveKeys([{ A: 1 }], ['A']), ['A'])
    })

    it('tells regions with data from regions marked as having none', () => {
        const out = layer()
        computeCoxStatusMap(out)
        assert.deepEqual(out.coxStatus_.get('FR'), { value: 0 })
        assert.deepEqual(out.coxStatus_.get('ES'), { value: ':' })
        assert.equal(out.coxStatus_.get('IT'), undefined)
    })

    it('gives each period an equal slice of the circle', () => {
        const angle = createAngleScale(['jan', 'feb', 'mar', 'apr'])
        assert.equal(angle('jan'), 0)
        assert.equal(angle.bandwidth(), Math.PI / 2)
    })
})
