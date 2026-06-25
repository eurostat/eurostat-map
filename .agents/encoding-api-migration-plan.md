# Encoding API Migration Plan

## Context

We are moving eurostat-map toward a cleaner API that separates statistical datasets from visual encodings.

The preferred long-term model is:

```js
map.stat('datasetName', dataConfig)
map.encoding('visualVariable', encodingConfig)
```

`stat()` should name and load datasets. `encoding()` should map named stats to visual variables such as height, width, size, color, fill, x, y, or composition.

This replaces the current partial coupling where stat names often double as visual channels, for example:

```js
.stat('size', ...)
.stat('color', ...)
```

That pattern should remain backward compatible, but the new preferred API should allow:

```js
.stat('population', ...)
.stat('growthRate', ...)
.encoding('size', { stat: 'population', scale: 'sqrt', range: [5, 30] })
.encoding('color', { stat: 'growthRate', scale: 'quantile', classes: 5 })
```

## Target DEGURBA Example

For `examples/cartogram/grid/degurba.html`, the desired shape is:

```js
.stat('degurbaRate', {
    customData: data,
    categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
    unitText: config.unitText,
})
.stat('degurbaPop', {
    customData: populationData,
    categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
    unitText: 'inhabitants',
})
.encoding('height', {
    stat: 'degurbaRate',
    scale: 'linear',
    range: [2, GROUP_MAX_HEIGHT],
})
.encoding('width', {
    stat: 'degurbaPop',
    scale: 'linear',
    range: [useCartogram ? 3 : 2, useCartogram ? 16 : 9],
})
.encoding('color', {
    stat: 'degurbaRate',
    by: 'category',
    values: {
        DEG1: '#33A033',
        DEG2: '#8F741A',
        DEG3: '#E04040',
    },
    labels: {
        DEG1: 'Cities',
        DEG2: 'Towns and suburbs',
        DEG3: 'Rural areas',
    },
})
```

Use `stat` inside encoding configs, not `field`, because it directly links the visual channel to a defined `stat()` object in the user's mental model.

## Design Principles

- `stat()` is for data sources only.
- `encoding()` is for visual-variable mapping only.
- Dataset names should be domain names, such as `population`, `growthRate`, `degurbaRate`, or `totalPop`, not visual channel names.
- Visual channel names belong in `encoding()`, such as `height`, `width`, `color`, `size`, `fill`, `composition`, `x`, or `y`.
- Category colors and labels are visual encoding metadata, not statistical data metadata.
- Existing APIs must remain backward compatible during migration.

## Core Implementation Plan

1. Add `map.encoding(channel, config)` to `createStatMap`.

   Supported forms:

   ```js
   map.encoding('color')
   map.encoding('color', config)
   map.encoding({ color: config, size: config })
   ```

   Internally store:

   ```js
   out.encodings_ = {
       color: { ... },
       size: { ... },
       height: { ... },
       width: { ... },
   }
   ```

2. Add shared encoding helpers on map instances:

   ```js
   out.encoding(channel, config?)
   out.getEncodingStat(channel)
   out.getEncodingStatData(channel, categoryCode?)
   out.getEncodingValue(channel, regionId, categoryCode?)
   out.getEncodingUnitText(channel)
   ```

3. Make named categorical stats pure data definitions.

   Categorical stat metadata should live on the stat, for example:

   ```js
   out.statMeta_ = {
       degurbaRate: {
           categoryCodes: ['DEG1', 'DEG2', 'DEG3'],
           unitText: '%',
           statKeys: {
               DEG1: 'degurbaRate:DEG1',
               DEG2: 'degurbaRate:DEG2',
               DEG3: 'degurbaRate:DEG3',
           },
       },
   }
   ```

   Internally, `statData('degurbaRate:DEG1')` can still store the category-specific values, but users should interact with `degurbaRate`.

4. Keep existing API forms as compatibility sugar.

   Existing calls such as:

   ```js
   .stat('size', config)
   .stat('color', config)
   .statBar({ categoryCodes, categoryColors, categoryLabels, ... })
   .statPie(...)
   .statWaffle(...)
   .statStripe(...)
   ```

   should translate internally into named stats plus encodings.

## Map-Type Migration Plan

### Bar Maps First

