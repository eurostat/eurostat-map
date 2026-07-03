# Release notes

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

- Added public multi-layer composition support so you can combine layers (for example choropleth + proportional symbols) with explicit layer roles and shared map interactions.

Example:

```js
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

```js
map.stat('size', {
    eurostatDatasetCode: 'demo_r_pjangrp3',
    filters: { time: '2024', sex: 'T' },
    preprocess: ({ regionId, value }) => (regionId === 'LI' ? null : value),
    transform: (value) => value / 1000,
})
```

### Improvements

- Added a grouped-bar width legend block (`legend.widthLegend`) when bar width is data-driven, so users can interpret the width channel directly.

Example:

```js
map
    .encoding('width', {
        stat: 'totalPop',
        scale: 'linear',
        range: [2, 16],
    })
    .legend({
        widthLegend: {
            title: 'Population',
        },
    })
```

### Fixes

- Fixed Dorling simulation behavior and interaction consistency across composition and proportional-symbol layers (including tooltip hover reliability and improved collision sizing in radar/halftone composition modes).

Example:

```js
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

```js
eurostatmap
    .map('choropleth')
    .insets('default')
    .build()
```

- Added runtime toast notification for Eurostat API failures to improve error visibility in interactive maps.

Example:

```js
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

- Layer-oriented architecture is now the primary model for combined visualizations, and layer-specific behavior (classification, style updates, legend interactions) is resolved through active layer context. Existing combined-map integrations that relied on implicit map-level assumptions may require adjustment.

Example:

```js
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
