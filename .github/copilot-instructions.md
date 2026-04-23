# eurostat-map.js Development Guide

## Project Overview

**eurostat-map.js** is a D3-based cartographic library for creating interactive statistical maps of Europe using Eurostat data. It builds SVG maps with support for 12+ map types (choropleth, proportional symbols, pie charts, flow maps, etc.) and integrates with NUTS regions via the Nuts2json API.

## Architecture

### Core Components

- **Entry point**: [src/index.js](src/index.js) exports from [src/eurostat-map.js](src/eurostat-map.js)
- **Map factory**: [src/eurostat-map.js](src/eurostat-map.js) - `eurostatmap.map(type, config)` dispatches to specialized map constructors
- **Base layers**:
    - [src/core/map-template.js](src/core/map-template.js) - Geometrical foundation (SVG, projection, zoom, insets)
    - [src/core/stat-map.js](src/core/stat-map.js) - Statistical layer above template (data handling, legends, tooltips)
- **Map types**: [src/map-types/](src/map-types/) - Each implements `updateClassification()` and `updateStyle()` methods
- **Data loading**: [src/core/stat-data.js](src/core/stat-data.js) - Fetches from Eurostat API (JSON-stat), CSV, or custom JS

### Builder Pattern

Maps use a fluent builder API with getter/setter methods:

```javascript
// Setter: map.numberOfClasses(7) returns map for chaining
// Getter: map.numberOfClasses() returns current value
const map = eurostatmap
    .map('choropleth')
    .width(800)
    .nutsLevel(2)
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2021' } })
    .legend({ x: 10, y: 130, title: 'Density' })
    .build() // Triggers map construction
```

### Update Lifecycle

Three core update methods refresh different aspects:

- `updateStatData()` - Fetches new data when config changes
- `updateClassification()` - Recomputes thresholds/scales (e.g., after class count change)
- `updateStyle()` - Re-renders visuals (colors, symbols) without reclassifying

## Key Development Patterns

### 1. Classification Methods

Choropleth maps support 5 classification methods ([src/map-types/choropleth/map-choropleth.js](src/map-types/choropleth/map-choropleth.js)):

- `'quantile'` (default) - Equal data count per class
- `'equinter'` - Equal intervals between min/max
- `'threshold'` - User-defined breaks via `.thresholds([10, 20, 30])`
- `'jenks'` - Natural breaks (uses `simple-statistics`)
- `'ckmeans'` - CK-means clustering

**Example**: Changing classification requires updating both the method and rebuilding:

```javascript
map.classificationMethod('jenks').numberOfClasses(5).updateClassification()
```

### 2. Insets Handling

Maps with insets (e.g., overseas territories) need parallel operations. Use `executeForAllInsets()` ([src/core/utils.js](src/core/utils.js)) to apply changes to main map + insets:

```javascript
if (out.insetTemplates_) {
    executeForAllInsets(out.insetTemplates_, out.svgId_, applyStyleToMap)
}
applyStyleToMap(out) // Then apply to main map
```

### 3. Statistical Data Access

Access data via `map.statData()` which returns a statData object:

- `.get(nutsId)` - Returns `{value, status}` object
- `.getValue(nutsId)` - Returns just the value
- `.getArray()` - Returns array of all values (for classification)
- `.setData({ES: 3, FR: 2})` - Inject custom data

### 4. Getter/Setter Convention

All config parameters follow trailing underscore pattern:

```javascript
// Internal property: out.numberOfClasses_ = 7
// Define accessor:
out.numberOfClasses = function (v) {
    if (!arguments.length) return out.numberOfClasses_
    out.numberOfClasses_ = v
    return out
}
```

## Development Workflow

### Build Commands (package.json)

- `npm start` - Dev build with webpack (outputs to [build/](build/))
- `npm run server` - Dev server with live reload on http://localhost:8080
- `npm run build-prod` - Minified production build ([build/eurostatmap.min.js](build/eurostatmap.min.js))
- `npm run format` - Format with Prettier

### Testing Strategy

- **Examples as tests**: [examples/](examples/) HTML files load built library and serve as integration tests
- **Manual testing**: [test/](test/) directory contains specialized test pages (e.g., [test/test_classification_methods.html](test/test_classification_methods.html))
- Open examples directly in browser or via dev server

### Creating New Map Types

1. Create module in [src/map-types/](src/map-types/) exporting `map(config)` function
2. Extend `createStatMap()` with type-specific parameters
3. Implement required methods: `updateClassification()`, `updateStyle()`, `getLegendConstructor()`
4. Register in [src/eurostat-map.js](src/eurostat-map.js) factory function
5. Add example in [examples/](examples/) and update [docs/reference.md](docs/reference.md)

## Code Style & Conventions

