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

// 1) Zero behaviour change: a legacy facade is its own layer 0.
{
    const m = library.map('categorical')
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
    const m = library.map('categorical')
    const before = m.layers_.length
    const r = m.addLayer('pieChart') // not registered yet
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

    const m = library.map('categorical') // facade base
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

// 4b) Empty stack map and layers/addLayer behavior.
{
    const m = library.map()
    assert.strictEqual(m.layers_.length, 0, 'empty stack map starts with 0 layers')

    // Add overlay first
    const l1 = m.addLayer('dummy', { id: 'over1' })
    assert.strictEqual(m.layers_.length, 1)
    assert.strictEqual(m.layers_[0], l1)

    // Add base second
    const l2 = m.addLayer('dummyBase', { id: 'base1' })
    assert.strictEqual(m.layers_.length, 2)
    // Base must be auto-ordered first (unshifted)
    assert.strictEqual(m.layers_[0], l2, 'base layer ordered first')
    assert.strictEqual(m.layers_[1], l1, 'overlay layer ordered second')
}

// 5) Phase 3: Choropleth is migrated to a real Layer.
{
    const m = library.map('choropleth')
    assert.notStrictEqual(m.layer(0), m, 'choropleth: layer(0) is NOT the map')
    assert.strictEqual(m.layer(0).type, 'choropleth')
    assert.strictEqual(m.activeLayer(), m.layer(0), 'choropleth: active layer is layer 0')
    assert.strictEqual(m.layers_.length, 1)

    // Verify forwarding methods return the map for chaining
    assert.strictEqual(m.numberOfClasses(7), m, 'forwarded chainable method numberOfClasses() returns map')
    assert.strictEqual(m.activeLayer().numberOfClasses_, 7, 'setting numberOfClasses on map updates layer')
}

// 6) Phase 4: Proportional Symbol is migrated to a real Layer.
{
    const m = library.map('proportionalSymbol')
    assert.notStrictEqual(m.layer(0), m, 'ps: layer(0) is NOT the map')
    assert.strictEqual(m.layer(0).type, 'proportionalSymbol')
    assert.strictEqual(m.activeLayer(), m.layer(0), 'ps: active layer is layer 0')
    assert.strictEqual(m.layers_.length, 1)

    // Verify forwarding methods
    assert.strictEqual(m.psMaxSize(45), m, 'forwarded chainable method psMaxSize() returns map')
    assert.strictEqual(m.activeLayer().psMaxSize_, 45, 'setting psMaxSize on map updates layer')
}

console.log('Phase 1, Phase 3 & Phase 4 layer tests passed')

