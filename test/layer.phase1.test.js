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

// 1) Standalone factories use a real layer while preserving the fluent map facade.
{
    const m = library.map('categorical')
    assert.notStrictEqual(m.layer(0), m, 'layer(0) is a real layer')
    assert.strictEqual(m.activeLayer(), m.layer(0), 'the real layer is active')
    assert.strictEqual(m.layers_.length, 1)
    // The map-level compatibility API forwards to the active layer.
    m.encoding('fill', { stat: 'default', classes: 5 })
    assert.strictEqual(m.encoding('fill').classes, 5)
    assert.strictEqual(m.encoding('fill', { stat: 'default' }), m, 'set returns the map (chaining preserved)')
}

// 2) Every public map type has been migrated and can be added as a real layer.
{
    const types = [
        'choropleth', 'ch', 'categorical', 'ct', 'proportionalSymbol', 'proportionalSymbols', 'ps',
        'bivariateChoropleth', 'chbi', 'trivariateChoropleth', 'ternary', 'chtri',
        'stripeComposition', 'scomp', 'stripe', 'pieChart', 'pie', 'composition',
        'sparkline', 'spark', 'sparklines', 'flow', 'flowmap', 'coxcomb', 'polar',
        'alpha', 'valueByAlpha', 'mushroom', 'waffle', 'bar', 'barComposition'
    ]

    types.forEach((type) => {
        assert.ok(isLayerTypeRegistered(type), `${type} is registered`)
        const m = library.map()
        const layer = m.addLayer(type)
        assert.ok(layer?.isLayer && layer !== m, `${type} creates a real layer`)
        assert.strictEqual(layer.type, type)
    })
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

// 7) Spark's public stat({ dates }) facade expands into one shared map dataset per date.
{
    const config = {
        eurostatDatasetCode: 'demo_r_d3dens',
        filters: { unit: 'PER_KM2' },
        dates: ['2022', '2023'],
        labels: ['2022 label', '2023 label']
    }
    const m = library.map('sparkline').stat(config)
    assert.strictEqual(m.stat('default'), undefined, 'spark config is not registered as one default dataset')
    assert.strictEqual(m.stat('2022').filters.time, '2022')
    assert.strictEqual(m.stat('2023').filters.time, '2023')
    assert.deepStrictEqual(m.activeLayer()._statDates, ['2022', '2023'])
    assert.strictEqual(m.activeLayer().catLabels_['2022'], '2022 label')

    const configuredAtConstruction = library.map('sparkline', { stat: config })
    assert.strictEqual(configuredAtConstruction.stat('2022').filters.time, '2022')
    assert.deepStrictEqual(configuredAtConstruction.activeLayer()._statDates, ['2022', '2023'])
}

console.log('Phase 1, Phase 3 & Phase 4 layer tests passed')
