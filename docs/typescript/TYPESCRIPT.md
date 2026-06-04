# TypeScript Support

eurostat-map includes comprehensive TypeScript definitions for all APIs, providing full IntelliSense and type safety for TypeScript projects.

## Installation

```bash
npm install eurostat-map
```

TypeScript definitions are included automatically - no additional @types package is needed.

## Basic Usage

### JavaScript (CommonJS)

```javascript
const eurostatmap = require('eurostatmap')

const map = eurostatmap.map('choropleth', {
    title: 'Population Density',
    stat: { eurostatDatasetCode: 'demo_r_d3dens' },
})
map.build()
```

### JavaScript (ES Modules)

```javascript
import eurostatmap from 'eurostatmap'

const map = eurostatmap.map('choropleth', {
    title: 'Population Density',
    stat: { eurostatDatasetCode: 'demo_r_d3dens' },
})
map.build()
```

### TypeScript

```typescript
import eurostatmap from 'eurostatmap'
import type { ChoroplethConfig } from 'eurostatmap'

const config: ChoroplethConfig = {
    svgId: 'map',
    title: 'Population Density in Europe',
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
        title: 'Population Density',
    },
}

const map = eurostatmap.map('choropleth', config)
map.build()
```

## Type Definitions

### Map Types

All map types are fully typed with specific configuration interfaces:

```typescript
import type {
    ChoroplethConfig,
    ProportionalSymbolConfig,
    CategoricalConfig,
    BivariateChoroplethConfig,
    TrivariateChoroplethConfig,
    PieChartConfig,
    SparklineConfig,
    FlowMapConfig,
} from 'eurostatmap'
```

### Choropleth Maps

```typescript
import eurostatmap from 'eurostatmap'
import type { ChoroplethConfig } from 'eurostatmap'

const config: ChoroplethConfig = {
    svgId: 'choropleth-map',
    title: 'GDP per capita',
    stat: {
        eurostatDatasetCode: 'nama_10r_2gdp',
        filters: { unit: 'EUR_HAB', time: '2020' },
        unitText: '€/inhabitant',
    },
    numberOfClasses: 7,
    classificationMethod: 'jenks', // 'quantile' | 'ckmeans' | 'jenks' | 'equinter' | 'threshold'
    colorSchemeType: 'discrete', // or 'continuous'
    colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c'],
    legend: {
        title: 'GDP per capita (€)',
        x: 600,
        y: 200,
    },
}

const map = eurostatmap.map('choropleth', config)
map.build()

// Builder pattern with type safety
map.numberOfClasses(9).classificationMethod('ckmeans').update()
```

### Proportional Symbol Maps

```typescript
import eurostatmap from 'eurostatmap'
import type { ProportionalSymbolConfig } from 'eurostatmap'

const config: ProportionalSymbolConfig = {
    svgId: 'symbol-map',
    title: 'Total Population',
    stat: {
        eurostatDatasetCode: 'demo_r_pjangrp3',
        filters: { age: 'TOTAL', sex: 'T', time: '2020' },
        unitText: 'inhabitants',
    },
    symbol: 'circle', // or 'square'
    size: 50,
    sizeMin: 5,
    sizeMax: 100,
    symbolFillStyle: '#3498db',
    symbolStrokeStyle: '#2c3e50',
    symbolStrokeWidth: 0.5,
    psScale: 'sqrt', // 'sqrt' | 'linear' | 'radial'
}

const map = eurostatmap.map('proportionalSymbol', config)
map.build()
```

### Categorical Maps

```typescript
import eurostatmap from 'eurostatmap'
import type { CategoricalConfig } from 'eurostatmap'

const config: CategoricalConfig = {
    svgId: 'categorical-map',
    title: 'Urban-Rural Typology',
    stat: {
        csvURL: './data/typology.csv',
        geoCol: 'geo',
        valueCol: 'type',
    },
    classToStyle: {
        urban: { fill: '#e74c3c', stroke: '#c0392b', strokeWidth: 1 },
        intermediate: { fill: '#f39c12', stroke: '#d68910', strokeWidth: 1 },
        rural: { fill: '#2ecc71', stroke: '#27ae60', strokeWidth: 1 },
    },
    classToText: {
        urban: 'Urban Areas',
        intermediate: 'Intermediate Areas',
        rural: 'Rural Areas',
    },
}

const map = eurostatmap.map('categorical', config)
map.build()
```

## Builder Pattern with Type Safety

All map objects support the builder pattern with full type safety:

