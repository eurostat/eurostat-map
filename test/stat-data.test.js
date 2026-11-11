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

// A failed Eurostat request must tell the user what happened, not repeat the browser's "Failed to fetch".
{
    const DOWN =
        'The Eurostat data service is currently unavailable, possibly for maintenance (announced on ec.europa.eu/eurostat). Please try again later.'
    // the error toast needs a little more DOM than the shim provides
    document.getElementById = () => ({ appendChild: () => {} })
    globalThis.requestAnimationFrame = () => {}
    const response = (status, body, statusText = '') => ({
        ok: status >= 200 && status < 300,
        status,
        statusText,
        json: async () => JSON.parse(body),
    })
    // run one remote retrieval against a stubbed fetch and return what was reported
    const retrieve = async (fetchStub) => {
        const realFetch = globalThis.fetch
        const realError = console.error
        const logged = []
        globalThis.fetch = fetchStub
        console.error = (...args) => logged.push(args)
        try {
            const sd = library.map('choropleth').statData()
            sd.eurostatDatasetCode_ = 'demo_r_d3dens'
            let called = 0
            await new Promise((resolve) =>
                sd.retrieveFromRemote(0, 'en', () => {
                    called++
                    resolve()
                })
            )
            assert.strictEqual(called, 1, 'the callback runs once, so the loading spinner is released')
            return { message: logged.length ? logged[0][0] : undefined, sd }
        } finally {
            globalThis.fetch = realFetch
            console.error = realError
        }
    }

    // API down: the 307 to sorry.ec.europa.eu is blocked by the browser, fetch rejects with a bare TypeError
    let r = await retrieve(async () => {
        throw new TypeError('Failed to fetch')
    })
    assert.strictEqual(r.message, 'Error retrieving Eurostat data: ' + DOWN, 'blocked redirect is reported as an outage')
    assert.ok(!/Failed to fetch/.test(r.message), 'the browser message is not shown')

    // same redirect followed to the HTML "sorry" page (no CORS involved)
    r = await retrieve(async () => response(200, '<!DOCTYPE html><title>Server temporarily unavailable</title>'))
    assert.strictEqual(r.message, 'Error retrieving Eurostat data: ' + DOWN, 'an HTML page instead of JSON is an outage')

    r = await retrieve(async () => response(503, '<html>Service Unavailable</html>', 'Service Unavailable'))
    assert.strictEqual(r.message, 'Error retrieving Eurostat data: ' + DOWN, 'a 5xx is an outage')

    // offline is the user's connection, not Eurostat
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
    try {
        r = await retrieve(async () => {
            throw new TypeError('Failed to fetch')
        })
    } finally {
        if (nav) Object.defineProperty(globalThis, 'navigator', nav)
        else delete globalThis.navigator
    }
    assert.match(r.message, /No internet connection/, 'offline is reported as such')

    // the API's own errors keep their label
    r = await retrieve(async () =>
        response(400, JSON.stringify({ error: [{ status: 400, id: 100, label: 'ERR_NOT_FOUND_4: Dataflow not found' }] }), 'Bad Request')
    )
    assert.match(r.message, /Dataflow not found/, 'API error label is reported')
    assert.ok(!/unavailable/.test(r.message), 'an API error is not reported as an outage')
    assert.strictEqual(r.sd.isReady(), false, 'no data after an API error')

    // and a normal JSON-stat answer still loads
    r = await retrieve(async () =>
        response(
            200,
            JSON.stringify({
                version: '2.0',
                class: 'dataset',
                label: 'Population density',
                id: ['geo', 'time'],
                size: [2, 1],
                dimension: {
                    geo: { label: 'geo', category: { index: { FR: 0, DE: 1 }, label: { FR: 'France', DE: 'Germany' } } },
                    time: { label: 'time', category: { index: { 2021: 0 }, label: { 2021: '2021' } } },
                },
                value: { 0: 106.1, 1: 235.5 },
            })
        )
    )
    assert.strictEqual(r.message, undefined, 'no error for a valid answer')
    assert.strictEqual(r.sd.getValue('DE'), 235.5, 'JSON-stat data is indexed')

    r = await retrieve(async () => response(404, 'Not Found', 'Not Found'))
    assert.match(r.message, /404 Not Found/, 'a non-JSON 4xx reports its status')
}

console.log('statData tests passed')