- **ES6 modules**: Use `import/export`, no CommonJS
- **D3 imports**: Import only needed methods (`import { select } from 'd3-selection'`)
- **JSDoc**: Minimal JSDoc (`@param`, `@returns`) for public API only
- **Deprecation**: Use [src/core/deprecated.js](src/core/deprecated.js) pattern with `console.warn()` for breaking changes
- **CSS**: Styles in [src/css/index.css](src/css/index.css), avoid inline styles (migrated in v4.0)

## Common Pitfalls

- **Forgetting to call `.build()`**: Maps don't render until `.build()` is invoked
- **Modifying config after build**: Use update methods (`updateStatData()`, etc.) rather than rebuilding
- **Inset synchronization**: Always check `out.insetTemplates_` and apply changes to insets when updating main map
- **Threshold vs classes**: When using `classificationMethod: 'threshold'`, `numberOfClasses` is auto-set to `thresholds.length + 1`

## Legends & Tooltips

### Legend System

Each map type provides its own legend constructor via `getLegendConstructor()`. Legends are built with:

```javascript
// Legends follow similar builder pattern
map.legend({ x: 10, y: 130, title: 'Population', boxOpacity: 0.7, decimals: 1 })
// Update after classification changes:
if (map.legendObj()) map.legendObj().update()
```

**Legend types**: [src/legend/](src/legend/) contains specialized legends:

- `choropleth/legend-choropleth.js` - Class breaks with color ramps, supports histogram mode
- `proportional-symbol/legend-proportional-symbols.js` - Size + optional color legend
- `categorical/legend-categorical.js` - Category labels with swatches

**Customization**: Override `labelFormatter` function or use `labelType: 'ranges'|'thresholds'`

### Tooltip System

Tooltips use [src/tooltip/tooltip.js](src/tooltip/tooltip.js) with automatic positioning:

```javascript
// Each map type defines default tooltip text
map.tooltip_.textFunction = (nutsId, nutsName, value) => {
    return `<b>${nutsName}</b><br/>Value: ${value}`
}
// Custom tooltip:
map.tooltip({ textFunction: myCustomFunction })
```

**Positioning logic**: `ensureTooltipOnScreen()` prevents overflow by checking parent bounds

## Cartograms

### Grid Cartograms

Grid cartograms ([src/core/cartograms.js](src/core/cartograms.js)) replace geographic shapes with regular grids:

```javascript
map.gridCartogramShape('hexagon') // or 'square'
    .gridCartogramPositions(customLayout) // Optional: custom CSV layout
    .gridCartogramMargins({ top: 80, right: 80, bottom: 80, left: 80 })
```

**Layout format**: CSV string where each cell contains NUTS ID (e.g., `ES,FR,DE`). Default layouts for Europe provided.

### Dorling Cartograms

Dorling cartograms ([src/core/dorling/](src/core/dorling/)) use D3 force simulation to pack circles:

```javascript
map.dorling(true)
    .dorlingStrength({ x: 1, y: 1 }) // Gravity toward original position
    .dorlingIterations(1) // Collision detection iterations
    .animateDorling(false) // Skip animation for immediate result
    .dorlingWorker(true) // Use Web Worker for performance
```

**Implementation notes**:

- Main logic in `dorling.js`, worker code in `dorling-worker.js`
- Worker mode prevents UI blocking but requires serializable data
- `radiusAccessor` function determines circle sizes from data

## Debugging Techniques

### Common Debugging Patterns

1. **Check data loading**: Inspect `map.statData().get()` or `map.__data` for raw Eurostat response
2. **Classification issues**: Log `map.classifier()` - check `.domain()` and `.range()` values
3. **Missing regions**: Verify NUTS year matches data: `map.nutsYear(2024)` vs dataset availability
4. **Console messages**: Look for deprecation warnings from [src/core/deprecated.js](src/core/deprecated.js)

### Browser DevTools Workflow

```javascript
// In browser console after map builds:
map.statData().getArray() // See all values used for classification
map.classifier()(50) // Test which class a value falls into
map.svg().selectAll('.em-region') // Inspect rendered regions
map.Geometries.geoJSONs.nutsrg // Raw GeoJSON data
```

### Update Method Chain

When modifications don't appear, check correct update sequence:

```javascript
// Data change:
map.stat({ ...newConfig }).updateStatData()
// Classification change:
map.numberOfClasses(5).updateClassification()
// Style change only:
map.colors(['red', 'blue']).updateStyle()
```

## External Dependencies

- **NUTS geometries**: Loaded from [Nuts2json API](https://github.com/eurostat/Nuts2json) (TopoJSON format)
- **Statistical data**: Eurostat JSON-stat API (via `jsonstat-toolkit`)
- **D3 ecosystem**: Modular imports from d3-selection, d3-scale, d3-geo, d3-geo-projection, d3-zoom
- **Projections**: proj4 for coordinate transformations (EPSG:3035 default for Europe)