Bar maps are the pilot map type because grouped DEGURBA bars need `height`, `width`, and categorical `color`.

For grouped bars:

- `encoding('height')` controls bar height.
- `encoding('width')` optionally controls per-bar width.
- `encoding('color')` controls fill.
- Categories come from the stat referenced by `height`, unless explicitly configured otherwise.

Rendering should resolve data through encoding helpers rather than reading `out.statCodes_`, `out.catColors_`, and `out.catLabels_` as the source of truth.

### Composition Maps

Migrate pie, waffle, stripe, and related composition maps after bars.

Preferred examples:

```js
.stat('composition', { ... })
.encoding('composition', { stat: 'composition' })
.encoding('size', { stat: 'totalPop' })
.encoding('color', { stat: 'composition', by: 'category', values, labels })
```

Stripe maps might use:

```js
.encoding('fill', { stat: 'composition' })
.encoding('color', { stat: 'composition', by: 'category', values, labels })
```

### Proportional Symbols

Current API:

```js
.stat('size', ...)
.stat('color', ...)
```

Preferred API:

```js
.stat('population', ...)
.stat('growth', ...)
.encoding('size', { stat: 'population', scale: 'sqrt', range: [5, 30] })
.encoding('color', { stat: 'growth', scale: 'quantile', scheme: 'OrRd', classes: 5 })
```

Existing settings such as `psMinSize`, `psMaxSize`, `psSizeScale`, `psColorFun`, `psClasses`, and `psThresholds` can be compatibility wrappers around encoding configs.

### Choropleths

Regular choropleth:

```js
.stat('density', ...)
.encoding('fill', {
    stat: 'density',
    scale: 'quantile',
    scheme: 'YlOrRd',
    classes: 5,
})
```

Bivariate/trivariate:

```js
.stat('density', ...)
.stat('growth', ...)
.encoding('color', {
    type: 'bivariate',
    stats: ['density', 'growth'],
})
```

Use `stats: [...]` for multi-stat encodings.

## Legends And Tooltips

Legends should eventually read from encodings rather than map-type-specific state.

- Color legends read `encoding('color')`.
- Size legends read `encoding('size')`.
- Width legends read `encoding('width')`.
- Category legends read `encoding('color').by === 'category'`.

Tooltips should also resolve data through encodings:

- stat name
- raw value
- unit
- category label
- visual channel label

## Type Additions

Add an encoding type similar to:

```ts
interface EncodingConfig {
    stat?: string
    stats?: string[]
    by?: 'value' | 'category'
    type?: 'linear' | 'sqrt' | 'threshold' | 'quantile' | 'categorical' | 'bivariate' | 'trivariate'
    scale?: 'linear' | 'sqrt' | 'quantile' | 'threshold'
    range?: [number, number] | string[]
    values?: Record<string, string | number>
    labels?: Record<string, string>
    classes?: number
    thresholds?: number[]
    scheme?: string | Function
    unitText?: string
}
```

Update:

- `src/types/core/MapInstance.d.ts`
- map-specific config types
- built types
- examples
- API docs
- migration guide

## Deprecation Strategy

Do not remove old APIs yet.

Keep these as compatibility/convenience APIs:

- `statBar`
- `statPie`
- `statWaffle`
- `statStripe`
- `catColors`
- `catLabels`
- existing proportional-symbol settings like `psMinSize`, `psMaxSize`, etc.

Avoid console deprecation warnings in the first migration release. First make the new API work quietly alongside the old API.

## Recommended Execution Order

1. Add core `encoding()` API and types.
2. Refactor named categorical stat metadata.
3. Update bar maps to resolve through encodings.
4. Update `examples/cartogram/grid/degurba.html` as the canonical new example.
5. Translate `statBar()` into named stat plus encodings for backward compatibility.
6. Add tests/type examples for old and new APIs.
7. Migrate pie, waffle, and stripe.
8. Migrate proportional symbols.
9. Migrate choropleths.
10. Refactor legends and tooltips to read encodings.
11. Update docs and examples.

## Current State Note

An initial implementation was started that allows categorical channel names like `.stat('height', ...)` and `.stat('width', ...)`. The team decided the better long-term API is to avoid visual-channel names in `stat()` and use named datasets plus `encoding()`.

Future work should migrate that initial implementation toward the cleaner model described above.