```typescript
import eurostatmap from 'eurostatmap'

const map = eurostatmap.map('choropleth', {
    svgId: 'my-map',
    title: 'Population Density',
})

// Chain methods with IntelliSense support
map.width(1000).height(800).scale(1200).nutsLevel(3).numberOfClasses(9).classificationMethod('jenks').build()
```

## Working with Statistical Data

```typescript
import eurostatmap from 'eurostatmap'

const map = eurostatmap.map('choropleth', {
    svgId: 'custom-data-map',
    title: 'Custom Statistical Data',
})

// Set custom data
map.statData().setData({
    FR: 118.3,
    DE: 237.5,
    ES: 93.5,
    IT: 201.3,
    PL: 124.0,
    UK: 270.7,
})

map.numberOfClasses(5).classificationMethod('quantile').build()

// Get data back
const data = map.statData().getData()
console.log(data) // { FR: 118.3, DE: 237.5, ... }
```

## Custom Callbacks

```typescript
import eurostatmap from 'eurostatmap'
import type { EurostatMap } from 'eurostatmap'

const map = eurostatmap.map('choropleth', {
    svgId: 'callback-map',
    title: 'Map with Callbacks',
    onBuild: (map: EurostatMap) => {
        console.log('Map built successfully!')
        // Access map methods
        console.log('Map width:', map.width())
        console.log('Map scale:', map.scale())
    },
})

map.build()
```

## Utility Functions

```typescript
import eurostatmap from 'eurostatmap'
import type { FillPatternOptions } from 'eurostatmap'

// Get default labels
const labels = eurostatmap.getDefaultLabels()

// Projection utilities
const map = eurostatmap.map('choropleth', { svgId: 'map' })
map.build()

// Convert from pixel coordinates to geographic coordinates
const [lon, lat] = eurostatmap.projectFromMap(map, 400, 300)
console.log(`Longitude: ${lon}, Latitude: ${lat}`)

// Convert from geographic coordinates to pixel coordinates
const [x, y] = eurostatmap.projectToMap(map, 10.0, 50.0)
console.log(`X: ${x}, Y: ${y}`)

// Fill pattern definition
const patternOptions: FillPatternOptions = {
    shape: 'circle',
    patternSize: 5,
    minSize: 1,
    maxSize: 5,
    bckColor: 'white',
    symbColor: 'black',
}

const patternFn = eurostatmap.getFillPatternDefinitionFunction(patternOptions)
```

## Advanced Configuration

```typescript
import eurostatmap from 'eurostatmap'
import type { ChoroplethConfig, InsetConfig } from 'eurostatmap'

const insets: InsetConfig[] = [
    { geo: 'MT', scale: '01M', x: 800, y: 600 },
    { geo: 'PT20', scale: '01M', x: 50, y: 600 },
    { geo: 'CARIB', scale: '01M', x: 50, y: 400 },
]

const config: ChoroplethConfig = {
    svgId: 'advanced-map',
    title: 'Advanced Choropleth Map',
    subtitle: 'With comprehensive configuration',
    width: 1200,
    height: 900,

    // Geographic settings
    proj: '3035',
    scale: '20M',
    nutsLevel: 2,
    nutsYear: 2021,
    geoCenter: [4370000, 3210000],

    // Statistical data
    stat: {
        eurostatDatasetCode: 'demo_r_d3dens',
        filters: { time: '2020' },
        unitText: 'people/km²',
    },

    // Classification
    numberOfClasses: 9,
    classificationMethod: 'ckmeans',
    makeClassifNice: true,

    // Styling
    backgroundColor: '#f0f0f0',
    noDataFillStyle: '#cccccc',

    // Legend
    legend: {
        x: 650,
        y: 150,
        title: 'Population Density',
        titleFontSize: 16,
        boxWidth: 250,
        boxHeight: 350,
        orientation: 'vertical',
        ascending: true,
        noData: true,
        noDataText: 'No data available',
    },

    // Tooltip
    tooltip: {
        maxWidth: 350,
        textFunction: (region, map) => {
            const value = map.statData().get(region.properties.id)
            return `<b>${region.properties.na}</b><br/>
                    Density: ${value ? value.toFixed(1) : 'N/A'} people/km²`
        },
    },

    // Insets for territories
    insets: insets,

    // Zoom settings
    zoomExtent: [1, 10],
    showBtns: true,

    // Coastal margin
    coastal: true,
    coastalMarginWidth: 0.5,
    coastalMarginColor: '#4682b4',

    // Borders
    borderWidth: 0.3,
    borderColor: '#444',

    // Labels
    labelling: true,
    labelSizeThreshold: 5000,
    labelOpacity: 0.8,

    // Footer
    bottomText: 'Source: Eurostat (2020)',
    footnote: '* Some regions may have incomplete data',

    // Callback
    onBuild: (map) => {
        console.log('Map build complete')

        // Export SVG after build
        setTimeout(() => {
            map.exportSVG()
        }, 1000)
    },
}

const map = eurostatmap.map('choropleth', config)
map.build()
```

