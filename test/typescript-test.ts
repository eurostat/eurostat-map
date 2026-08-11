/**
 * TypeScript validation test file
 * This file tests that all TypeScript definitions work correctly
 */

import * as eurostatmap from '../src/index'
import type {
    MapConfig,
    ChoroplethConfig,
    ProportionalSymbolConfig,
    CategoricalMapConfig,
    SparkMapConfig,
    LocationConfig,
    Layer,
} from '../src/types'

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
map1.width(900).height(700).scale('20M').nutsLevel(3).title('Updated Title').build()
map1.labels({
    values: true,
    backgrounds: true,
    statLabelTextColor: '#ffffff',
    backgroundPadding: { x: 6, y: 3 },
    backgroundShape: 'rect',
    backgroundBorderRadius: 4,
})

// Choropleth-specific methods, including the categorical-exception fields and highlight helpers
map1
    .categoryFillStyle({ '-': '#cccccc' })
    .categoryText({ '-': 'No railway lines' })
    .highlightRegion('DE')
    .clearHighlight()

// Test 2: Proportional symbol map
const psConfig: ProportionalSymbolConfig = {
    svgId: 'map2',
    title: 'Proportional Symbols',
    stat: {
        eurostatDatasetCode: 'demo_r_pjangrp3',
    },
    psSettings: {
        shape: 'circle',
        minSize: 5,
        maxSize: 100,
        fill: '#3498db',
        sizeScale: 'sqrt',
    },
}

const map2 = eurostatmap.map('ps', psConfig)
map2.psShape('square').psMaxSize(60).psMinSize(4).dorling(true).build()

// Test 3: Categorical map
const catConfig: CategoricalMapConfig = {
    svgId: 'map3',
    title: 'Urban Rural Typology',
    stat: {
        csvURL: './data/typology.csv',
        geoCol: 'NUTS_ID',
        valueCol: 'CATEGORY',
    },
    classToFillStyle: {
        urban: '#e74c3c',
        rural: '#2ecc71',
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

// Test projection functions (may return null if projection isn't ready)
const fromMap = eurostatmap.projectFromMap(map1, 400, 300)
const toMap = eurostatmap.projectToMap(map1, 10, 50)
if (fromMap) {
    const [lon, lat] = fromMap
}
if (toMap) {
    const [x, y] = toMap
}

// Test 6: Fill pattern function
const patternFn = eurostatmap.getFillPatternDefinitionFunction({
    shape: 'circle',
    patternSize: 5,
    minSize: 1,
    maxSize: 5,
    bckColor: 'white',
    symbColor: 'black',
})

// Deprecated alias, kept for backwards compatibility
const patternFnLegacy = eurostatmap.getFillPatternDefinitionFun({ shape: 'square' })

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
        width: 200,
        height: 300,
        orientation: 'vertical',
        ascending: true,
        noData: true,
        noDataText: 'No data available',
    },

    tooltip: {
        textFunction: (region, map) => `${region.properties.na}`,
    },

    insets: [
        { geo: 'MT', scale: '01M', x: 800, y: 600 },
        { geo: 'PT20', scale: '01M', x: 50, y: 600 },
    ],

    zoomExtent: [1, 10],
    zoomButtons: true,

    drawCoastalMargin: true,
    coastalMarginSettings: {
        strokeWidth: 0.5,
        color: '#4682b4',
    },

    labels: {
        values: true,
    },

    footnote: 'Data for 2020',

    // Pattern fill overlay for specific regions
    patternFill: [{ pattern: 'hatching', regionIds: ['DE', 'FR'], color: '#000', legendLabel: 'Estimated' }],

    // Minimap globe inset
    minimap: {
        x: 705,
        y: 90,
        z: 160,
        size: 160,
        highlightIds: ['DE'],
    },

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
        map.updateStyle()
        map.exportMapToSVG('choropleth-export')
    },
})

// Test 10: Version export
console.log('eurostatmap version:', eurostatmap.version)

// Test 11: Location markers
const locationConfig: LocationConfig = {
    x: 13.4,
    y: 52.5,
    id: 'berlin',
    label: 'Berlin',
    shape: 'pin',
    radius: 8,
    fill: '#00aeef',
    opacity: 0.85,
    stroke: '#fff',
    strokeWidth: 1.5,
    labelOffset: [7, -4],
    labelStyle: {
        fontSize: '12px',
        fontFamily: 'inherit',
        fill: '#222',
        opacity: 1,
        haloColor: '#fff',
        haloWidth: 3,
        textAnchor: 'middle',
    },
}

map1.addLocation(locationConfig).removeLocation('berlin').clearLocations()
map1.locations([locationConfig])
const locations = map1.locations()
map1.updateLocations()

// Test 12: Sparkline map with a dates-keyed stat config
const sparkConfig: SparkMapConfig = {
    svgId: 'map7',
    title: 'Sparkline Test',
    stat: {
        eurostatDatasetCode: 'demo_pjan',
        dates: ['2018', '2019', '2020', '2021'],
        labels: ['2018', '2019', '2020', '2021'],
        unitText: 'people',
    },
    sparkSettings: {
        type: 'area',
        lineWidth: 70,
        lineHeight: 20,
    },
}

const map7 = eurostatmap.map('sparkline', sparkConfig)
map7.statSpark({ eurostatDatasetCode: 'demo_pjan', dates: ['2018', '2019'] }).build()

// Test 13: Multi-layer map + layer registry utilities
const multiLayerMap = eurostatmap.map()
const choroplethLayer: Layer = multiLayerMap.addLayer('choropleth', {
    encoding: { fill: { stat: 'default' } },
})
multiLayerMap.stat({ eurostatDatasetCode: 'demo_r_d3dens' })
multiLayerMap.build()

const isChoroplethRegistered: boolean = eurostatmap.isLayerTypeRegistered('choropleth')

// Export for validation
export { map1, map2, map3, map4, map5, map7, mapWithCallback, locations, choroplethLayer, isChoroplethRegistered }
