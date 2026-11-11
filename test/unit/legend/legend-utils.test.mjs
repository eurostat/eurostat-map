import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { formatSizeLabel, getMaxDomainPrecision } from '../../../src/legend/legend-utils.js'

describe('getMaxDomainPrecision', () => {
    const classifier = (max) => ({ domain: () => [0, max] })

    it('counts the decimals of the domain maximum', () => {
        assert.equal(getMaxDomainPrecision(classifier(12.345)), 3)
        assert.equal(getMaxDomainPrecision(classifier(100)), 0)
    })

    it('ignores floating point noise', () => {
        assert.equal(getMaxDomainPrecision(classifier(0.1 + 0.2)), 1)
    })

    it('returns 0 without a usable classifier', () => {
        assert.equal(getMaxDomainPrecision(null), 0)
        assert.equal(getMaxDomainPrecision({}), 0)
        assert.equal(getMaxDomainPrecision(classifier(Infinity)), 0)
    })
})

describe('formatSizeLabel', () => {
    it('writes values under a million in full, with a space as thousand separator', () => {
        assert.equal(formatSizeLabel(15000), '15 000')
        assert.equal(formatSizeLabel(999999), '999 999')
    })

    it('keeps the decimals of the value unless a precision is given', () => {
        assert.equal(formatSizeLabel(12.25), '12.25')
        assert.equal(formatSizeLabel(1234.5678, 1), '1 234.6')
    })

    it('hides floating point noise', () => {
        assert.equal(formatSizeLabel(0.1 + 0.2), '0.3')
    })

    it('spells out millions and above with one decimal by default', () => {
        assert.equal(formatSizeLabel(4219310), '4.2 million')
        assert.equal(formatSizeLabel(2500000000), '2.5 billion')
        // a round number of millions follows the same rule, not its own digit count
        assert.equal(formatSizeLabel(4000000), '4 million')
    })

    it('uses the requested precision in word notation', () => {
        assert.equal(formatSizeLabel(4219310, 2), '4.22 million')
    })

    it('hands the value to a custom formatter', () => {
        const percent = (v) => v + '%'
        assert.equal(formatSizeLabel(5, percent), '5%')
    })

    it('returns an empty label for non-finite values', () => {
        for (const v of [NaN, Infinity, undefined, null]) assert.equal(formatSizeLabel(v), '')
    })
})
