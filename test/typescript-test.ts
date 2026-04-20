/**
 * TypeScript validation test file
 * This file tests that all TypeScript definitions work correctly
 */

import * as eurostatmap from '../src/eurostat-map'
import type { MapConfig, ChoroplethConfig, ProportionalSymbolConfig, CategoricalConfig } from '../src/types'

// Test 1: Basic choropleth map
const choroplethConfig: ChoroplethConfig = {
    svgId: 'map1',
    title: 'Population Density Test',
    width: 800,
    height: 600,
    nutsLevel: 2,
    stat: {
        eurostatDatasetCode: 'demo_r_d3dens',
        unitText: 'people/km²',
    },
    numberOfClasses: 7,
    classificationMethod: 'quantile',
    legend: {
        x: 500,
        y: 200,
        title: 'Density',
    },
}

const map1 = eurostatmap.map('choropleth', choroplethConfig)

// Test builder pattern methods
map1.width(900).height(700).scale(1000).nutsLevel(3).title('Updated Title').build()

// Test 2: Proportional symbol map
const psConfig: ProportionalSymbolConfig = {
    svgId: 'map2',
    title: 'Proportional Symbols',
    stat: {
        eurostatDatasetCode: 'demo_r_pjangrp3',
    },
    symbol: 'circle',
    size: 50,
    sizeMin: 5,
    sizeMax: 100,
    symbolFillStyle: '#3498db',
}

const map2 = eurostatmap.map('ps', psConfig)
map2.symbol('square').size(60).build()

// Test 3: Categorical map
const catConfig: CategoricalConfig = {
    svgId: 'map3',
    title: 'Urban Rural Typology',
    stat: {
        csvURL: './data/typology.csv',
        geoCol: 'NUTS_ID',
        valueCol: 'CATEGORY',
    },
    classToStyle: {
        urban: { fill: '#e74c3c', stroke: '#000' },
        rural: { fill: '#2ecc71', stroke: '#000' },
    },
    classToText: {
        urban: 'Urban Areas',
        rural: 'Rural Areas',
    },
}

const map3 = eurostatmap.map('categorical', catConfig)
map3.build()

// Test 4: Custom data with statData
const map4 = eurostatmap.map('choropleth', {
    svgId: 'map4',
    title: 'Custom Data',
})

map4.statData().setData({
    FR: 118.3,
    DE: 237.5,
    ES: 93.5,
    IT: 201.3,
    PL: 124.0,
})

map4.numberOfClasses(5).classificationMethod('jenks').build()

// Test 5: Utility functions
const labels = eurostatmap.getDefaultLabels()
console.log('Default labels:', labels)

// Test projection functions
const [lon, lat] = eurostatmap.projectFromMap(map1, 400, 300)
const [x, y] = eurostatmap.projectToMap(map1, 10, 50)

// Test 6: Fill pattern function
const patternFn = eurostatmap.getFillPatternDefinitionFunction({
    shape: 'circle',
    patternSize: 5,
    minSize: 1,
    maxSize: 5,
    bckColor: 'white',
    symbColor: 'black',
})

// Test 7: Advanced configurations
const advancedConfig: ChoroplethConfig = {
    svgId: 'map5',
    title: 'Advanced Choropleth',
    subtitle: 'With all features',
    width: 1000,
    height: 800,
    proj: '3035',
    scale: '20M',
    nutsLevel: 2,
    nutsYear: 2021,
    geoCenter: [4370000, 3210000],

    stat: {
        eurostatDatasetCode: 'demo_r_d3dens',
        filters: { time: '2020' },
        unitText: 'people/km²',
    },

    numberOfClasses: 9,
    classificationMethod: 'ckmeans',
    makeClassifNice: true,
    colorSchemeType: 'continuous',
    noDataFillStyle: '#cccccc',

    legend: {
        x: 600,
        y: 150,
        title: 'Population Density',
        titleFontSize: 14,
        boxWidth: 200,
        boxHeight: 300,
        orientation: 'vertical',
        ascending: true,
        noData: true,
        noDataText: 'No data available',
    },

    tooltip: {
        maxWidth: 300,
    },

    insets: [
        { geo: 'MT', scale: '01M', x: 800, y: 600 },
        { geo: 'PT20', scale: '01M', x: 50, y: 600 },
    ],

    zoomExtent: [1, 10],
    showBtns: true,

    coastal: true,
    coastalMarginWidth: 0.5,
    coastalMarginColor: '#4682b4',

    borderWidth: 0.3,
    borderColor: '#444',

    labelling: true,
    labelSizeThreshold: 5000,

    bottomText: 'Source: Eurostat',
    footnote: 'Data for 2020',

    onBuild: (map) => {
        console.log('Map built successfully!')
    },
}

const map5 = eurostatmap.map('choropleth', advancedConfig)
map5.build()

// Test 8: Type inference works correctly
const inferredMap = eurostatmap.map('choropleth', {
    title: 'Inferred Type Map',
})

// These should all have correct types inferred
inferredMap.width(800) // returns ChoroplethMap
inferredMap.numberOfClasses(5) // choropleth-specific method
inferredMap.classificationMethod('jenks') // choropleth-specific method

// Test 9: Callback with correct types
const mapWithCallback = eurostatmap.map('choropleth', {
    svgId: 'map6',
    onBuild: (map) => {
        // Map should have correct type here
        map.update()
        map.exportSVG()
    },
})

// Test 10: Version export
console.log('eurostatmap version:', eurostatmap.version)

// Export for validation
export { map1, map2, map3, map4, map5, mapWithCallback }
