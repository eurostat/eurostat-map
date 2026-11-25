import '../helpers/dom-shim.js'

import assert from 'node:assert'

const eurostatmap = await import('../../build/eurostatmap.js')
const library = eurostatmap.default || eurostatmap.eurostatmap || globalThis.eurostatmap

// Line widths can share one value domain across maps (small multiples).
{
    const m = library.map('flow')
    assert.strictEqual(m.flowSettings().widthDomain, null)
    m.flowSettings({ widthDomain: [0, 500] })
    assert.deepStrictEqual(m.flowSettings().widthDomain, [0, 500])
}

// Routes are straight lines in the map projection unless great circles are asked for.
{
    const m = library.map('flow')
    assert.strictEqual(m.flowSettings().lineGeometry, 'straight')
    assert.strictEqual(m.flowSettings({ lineGeometry: 'greatCircle' }), m, 'set returns the map (chaining preserved)')
    assert.strictEqual(m.flowSettings().lineGeometry, 'greatCircle')
    assert.strictEqual(library.map('flow', { flowSettings: { lineGeometry: 'greatCircle' } }).flowSettings().lineGeometry, 'greatCircle')
}

// A partial bundleSettings object keeps the defaults for the rest. Replacing them all left alphaDecay undefined,
// which turned every bundled route into NaN.
{
    const m = library.map('flow')
    m.flowSettings({ bundleSettings: { chargeStrength: -20 } })
    assert.deepStrictEqual(m.flowSettings().bundleSettings, {
        alphaDecay: 0.1,
        chargeStrength: -20,
        distanceMax: null,
        linkStrength: 0.7,
        linkIterations: 1,
    })
    m.flowSettings({ bundleSettings: { linkStrength: 0.2 } })
    assert.strictEqual(m.flowSettings().bundleSettings.chargeStrength, -20, 'an earlier override is kept')
    assert.strictEqual(m.flowSettings().bundleSettings.linkStrength, 0.2)
}

console.log('flow-settings.test: ok')

// Any SVG (for example a composite of several maps) can be exported to PNG.
assert.strictEqual(typeof library.exportSvgToPNG, 'function', 'exportSvgToPNG is public')
