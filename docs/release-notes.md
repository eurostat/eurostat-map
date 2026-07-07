# Release notes

## 4.6.0

### New

- **`sizeLegend.subtitle` and `colorLegend.subtitle`** — proportional-symbol legends now support a subtitle line rendered below the title in both the size and colour sections.

- **Per-level symbol filtering** — `map.nutsLevel(n)` now strictly enforces that only NUTS level *n* symbols are rendered. Setting `nutsLevel('mixed')` continues to show all levels simultaneously.

- **All centroid levels pre-cached on build** — when switching NUTS levels (`nutsLevel(n).build()`), all four centroid files are fetched and cached on the first build so subsequent level switches are instant and never produce a blank map.

- **Default proportional-symbol colour palette** — the built-in colour sequence for colour-classified PS maps is now `['#b7b9fc', '#898fec', '#5d68ce', '#3145a7', '#00237d']` (a blue ramp) instead of `interpolateOrRd`.

### Improvements

- **Piecewise Lab colour interpolation** — `psColors` arrays are now interpolated through `piecewise(interpolateLab)` so any `numberOfClasses` maps smoothly onto the full palette range, even when the number of classes differs from the number of colours provided.

- **`preprocess` is the sole source of truth for PS size scaling** — when a `preprocess` function is used on the size stat, the size classifier domain is derived exclusively from the post-preprocess values.

- **Country-region tooltips suppressed for NUTS 1–3** — hovering over `em-cntrg` polygons (country outlines) no longer triggers a tooltip when the active level is 1, 2 or 3; tooltips remain active for level 0 and mixed.

- **RS / EL background fixed** — Serbia (`RS`) and Greece (`EL`) `cntrg` polygons no longer inherit the has-data background tint because their polygons intentionally differ from NUTS0 (Kosovo / Mount Athos). They are now always marked `ecl='ni'`.

- **Background CSS reset on level switch** — the dynamic `em-cntrg` CSS fill rule is always explicitly updated when the map renders, preventing a tint set during a previous level from persisting after switching.

### Fixes

- **Level switch blank map** — switching NUTS levels (e.g. level 1 → level 2) no longer produces a blank symbol layer. `updateSymbolsDrawOrder` now reads from the authoritative `target.centroidsFeatures_` (level-filtered) instead of the stale `map.Geometries.centroidsFeatures`.

## Unreleased

### New

- Expanded encoding-first API support across map types:
    - `stat(name, config)` defines named datasets.
    - `encoding(channel, config)` maps those datasets to visual channels.
    - Added/standardized helpers such as `getEncodingStat*` for channel-aware data lookup.

### Compatibility

- Preserved legacy API paths:
    - Channel-named stats (`stat('size', ...)`, `stat('color', ...)`, etc.).
    - Composition helpers (`statPie`, `statWaffle`, `statBar`, `statStripe`).
    - Legacy positional composition signatures (including `stat('composition', config, categoryParameter, ...)`).

### Documentation and Typings

- Updated `docs/reference.md` to document the preferred stat/encoding model and migration guidance.
- Updated TypeScript definitions for:
    - encoding helpers on map instances,
    - `MapConfig.encoding`,
    - broader `MapConfig.stat` composition support,
    - composition helper overload parity.

## 4.5.0

### New

- Encoding visual variables. You can now define named stats and bind them explicitly to visual channels with `encoding(channel, ...)`.

Example:

```javascript
const map = eurostatmap
    .map('bar')
    .stat('degurbaRate', {
        customData: rateData,
        categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
    })
    .stat('totalPop', { customData: totalPopulation })
    .encoding('height', { stat: 'degurbaRate', scale: 'linear', range: [2, 45] })
    .encoding('width', { stat: 'totalPop', scale: 'linear', range: [2, 16] })
    .build()
```

- Added public multi-layer composition support so you can combine layers (for example choropleth + proportional symbols) with explicit layer roles and shared map interactions.

Example:

```javascript
const map = eurostatmap
    .map('choropleth')
    .layers([
        {
            type: 'choropleth',
            role: 'base',
            stat: { eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2024' } },
        },
        {
            type: 'proportional-symbol',
            role: 'overlay',
            stat: { eurostatDatasetCode: 'tps00001', filters: { TIME: '2024' } },
        },
    ])
    .build()
```

- Added `preprocess` support on statistical data loading, executed before `transform`, with access to region id and value.

Example:

```javascript
map.stat('size', {
    eurostatDatasetCode: 'demo_r_pjangrp3',
    filters: { time: '2024', sex: 'T' },
    preprocess: ({ regionId, value }) => (regionId === 'LI' ? null : value),
    transform: (value) => value / 1000,
})
```

### Improvements

