import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getVariableName, wrapName } from '../../../src/core/variable-names.js'

const eurostat = (title, dimensions) => ({ metadata: { label: title, dimensions } })

test("a statistic's label comes first, then the dataset title, then the author's name for it", () => {
    const map = { statData_: { a: { label_: 'Mine', ...eurostat('Title', {}) }, b: eurostat('Other', {}), density: {}, v1: {} } }
    assert.equal(getVariableName(map, 'a'), 'Mine')
    assert.equal(getVariableName(map, 'b'), 'Other')
    assert.equal(getVariableName(map, 'density'), 'density')
    assert.equal(getVariableName(map, 'v1'), undefined)
})

test('two variables of one dataset are told apart by the categories that differ', () => {
    const map = {
        statData_: {
            v1: eurostat('Population', { sex: 'Males', time: '2022' }),
            v2: eurostat('Population', { sex: 'Females', time: '2022' }),
        },
    }
    assert.equal(getVariableName(map, 'v1', ['v1', 'v2']), 'Population (Males)')
    assert.equal(getVariableName(map, 'v2', ['v1', 'v2']), 'Population (Females)')
})

test('a title that cannot tell two variables apart is not used', () => {
    const map = { statData_: { v1: eurostat('Same', {}), young: eurostat('Same', {}) } }
    assert.equal(getVariableName(map, 'v1', ['v1', 'young']), undefined)
    assert.equal(getVariableName(map, 'young', ['v1', 'young']), 'young')
})

test('long names are wrapped, cut off, and keep what tells them apart', () => {
    assert.deepEqual(wrapName('Population density', 24, 2), ['Population density'])
    const lines = wrapName('Population on 1 January by broad age group, sex and NUTS 3 region (Males)', 20, 2)
    assert.equal(lines.length, 3)
    assert.ok(lines[1].endsWith('…'))
    assert.equal(lines[2], '(Males)')
})
