import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeClassBreaks, reportNonNumericValues } from '../../../src/core/class-breaks.js'

test('classes that the data fills are kept', () => {
    assert.equal(mergeClassBreaks([1, 2, 3, 4, 5, 6], [2.5, 4.5], 'quantile', 3), null)
})

test('repeated boundaries and a boundary at the lowest value are dropped', () => {
    assert.deepEqual(mergeClassBreaks([0, 0, 0, 0, 1, 2, 3, 4], [0, 0, 1.5, 3], 'quantile', 5), [1.5, 3])
})

test('fewer values than classes give one class per value', () => {
    assert.deepEqual(mergeClassBreaks([2, 1, 3, 2], [1.2, 1.6, 2, 2, 2.4, 2.8], 'quantile', 7), [1.5, 2.5])
})

test('one distinct value gives one class', () => {
    assert.deepEqual(mergeClassBreaks([0, 0, 0], [0, 0, 0], 'quantile', 4), [])
})

test('equal intervals keep their empty classes', () => {
    assert.equal(mergeClassBreaks([0, 10], [2.5, 5, 7.5], 'equinter', 4), null)
})

test('values that are not numbers are reported once, categories and no data are not', () => {
    const errors = []
    const warn = console.warn
    console.warn = () => {}
    try {
        const map = { onError_: (e) => errors.push(e) }
        reportNonNumericValues(map, [1, '2', ':', 'closed'], { closed: '#000' })
        assert.equal(errors.length, 0)
        reportNonNumericValues(map, ['1,5', '2,5', 3])
    } finally {
        console.warn = warn
    }
    assert.equal(errors.length, 1)
    assert.equal(errors[0].type, 'data')
    assert.match(errors[0].message, /2 values are not numbers, for example '1,5'/)
})