- Preserved compatibility during the migration: existing channel-named stats and composition helper methods continue to work while the encoding-first API is the recommended path.

Example:

```javascript
// Legacy style (still supported)
map.stat('size', { eurostatDatasetCode: 'tps00001', filters: { TIME: '2024' } })

// Recommended style
map.stat('population', { eurostatDatasetCode: 'tps00001', filters: { TIME: '2024' } }).encoding('size', { stat: 'population' })
```

- Consolidated many map-type options into grouped settings objects (for example `barSettings(...)`, `psSettings(...)`, and `compositionSettings(...)`) to reduce fragmented prefixed setters and make configuration updates easier.

Example:

```javascript
// Before (legacy style, still supported with deprecation warnings)
map.barGroupGap(1).barGroupMaxHeight(40).barStrokeWidth(0.3)

// After (recommended)
map.barSettings({
    groupGap: 1,
    groupMaxHeight: 40,
    strokeWidth: 0.3,
})
```

- Added legacy-to-grouped compatibility wrappers for these consolidated settings, so existing code keeps working while migrating incrementally.

Example:

```javascript
// Legacy proportional-symbol setters still work:
map.psMaxSize(24).psMinSize(4)

// Recommended equivalent:
map.psSettings({
    maxSize: 24,
    minSize: 4,
})
```

- Improved responsive behavior on mobile/tablet: maps now constrain default height to available viewport/container space, symbols scale down more gracefully on small screens, and responsive typography/button styles reduce overlap.

Example:

```javascript
// Works automatically in 4.5.0 on small screens.
// Keep explicit width and let eurostat-map choose a responsive height.
eurostatmap.map('proportional-symbol').width(720).labels({ scaleOnZoom: true }).build()
```

- Expanded bivariate legend customization with axis endpoint labels and corner annotations, including per-corner callout length/offset controls.

Example:

```javascript
eurostatmap
    .map('bivariate')
    .legend({
        showAxisExtremes: true,
        axisExtremes: {
            x: { low: 'Low unemployment', high: 'High unemployment' },
            y: { low: 'Low population change', high: 'High population change' },
        },
        annotations: {
            topRight: 'High unemployment\nHigh population change',
            bottomLeft: 'Low unemployment\nLow population change',
        },
        annotationLineLength: { topRight: 24, bottomLeft: 20 },
        annotationOffsets: {
            topRight: { x: 8, y: -2 },
            bottomLeft: { x: -8, y: 4 },
        },
    })
    .build()
```

- Added a grouped-bar width legend block (`legend.widthLegend`) when bar width is data-driven, so users can interpret the width channel directly.

Example:

```javascript
map.encoding('width', {
    stat: 'totalPop',
    scale: 'linear',
    range: [2, 16],
}).legend({
    widthLegend: {
        title: 'Population',
    },
})
```

- Improved locations label styling with explicit halo and anchor options (`labelStyle.haloColor`, `labelStyle.haloWidth`, `labelStyle.textAnchor`) and updated default marker/label alignment.

Example:

```javascript
map.addLocation({
    x: 2.35,
    y: 48.85,
    label: 'Paris',
    shape: 'pin',
    labelStyle: {
        haloColor: '#fff',
        haloWidth: 3,
        textAnchor: 'start',
    },
})
```

### Fixes

- Fixed Dorling simulation behavior and interaction consistency across composition and proportional-symbol layers (including tooltip hover reliability and improved collision sizing in radar/halftone composition modes).

Example:

```javascript
eurostatmap
    .map('pie')
    .dorling(true)
    .compositionSettings({
        type: 'radar',
        radarValueMode: 'absolute',
    })
    .build()
```

- Restored expected default inset zoom behavior by using inset-aware default positioning/scaling again.

Example:

```javascript
eurostatmap.map('choropleth').insets('default').build()
```

- Added runtime toast notification for Eurostat API failures to improve error visibility in interactive maps.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .stat({
        eurostatDatasetCode: 'invalid_dataset_code',
        filters: { TIME: '2024' },
    })
    .build()
