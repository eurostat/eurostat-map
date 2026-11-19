import assert from 'node:assert/strict'
import { test } from 'node:test'
import manifest from '../../../examples/scripts/example-manifest.js'

const { paths, isShowcasePath, typeForPath, typesForPath } = manifest

test('the gallery classifies composition and proportional symbol demos under their layers', () => {
    assert.equal(typeForPath('composition/composition.html'), 'Pie Charts')
    for (const name of ['population-change', 'population-total', 'prop-circles', 'prop-symbols']) {
        assert.equal(typeForPath(`proportional-symbols/${name}.html`), 'Proportional')
    }

    assert.deepEqual(typesForPath('multi-layer/choropleth-with-proportional-symbols.html'), [
        'Multiple Layers',
        'Choropleth',
        'Proportional',
    ])
    assert.deepEqual(typesForPath('cartogram/grid/degurba.html'), ['Cartogram', 'Bar Chart'])
})

test('the gallery reserves Other for feature demos and excludes its viewer', () => {
    const otherPaths = paths.filter((path) => isShowcasePath(path) && typesForPath(path).includes('Other'))
    assert.ok(otherPaths.includes('misc/annotations.html'))
    assert.ok(otherPaths.every((path) => path.startsWith('misc/')))
    assert.ok(!paths.includes('view.html'))
})
