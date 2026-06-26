globalThis.self = globalThis
globalThis.window = globalThis
globalThis.location = {
    href: 'http://localhost/',
    hostname: 'localhost'
}
globalThis.document = {
    documentElement: {},
    head: {
        appendChild: () => {}
    },
    querySelector: () => ({
        appendChild: () => {},
        insertBefore: () => {}
    }),
    createElement: () => ({
        setAttribute: () => {},
        style: {},
        appendChild: () => {}
    }),
    createTextNode: () => ({})
}

import assert from 'node:assert'

const eurostatmap = await import('../build/eurostatmap.js')
const library = eurostatmap.default || eurostatmap.eurostatmap || globalThis.eurostatmap

const { registerLayerType, isLayerTypeRegistered } = library

// 1) Zero behaviour change: a legacy choropleth is its own layer 0 (facade).
{
    const m = library.map('choropleth')
    assert.strictEqual(m.layer(0), m, 'facade: layer(0) is the map')
    assert.strictEqual(m.activeLayer(), m, 'facade: active layer is the map')
    assert.strictEqual(m.layers_.length, 1)
    // encoding API works on the facade (relocated, behaviour-identical)
    m.encoding('fill', { stat: 'default', classes: 5 })
    assert.strictEqual(m.encoding('fill').classes, 5)
    assert.strictEqual(m.encoding('fill', { stat: 'default' }), m, 'set returns the map (chaining preserved)')
}

// 2) addLayer of an UNREGISTERED type is inert and keeps the facade.
{
    const m = library.map('choropleth')
    const before = m.layers_.length
    const r = m.addLayer('proportionalSymbol') // not registered in Phase 1
    assert.strictEqual(m.layers_.length, before, 'unregistered addLayer does not mutate the stack')
    assert.strictEqual(r, m.activeLayer())
}

// 3) createLayer path via a dummy registered overlay: facade base retained, overlay pushed.
{
    registerLayerType('dummy', 'overlay', (layer) => {
        layer.updateClassification = () => layer
        layer.updateStyle = () => layer
    })
    assert.ok(isLayerTypeRegistered('dummy'))

    const m = library.map('choropleth') // facade base
    const l = m.addLayer('dummy', { encoding: { size: { stat: 'population' } } })

    assert.ok(l.isLayer && l.type === 'dummy' && l.role === 'overlay')
    assert.strictEqual(m.layers_.length, 2, 'facade base retained + overlay added')
    assert.strictEqual(m.layer(1), l)
    assert.strictEqual(m.activeLayer(), m.layers_[0], 'active layer is still the base')
    assert.strictEqual(l.encoding('size').stat, 'population', 'layer owns its encodings')
}

// 4) Single-base enforcement.
{
    registerLayerType('dummyBase', 'base', (layer) => {
        layer.updateStyle = () => layer
    })
    const m = library.map() // empty stack
    m.addLayer('dummyBase')
    const before = m.layers_.length
    m.addLayer('dummyBase') // second base must be rejected
    assert.strictEqual(m.layers_.length, before, 'second base rejected')
}

console.log('Phase 1 layer tests passed')