// Shows a toast when Eurostat API request fails.
```

### Breaking Changes

- The stat/encoding model is now the primary API direction. Integrations that depended on implicit stat-channel coupling should migrate to explicit `stat(name, ...)` + `encoding(channel, { stat: name })` bindings.

Example:

```javascript
// Before
map.stat('color', { eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2024' } })

// After
map.stat('density', { eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2024' } }).encoding('color', { stat: 'density' })
```

- The locations API was normalized: location coordinates now use `x`/`y` (instead of `lon`/`lat`), marker styling uses `radius`/`fill`/`opacity` (instead of `size`/`color`), and label style uses halo fields (`haloColor`, `haloWidth`) instead of text stroke fields.

Example:

```javascript
// Before
map.addLocation({
    lon: 13.4,
    lat: 52.5,
    size: 8,
    color: '#e74c3c',
    labelStyle: { stroke: '#fff', strokeWidth: 3, paintOrder: 'stroke' },
})

// After
map.addLocation({
    x: 13.4,
    y: 52.5,
    radius: 8,
    fill: '#e84040',
    labelStyle: { haloColor: '#fff', haloWidth: 3, textAnchor: 'start' },
})
```

- Layer-oriented architecture is now the primary model for combined visualizations, and layer-specific behavior (classification, style updates, legend interactions) is resolved through active layer context. Existing combined-map integrations that relied on implicit map-level assumptions may require adjustment.

Example:

```javascript
const baseLayer = map.layers()[0]
const overlayLayer = map.layers()[1]

baseLayer.updateClassification()
overlayLayer.updateStyle()
```

### Notes

- Release tag format used: `4.5.0` (no `v` prefix)

## 4.4.5

### Fixes

- Fixed inset scalebar rendering when using partial `scalebar` objects in inset configuration by merging with default scalebar settings. This prevents invalid line coordinates (for example `NaN`) and preserves expected label spacing.

Example:

```js
const map = eurostatmap
    .map('choropleth')
    .insets([
        {
            id: 'iceland',
            bbox: [0, 0, 120, 80],
            scalebar: {
                // Partial config now safely merges with defaults
                maxWidth: 18,
                textOffset: [0, 8],
            },
        },
    ])
    .build()
```

### Notes

- Published package: `eurostat-map@4.4.5`
- Dist-tag `latest` points to `4.4.5`
- Release tag format used: `4.4.5` (no `v` prefix)

## 4.4.4

### New

- Added a legend toggle button API so users can show/hide the legend directly on the map (`legendButton`), with mobile-first hidden behavior when enabled.

Example:

```js
const map = eurostatmap.map('choropleth').legend({ title: 'Population density' }).legendButton(true).build()

// Optional custom position
map.legendButtonPosition([10, 50])
```

- Added manual composition category ordering support via `compositionSettings.order` for pie-composition maps.

Example:

```ts
compositionSettings?: {
	type?: 'flag' | 'pie' | 'ring' | 'segment' | 'radar' | 'agepyramid' | 'halftone'
	minSize?: number
	maxSize?: number
	strokeFill?: string
	strokeWidth?: number
	reverseOrder?: boolean
	/** Category code order for composition rendering. */
	order?: string[]
	stripesOrientation?: number
	offsetAngle?: number
	agePyramidHeightFactor?: number
	otherColor?: string
	otherText?: string
}
```

### Improvements

- Generalized composition ordering so `compositionSettings.order` can drive category order consistently across composition chart types.

Example:

```js
eurostatmap
    .map('pie')
    .compositionSettings({
        type: 'radar',
        order: ['EMP', 'WAGE', 'UNITS'],
        reverseOrder: false,
    })
    .build()
```

- Added new business services statistics-explained examples with two dropdown-driven maps (proportional-circle and choropleth).

Example:

```js
// Services example dropdown update wiring
unitSelect.addEventListener('option-selected', (e) => {
    updateMap(e.detail.option.code, naceSelect.selectedOption)
})

naceSelect.addEventListener('option-selected', (e) => {
    updateMap(unitSelect.selectedOption, e.detail.option.code)
})
```

### Fixes

- Improved ring composition legibility by defaulting to an order that keeps smaller shares closer to the center (unless overridden).

Example:

```js
map.compositionSettings({
    type: 'ring',
    // Optional manual override (outer -> inner)
    order: ['TOTAL', 'LARGE_CAT', 'MID_CAT', 'SMALL_CAT'],
})
```

- Fixed dropdown UX so opening one selector closes the other (prevents both dropdowns being open simultaneously).

Example:

```js
document.addEventListener(
    'click',
    (event) => {
        const path = event.composedPath ? event.composedPath() : []
        if (path.includes(unitSelect)) requestAnimationFrame(() => naceSelect.closeDropdownWithoutFocus())
        else if (path.includes(naceSelect)) requestAnimationFrame(() => unitSelect.closeDropdownWithoutFocus())
    },
    true
)
```

- Removed example dependency on internal `/src` formatter utilities so shipped example folders are standalone and zip-portable.
- Enforced space as thousand separator in localized example number formatting.

Example:

```js
const longIntlFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })

const longFormatter = {
    format(value) {
        return longIntlFormatter.format(value).replace(/,/g, ' ')
    },
}
```

### Notes

- Published package: `eurostat-map@4.4.4`
- Dist-tag `latest` points to `4.4.4`
- Release tag format used: `4.4.4` (no `v` prefix)
