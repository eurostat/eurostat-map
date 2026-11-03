import './_dom-shim.js'
import assert from 'node:assert'

const eurostatmap = await import('../build/eurostatmap.js')
const library = eurostatmap.default || eurostatmap.eurostatmap || globalThis.eurostatmap

// statData().set()/setData() must tell a stat object {value, status} from a bare value by its `value` key,
// not by truthiness, so exact zeros and empty strings are kept as values (issue #191).
{
    const sd = library.map('choropleth').statData()
    sd.setData({ A: { value: 0, status: '' }, B: 0, C: { value: 1, status: 'e' }, D: '1.0', E: { value: '' } })
    assert.deepStrictEqual(sd.get('A'), { value: 0, status: '' }, '{value: 0} stays a stat object')
    assert.deepStrictEqual(sd.get('B'), { value: 0 }, 'bare 0 is wrapped')
    assert.deepStrictEqual(sd.get('C'), { value: 1, status: 'e' }, 'regular stat object is kept')
    assert.deepStrictEqual(sd.get('D'), { value: '1.0' }, 'trailing-zero strings are kept as strings')
    assert.deepStrictEqual(sd.get('E'), { value: '' }, '{value: ""} stays a stat object')

    // overwriting an existing entry
    sd.set('A', { value: 5, status: 'p' })
    sd.set('A', { value: 0, status: 'z' })
    assert.deepStrictEqual(sd.get('A'), { value: 0, status: 'z' }, 'overwriting with {value: 0} replaces value and status')
    sd.set('C', 0)
    assert.strictEqual(sd.getValue('C'), 0, 'overwriting with a bare 0 sets the value')
}

console.log('statData tests passed')
