import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { statData } from '../../../src/core/stat-data.js'

describe('statData values', () => {
    // set()/setData() must tell a stat object {value, status} from a bare value by its `value` key,
    // not by truthiness, so exact zeros and empty strings are kept as values (issue #191).
    it('setData keeps stat objects and wraps bare values', () => {
        const sd = statData().setData({ A: { value: 0, status: '' }, B: 0, C: { value: 1, status: 'e' }, D: '1.0', E: { value: '' } })
        assert.deepEqual(sd.get('A'), { value: 0, status: '' }, '{value: 0} stays a stat object')
        assert.deepEqual(sd.get('B'), { value: 0 }, 'bare 0 is wrapped')
        assert.deepEqual(sd.get('C'), { value: 1, status: 'e' })
        assert.deepEqual(sd.get('D'), { value: '1.0' }, 'trailing-zero strings are kept as strings')
        assert.deepEqual(sd.get('E'), { value: '' }, '{value: ""} stays a stat object')
    })

    it('set overwrites an existing entry, including with zero', () => {
        const sd = statData().setData({ A: { value: 5, status: 'p' }, C: 1 })
        sd.set('A', { value: 0, status: 'z' })
        assert.deepEqual(sd.get('A'), { value: 0, status: 'z' })
        sd.set('C', 0)
        assert.equal(sd.getValue('C'), 0)
    })

    it('set is chainable and creates the index on first use', () => {
        const sd = statData()
        assert.equal(sd.set('FR', 3), sd)
        assert.deepEqual(sd.get(), { FR: { value: 3 } })
    })

    it('setData replaces the previous data', () => {
        const sd = statData().setData({ A: 1 }).setData({ B: 2 })
        assert.deepEqual(sd.get(), { B: { value: 2 } })
    })

    it('get and getValue return undefined for an unknown region or before any data', () => {
        assert.equal(statData().get('FR'), undefined)
        assert.equal(statData().getValue('FR'), undefined)
        assert.equal(statData().setData({ A: 1 }).getValue('FR'), undefined)
    })

    it('setManualMultiDate indexes values by region then date', () => {
        const sd = statData().setManualMultiDate({ FR: { 2020: 1, 2021: 2 } })
        assert.deepEqual(sd.get('FR'), { 2020: { value: 1 }, 2021: { value: 2 } })
    })

    it('config properties become attributes', () => {
        const sd = statData({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
        assert.equal(sd.eurostatDatasetCode_, 'demo_r_d3dens')
        assert.equal(sd.unitText(), 'people/km²')
        assert.equal(sd.unitText('other'), sd, 'the setter is chainable')
        assert.equal(sd.unitText(), 'other')
    })
})

describe('statData summaries', () => {
    it('reports whether it holds data', () => {
        const sd = statData()
        assert.equal(sd.hasData(), false)
        assert.equal(sd.isReady(), false)
        assert.equal(sd.setData({}).hasData(), false)
        assert.equal(sd.setData({ A: 1 }).hasData(), true)
        assert.equal(sd.isReady(), true)
    })

    it('hasNumericData is false for purely categorical data', () => {
        assert.equal(statData().setData({ A: 'urban', B: 'rural' }).hasNumericData(), false)
        assert.equal(statData().setData({ A: 'urban', B: 3 }).hasNumericData(), true)
        assert.equal(statData().hasNumericData(), false)
    })

    it('getArray returns the values, keeping zeros and dropping missing ones', () => {
        const sd = statData().setData({ A: 0, B: 5, C: null, D: undefined, E: 2 })
        assert.deepEqual(sd.getArray(), [0, 5, 2])
        assert.equal(statData().getArray(), undefined)
    })

    it('getUniqueValues removes duplicates', () => {
        assert.deepEqual(statData().setData({ A: 'x', B: 'y', C: 'x' }).getUniqueValues(), ['x', 'y'])
    })

    it('getMin and getMax ignore the no-data marker and count zero', () => {
        const sd = statData().setData({ A: 4, B: ':', C: 0, D: -2.5, E: 11 })
        assert.equal(sd.getMin(), -2.5)
        assert.equal(sd.getMax(), 11)
        assert.equal(statData().getMin(), undefined)
    })
})

describe('statData preprocess and transform', () => {
    it('preprocess can replace a value, a whole entry, or filter a region out', () => {
        const sd = statData()
        sd.preprocess_ = (id, value) => {
            if (id === 'DROP_NULL') return null
            if (id === 'DROP_FALSE') return false
            if (id === 'ENTRY') return { value: value * 10, status: 'e' }
            return value + 1
        }
        sd.setData({ A: 1, ENTRY: 2, DROP_NULL: 3, DROP_FALSE: 4 })
        assert.deepEqual(sd.get(), { A: { value: 2 }, ENTRY: { value: 20, status: 'e' } })
    })

    it('preprocess receives the region id, the value and the entry', () => {
        const calls = []
        const sd = statData()
        sd.preprocess_ = (...args) => {
            calls.push(args)
            return args[1]
        }
        sd.setData({ FR: { value: 7, status: 'p' } })
        assert.deepEqual(calls, [['FR', 7, { value: 7, status: 'p' }]])
    })

    it('preprocess can set a value to zero without dropping the region', () => {
        const sd = statData()
        sd.preprocess_ = () => 0
        sd.setData({ A: 5 })
        assert.deepEqual(sd.get('A'), { value: 0 })
    })

    it('transform applies to values but not to missing ones', () => {
        const sd = statData()
        sd.transform_ = (v) => v * 2
        sd.setData({ A: 2, B: ':', C: null, D: 0 })
        assert.deepEqual(
            ['A', 'B', 'C', 'D'].map((id) => sd.getValue(id)),
            [4, ':', null, 0]
        )
    })

    it('transform runs after preprocess', () => {
        const sd = statData()
        sd.preprocess_ = (id, value) => value + 1
        sd.transform_ = (v) => v * 10
        sd.setData({ A: 1 })
        assert.equal(sd.getValue('A'), 20)
    })
})

describe('statData remote retrieval (Eurostat API)', () => {
    const DOWN =
        'The Eurostat data service is currently unavailable, possibly for maintenance (announced on ec.europa.eu/eurostat). Please try again later.'

    const realFetch = globalThis.fetch
    const realError = console.error
    const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    afterEach(() => {
        globalThis.fetch = realFetch
        console.error = realError
        if (realNavigator) Object.defineProperty(globalThis, 'navigator', realNavigator)
    })

    const response = (status, body, statusText = '') => ({
        ok: status >= 200 && status < 300,
        status,
        statusText,
        json: async () => JSON.parse(body),
    })

    const jsonstat = JSON.stringify({
        version: '2.0',
        class: 'dataset',
        label: 'Population density',
        id: ['geo', 'time'],
        size: [4, 1],
        dimension: {
            geo: { label: 'geo', category: { index: { FR: 0, DE: 1, IT: 2, PTZZ: 3 } } },
            time: { label: 'time', category: { index: { 2021: 0 } } },
        },
        value: { 0: 106.1, 1: 235.5, 3: 1 },
        status: { 1: 'p' },
    })

    // run one retrieval against a stubbed fetch; returns the stat data, the requested URLs and what was logged
    const retrieve = async (fetchStub, { nutsLevel = 0, config = { eurostatDatasetCode: 'demo_r_d3dens' }, setup } = {}) => {
        const urls = []
        const logged = []
        globalThis.fetch = (url) => {
            urls.push(url)
            return fetchStub(url)
        }
        console.error = (...args) => logged.push(args)
        const sd = statData(config)
        if (setup) setup(sd)
        let calls = 0
        await new Promise((resolve) =>
            sd.retrieveFromRemote(nutsLevel, 'en', () => {
                calls++
                resolve()
            })
        )
        // the callback releases the caller's loading spinner: it has to run exactly once, error or not
        assert.equal(calls, 1)
        return { sd, urls, message: logged.length ? logged[0][0] : undefined }
    }

    it('indexes a JSON-stat answer by region, with status flags and metadata', async () => {
        const { sd, message } = await retrieve(async () => response(200, jsonstat))
        assert.equal(message, undefined)
        assert.deepEqual(sd.get('FR'), { value: 106.1, status: null })
        assert.deepEqual(sd.get('DE'), { value: 235.5, status: 'p' })
        assert.equal(sd.metadata.label, 'Population density')
        assert.equal(sd.getTime(), '2021')
    })

    it('turns missing values into the no-data marker and drops pseudo-regions', async () => {
        const { sd } = await retrieve(async () => response(200, jsonstat))
        assert.equal(sd.getValue('IT'), ':')
        assert.equal(sd.get('PTZZ'), undefined)
    })

    it('applies preprocess and transform to remote data', async () => {
        const { sd } = await retrieve(async () => response(200, jsonstat), {
            setup: (sd) => {
                sd.transform_ = (v) => Math.round(v)
            },
        })
        assert.equal(sd.getValue('FR'), 106)
        assert.equal(sd.getValue('IT'), ':')
    })

    it('requests the geo level of the map', async () => {
        assert.match((await retrieve(async () => response(200, jsonstat), { nutsLevel: 0 })).urls[0], /&geoLevel=country(&|$)/)
        assert.match((await retrieve(async () => response(200, jsonstat), { nutsLevel: 2 })).urls[0], /&geoLevel=nuts2(&|$)/)
    })

    it('requests every level for a mixed-level map', async () => {
        const { urls } = await retrieve(async () => response(200, jsonstat), { nutsLevel: 'mixed' })
        assert.doesNotMatch(urls[0], /geoLevel/)
    })

    it('respects an explicit geoLevel or geo filter over the map level', async () => {
        const withFilters = (filters) => ({ nutsLevel: 'mixed', config: { eurostatDatasetCode: 'demo_r_d3dens', filters } })
        let r = await retrieve(async () => response(200, jsonstat), withFilters({ geoLevel: 'nuts3' }))
        assert.match(r.urls[0], /&geoLevel=nuts3(&|$)/)
        r = await retrieve(async () => response(200, jsonstat), { ...withFilters({ geo: ['FR', 'DE'] }), nutsLevel: 2 })
        assert.match(r.urls[0], /&geo=FR&geo=DE/)
        assert.doesNotMatch(r.urls[0], /geoLevel/)
    })

    // When the API is down, the EC proxy redirects (307) to sorry.ec.europa.eu; a browser blocks
    // that response and fetch rejects with a bare TypeError.
    it('reports a blocked request as an outage, not as "Failed to fetch"', async () => {
        const { sd, message } = await retrieve(async () => {
            throw new TypeError('Failed to fetch')
        })
        assert.equal(message, 'Error retrieving Eurostat data: ' + DOWN)
        assert.equal(sd.hasData(), false)
    })

    it('reports an HTML page instead of JSON as an outage', async () => {
        const { message } = await retrieve(async () => response(200, '<!DOCTYPE html><title>Server temporarily unavailable</title>'))
        assert.equal(message, 'Error retrieving Eurostat data: ' + DOWN)
    })

    it('reports a 5xx or a 429 as an outage', async () => {
        for (const status of [500, 503, 429]) {
            const { message } = await retrieve(async () => response(status, '<html>error</html>'))
            assert.equal(message, 'Error retrieving Eurostat data: ' + DOWN, String(status))
        }
    })

    it('blames the connection, not Eurostat, when the browser is offline', async () => {
        Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
        const { message } = await retrieve(async () => {
            throw new TypeError('Failed to fetch')
        })
        assert.match(message, /No internet connection/)
    })

    it("reports the API's own error label", async () => {
        const body = JSON.stringify({ error: [{ status: 400, id: 100, label: 'ERR_NOT_FOUND_4: Dataflow not found' }] })
        const { sd, message } = await retrieve(async () => response(400, body, 'Bad Request'))
        assert.match(message, /Dataflow not found/)
        assert.doesNotMatch(message, /unavailable/)
        assert.equal(sd.hasData(), false)
    })

    it('reports the status of a non-JSON client error', async () => {
        const { message } = await retrieve(async () => response(404, 'Not Found', 'Not Found'))
        assert.match(message, /404 Not Found/)
    })
})