## Type-Only Imports

For better tree-shaking and to avoid importing runtime code when you only need types:

```typescript
// Import only types (no runtime code)
import type { MapConfig, ChoroplethConfig, EurostatMap, StatData } from 'eurostatmap'

// Import runtime code separately
import eurostatmap from 'eurostatmap'

function createMap(config: ChoroplethConfig): EurostatMap {
    return eurostatmap.map('choropleth', config)
}
```

## Available Types

### Configuration Interfaces

- `MapConfig` - Base configuration for all maps
- `ChoroplethConfig` - Choropleth map configuration
- `ProportionalSymbolConfig` - Proportional symbol map configuration
- `CategoricalConfig` - Categorical map configuration
- `BivariateChoroplethConfig` - Bivariate choropleth configuration
- `TrivariateChoroplethConfig` - Trivariate (ternary) choropleth configuration, including continuous and sextant ternary settings
- `PieChartConfig` - Pie chart map configuration
- `SparklineConfig` - Sparkline map configuration
- `WaffleConfig` - Waffle map configuration
- `FlowMapConfig` - Flow map configuration

### Supporting Interfaces

- `StatConfig` - Statistical data source configuration
- `LegendConfig` - Legend configuration
- `TooltipConfig` - Tooltip configuration
- `InsetConfig` - Map inset configuration
- `FillPatternOptions` - Fill pattern options

### Map Objects

- `EurostatMap` - Base map interface with all common methods
- `ChoroplethMap` - Choropleth map with specific methods
- `ProportionalSymbolMap` - Proportional symbol map with specific methods
- `CategoricalMap` - Categorical map with specific methods
- `BivariateChoroplethMap` - Bivariate choropleth map with specific methods
- `StatData` - Statistical data object

### Type Unions

- `MapType` - Union of all supported map type strings

## Type Checking

To verify your TypeScript configuration is working correctly:

```bash
# Check types without emitting files
npm run type-check

# Build with type generation
npm run build-types

# Full production build (includes type generation)
npm run build-prod
```

## Common Patterns

### Type-safe Map Factory

```typescript
import eurostatmap from 'eurostatmap'
import type { MapType, MapConfig, EurostatMap } from 'eurostatmap'

function createTypedMap<T extends MapConfig>(type: MapType, config: T): EurostatMap {
    const map = eurostatmap.map(type, config)
    map.build()
    return map
}

// Usage with full IntelliSense
const map = createTypedMap('choropleth', {
    svgId: 'map',
    numberOfClasses: 7, // Type-checked against ChoroplethConfig
})
```

### Reusable Configuration

```typescript
import type { ChoroplethConfig } from 'eurostatmap'

const baseConfig: Partial<ChoroplethConfig> = {
    width: 800,
    height: 600,
    nutsLevel: 2,
    numberOfClasses: 7,
    classificationMethod: 'quantile',
    legend: {
        x: 500,
        y: 200,
    },
}

// Merge with specific config
const specificConfig: ChoroplethConfig = {
    ...baseConfig,
    svgId: 'specific-map',
    title: 'Specific Title',
    stat: {
        eurostatDatasetCode: 'demo_r_d3dens',
    },
}
```

## Troubleshooting

### Types Not Found

If TypeScript can't find the types, ensure:

1. TypeScript version is 4.0 or higher
2. `node_modules/eurostat-map` contains `build/types/index.d.ts`
3. Your `tsconfig.json` includes `"moduleResolution": "node"` or `"bundler"`

### Stricter Type Checking

For stricter type checking in your project:

```json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true
    }
}
```

## Version

Check the library version at runtime:

```typescript
import eurostatmap from 'eurostatmap'

console.log('eurostatmap version:', eurostatmap.version)
```

## Contributing

If you find missing or incorrect type definitions, please open an issue or pull request on the [GitHub repository](https://github.com/eurostat/eurostat-map).
