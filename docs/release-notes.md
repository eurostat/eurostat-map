# Release notes

## 4.11.4

### New

- **`map.updateBackgroundMap()` toggles the background map (sea/sphere/NUTS geometry) live, without a full `map.build()`.** Previously the only way to show/hide the background map after the initial build was a full rebuild. The new method draws the background layer on demand if it hasn't been built yet, or removes/re-lowers it in place otherwise - useful for a "show background map" toggle on a Dorling cartogram.

Example:

```javascript
const map = eurostatmap.map('ps').dorling(true).backgroundMap(true).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()

// later, toggling the setting live:
map.backgroundMap(false).updateBackgroundMap()
```

### Notes

- Published package: `eurostat-map@4.11.4`
- Dist-tag `latest` points to `4.11.4`
- Release tag format used: `4.11.4` (no `v` prefix)

## 4.11.3

### Fixes

- **Geographic label colours (country names, country codes, seas) are now independent of `statLabelTextColor`.** A previous fix made `statLabelTextColor` apply to every geographic label class as well as statistical value labels, despite the name - too broad a scope, since it meant a font-colour change for country names/codes also silently recoloured sea/ocean labels. `statLabelTextColor` now only affects statistical value labels again; country names, country codes and seas each get their own independent colour field.

Example:

```javascript
eurostatmap
    .map('ch')
    .labels({
        labels: eurostatmap.getDefaultLabels().EUR_3035.en,
        countryLabelTextColor: '#111111',
        seaLabelTextColor: '#2a58b3', // independent of country label colour
    })
    .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
    .build()
```

- **Choropleth classification no longer crashes on sparse data.** `setupClassifier`'s `jenks`/`ckmeans` branches called `.slice()` on `jenks()`'s result unconditionally - `jenks()` (from `simple-statistics`) returns `null` rather than throwing when asked for more classes than there are data points, which is a real situation whenever a live re-fetch (e.g. an interactive dropdown) returns fewer distinct values than the map's configured class count. Both branches now clamp the requested class count to the available data and degrade to an empty domain instead of crashing.
- **Spark maps: the `stat({ dates: [...], eurostatDatasetCode: ... })` multi-date config shape works again.** A prior internal refactor moved layer-specific behaviour behind a shared `activeLayer` pattern, which broke sparkline maps' specialized stat config (one dataset per date) - restored via an explicit `handleStatConfig` hook the active layer can implement.
- **Spark map legends read their scale/style properties from the layer again, not the map.** After the same internal refactor, spark legends were reading `sparkYScale_`, `_statDates`, `sparkLineWidth_`/`sparkLineHeight_`/`sparkLineColor_` and region centroids from the shared map object, which no longer holds them - they live on the layer instance now. Legends now read from the layer (falling back to the map where relevant).

### Improvements

- **Insets start hiding behind the insets button at a narrower viewport by default.** `insetsVisibilityBreakpoint()`'s default dropped from 768px to 700px, so insets stay visible over a slightly wider range of tablet/small-desktop widths before switching to the button-triggered mobile layout.

### Notes

- Published package: `eurostat-map@4.11.3`
- Dist-tag `latest` points to `4.11.3`
- Release tag format used: `4.11.3` (no `v` prefix)

## 4.11.2

### Fixes

- **Spike proportional-symbol legend labels no longer overlap.** Item spacing was estimated from a character-count heuristic (`chars * fontSize * 0.45`) that underestimated real glyph widths for some labels. Each label's actual rendered width (`getBBox()`) is now measured after render and items are spaced from that instead.

Example:

```javascript
eurostatmap.map('ps').psShape('spike').sizeLegend({ values: [4200, 50000, 100000, 185100] }).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()
```

- **Dorling cartograms no longer fetch a full d3 v7 bundle from an external CDN on every toggle.** The simulation's default (non-animated) Web Worker path re-fetched `https://unpkg.com/d3@7/dist/d3.min.js` via `importScripts()` every time, even though only 4 named `d3-force` exports are used - a fresh network round-trip (worker spin-up + fetch + cache revalidation) each time, and the likely cause of Dorling cartograms getting noticeably slower to enable over time. `d3-force` is now bundled directly into the worker at build time; `importScripts` is only used as an explicit opt-in via `dorlingSettings({ workerD3URL })`.

Example:

```javascript
// No network dependency by default:
eurostatmap.map('ps').dorling(true).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()

// Opt-in override, if you need to pin a specific d3 build in the worker:
eurostatmap.map('ps').dorling(true).dorlingSettings({ workerD3URL: 'https://unpkg.com/d3@7/dist/d3.min.js' }).build()
```

### Notes

- Published package: `eurostat-map@4.11.2`
- Dist-tag `latest` points to `4.11.2`
- Release tag format used: `4.11.2` (no `v` prefix)

## 4.11.1

### New

- **Pie, bar chart, waffle, and coxcomb composition maps now support `categoryFillStyle`/`categoryText` region-level categorical coloring**, matching proportional-symbol maps. On proportional-symbol maps this also corrects 4.11.0's version of the feature, which colored the symbol itself instead of the region's polygon - a region can now have both a sized/composition symbol and an independently-categorized polygon at once (e.g. a sheep-count circle plus a "member of welfare scheme" polygon colour).

Example:

```javascript
eurostatmap
    .map('pie')
    .categoryFillStyle({ Noanimals: '#B19122' })
    .categoryText({ Noanimals: 'No animals' })
    .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
    .build()
```

- **Proportional-symbol stat value labels now respect `statLabelTextColor` and `backgrounds`**, matching choropleth's stat labels. Previously ps stat labels always auto-computed a contrast colour against the symbol's own fill and never drew a background box, ignoring both settings entirely.

Example:

```javascript
eurostatmap.map('ps').labels({ backgrounds: true, backgroundFill: '#B19122', statLabelTextColor: '#ffffff' }).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()
```

### Fixes

- **`statLabelTextColor` and its halo-contrast adjustment now reliably apply everywhere they're configured.** The color now also applies to geographic labels (country names, country codes, seas), not just statistical value labels - and every one of these overrides is now set as an inline style rather than an SVG attribute, since a CSS class rule (each label class sets its own default `fill`/`stroke`) always wins over a plain attribute regardless of specificity, which was silently discarding the override before.

Example:

```javascript
eurostatmap.map('ch').labels({ labels: eurostatmap.getDefaultLabels().EUR_3035.en, statLabelTextColor: '#ffffff' }).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()
```

- **Statistical value label text no longer renders with a thick double-stroke outline under `labels({ backgrounds: true })`.** The stroke is now forced off whenever a background box is drawn behind the label - it was only ever needed for contrast against the bare map, not against its own background.
- **Proportional-symbol maps: a `categoryFillStyle`/`categoryText` category added via a live classification change (e.g. an "edit classification" UI) now updates the map and legend correctly.** Previously this only took effect if the category was configured before the map's initial `.build()` - the only re-tagging path invoked on a later change bailed out entirely for size-only ps maps, and the legend had no swatch-drawing path for that case either.
- **Label overlap prevention (`labels({ preventOverlap: true })`) no longer permanently corrupts a label's position after being toggled off and back on.** The force simulation was writing its own nudged screen-pixel coordinates directly onto the label datum's `x`/`y` - geographic coordinates that get re-projected on every rebuild, and that are frequently a reference into eurostat-map's own shared default-labels data. Simulation state now lives on separate wrapper objects, never on the datum itself.

### Notes

- Published package: `eurostat-map@4.11.1`
- Dist-tag `latest` points to `4.11.1`
- Release tag format used: `4.11.1` (no `v` prefix)

## 4.11.0

### New

- **`labels({ preventOverlap: true })`**: nudges geographic labels (country names, codes, seas) apart using a d3-force collision simulation, so neighbouring labels no longer overlap. Doesn't affect statistical value labels, which stay pinned to region centroids.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .labels({ labels: eurostatmap.getDefaultLabels().EUR_3035.en, preventOverlap: true })
    .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
    .build()
```

### Improvements

- **Ranked bar chart / size-legend labels only spell out compact word notation ("15 thousand") for values of 1 million or more.** Smaller values now render as plain space-separated digits ("15 000") instead, which is easier to parse at a glance than a spelled-out word for a short number.
- **Ranked bar chart container opacity now drives its pointer-events.** At full opacity (`boxOpacity: 1`) the container blocks pointer events instead of letting them reach the map underneath - previously it always ignored pointer events, so hovering the (invisible) map behind an opaque chart could still trigger its tooltip.

Example:

```javascript
// At boxOpacity 1 the box now blocks pointer events to whatever's behind it.
eurostatmap.map('ch').rankedBarChart({ boxOpacity: 1 }).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()
```

### Fixes

- **Seas labels (e.g. "MEDITERRANEAN SEA") no longer get a background treatment under `labels({ backgrounds: true })`.** They don't visually clash with anything else on the map, so they keep their default halo instead - a background box around them was unnecessary chrome.
- **Ranked bar chart: hovering the bar for an inset-only region (e.g. MT, LI) no longer gets stuck highlighted after mouseout.** The region-highlight lookup was a descendant selector against the main map's `<svg>`, which also matched the same region's path inside a nested inset `<svg>` - a second, inset-scoped highlight call then re-saved the already-highlighted color as the "original" to restore, permanently stuck. Highlight/unhighlight now scope their match to each map instance's own `<svg>` subtree.
- **Proportional-symbol maps: a size value matching a `categoryFillStyle`/`categoryText` category (e.g. an "edit classification" categorical override) is now rendered with its configured color, on maps with no separate color encoding.** Previously the size-only classification fallback always tagged these symbols generically, so the category's colour/label never took effect and the map fell back to the default fill.

Example:

```javascript
eurostatmap
    .map('ps')
    .categoryFillStyle({ Noanimals: '#B19122' })
    .categoryText({ Noanimals: 'No animals' })
    .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
    .build()
```

### Notes

- Published package: `eurostat-map@4.11.0`
- Dist-tag `latest` points to `4.11.0`
- Release tag format used: `4.11.0` (no `v` prefix)

## 4.10.12

### Fixes

- **`map.labels()`, `map.stamp()`, and `map.annotations()` (and the matching `MapConfig` properties `labels`/`stamp`) now accept `false` to clear/disable, matching their actual runtime behavior.** All three already treated a falsy config as "remove this element" at runtime, but their TypeScript types didn't declare a `false` overload, forcing consumers into an `as any` cast to compile a perfectly valid clear/disable call - this broke a real build (IMAGE) after `labels`/`stamp`/`annotations` were tightened from loose/`any` types in `4.10.10`.

Example:

```typescript
// Now type-checks without a cast:
map.labels(false)
map.stamp(false)
map.annotations(false)
```

### Notes

- Published package: `eurostat-map@4.10.12`
- Dist-tag `latest` points to `4.10.12`
- Release tag format used: `4.10.12` (no `v` prefix)

## 4.10.11

### Fixes

- **Ranked bar chart bars no longer fall back to flat gray on a proportional-symbol map with no color encoding configured.** A plain (single-color) `ps` map has no color classifier, so `rankedBarChart()` fell back to a hardcoded mid-gray for every bar instead of the map's own flat symbol fill color, making the bars visually disconnected from the map they rank. The no-classifier fallback now mirrors each map type's own flat fill color (`psFill_` for `ps`) instead.

### Notes

- Published package: `eurostat-map@4.10.11`
- Dist-tag `latest` points to `4.10.11`
- Release tag format used: `4.10.11` (no `v` prefix)

## 4.10.10

### New

- **`legendVisibilityBreakpoint` option**: the viewport width (px) at/below which the legend starts hidden behind the legend toggle button, when `legendButton(true)` is set. Previously hardcoded to `768`; now configurable per map. Default remains `768`.

Example:

```javascript
// Legend starts hidden (behind the toggle button) at viewport widths <= 1000px,
// instead of the default 768px.
eurostatmap
    .map('choropleth')
    .legendButton(true)
    .legendVisibilityBreakpoint(1000)
    .stat({ eurostatDatasetCode: 'demo_r_d3dens' })
    .build()
```

- **`tooltip({ decimals })` option** for choropleth maps: fixes the tooltip's displayed value to a set number of decimal places, preserving trailing zeros (e.g. `7` → `"7.0"`) that the default formatter previously dropped. When unset, precision is auto-detected from the max precision seen across the stat dataset's own values.

Example:

```javascript
// Tooltip always shows one decimal place, e.g. "85.0 years" instead of "85 years".
eurostatmap
    .map('choropleth')
    .tooltip({ decimals: 1 })
    .stat({ eurostatDatasetCode: 'demo_r_mlifexp', unitText: ' years' })
    .build()
```

- **`filterGeometriesFunction` now receives the calling map/inset as a 2nd argument**, so a custom filter can tell the main map apart from each inset (via `map.isInset` / `map.geo_`) and, for example, only inject custom point data (like a mushroom map's port locations) into the maps/insets it actually belongs to.

Example:

```javascript
eurostatmap
    .map('mushroom')
    .filterGeometriesFunction((geometries, map) => {
        if (map?.isInset) {
            // e.g. only include this inset's own designated point(s)
        }
        return geometries
    })
    .build()
```

### Breaking Changes

- **Choropleth tooltips no longer insert a space between the value and `unitText` automatically.** Previously the tooltip always rendered `${value} ${unitText}`; now it renders `${value}${unitText}` verbatim, so the space (or lack of one) is controlled entirely by `unitText` itself. Any existing `unitText` that relied on the automatic space (e.g. `unitText: 'years'` expecting `"85 years"`) needs a leading space added (`unitText: ' years'`) to keep the same tooltip text. Unit strings that don't want a space (e.g. `'%'`) are unaffected.

Example:

```javascript
// Before 4.10.10: unitText: 'years' rendered as "85 years" (space auto-inserted).
// From 4.10.10 on: unitText must include its own leading space for the same result.
eurostatmap
    .map('choropleth')
    .stat({ eurostatDatasetCode: 'demo_r_mlifexp', unitText: ' years' }) // was: 'years'
    .build()
```

### Fixes

- **Fixed coxcomb maps with `statCoxcomb({ customData })` never rendering any data.** The custom-data path patched `layer.build` to inject data after building, but since the 4.10.x layers migration, `eurostatmap.map('coxcomb')` returns a facade whose own `.build()` (the one callers actually invoke) never delegated to that patched layer method - so custom data was never injected and no region ever got a coxcomb glyph. Custom stat data is now registered synchronously at `statCoxcomb()` call time instead.
- **Fixed mushroom (dual semi-circle) proportional-symbol maps duplicating every symbol once per inset.** `updateSymbolsDrawOrder()` only ran for the main map, and `applyStyleToMap()` selected centroids via an unscoped `map.svg().selectAll('g.em-centroid')` (matching every map/inset sharing the page's SVG) instead of the properly-scoped centroids group - so every inset redraw duplicated every symbol into every other map/inset's centroids too. Mushroom classification state (size scale, colors) is now also correctly read from the owning layer for insets, which previously had no classification state of their own and so never rendered any symbols at all.
- **Fixed a legend hover bug on trivariate/ternary choropleth legends**: hovering any point in the legend triangle's background colour grid - not just an actual plotted data point - spuriously highlighted/dimmed regions on the map by colour-matching, even over blank areas with no data plotted there. This background-hover behavior is now gated on `colorTarget: 'triangles'`; the default (`colorTarget: 'points'`) only responds to hovering an actual plotted point, as intended.
- `getMaxDomainPrecision` (decimal-precision detection for legend labels) moved from a `legend-bar-chart.js`-local helper to the shared `src/legend/legend-utils.js`, so it can be reused by the new tooltip decimal formatting above. No behavior change for existing bar-chart legends.

### Notes

- Published package: `eurostat-map@4.10.10`
- Dist-tag `latest` points to `4.10.10`
- Release tag format used: `4.10.10` (no `v` prefix)

## 4.10.9

### Fixes

- **Fixed the loading spinner never disappearing on a normal successful load, for maps whose SVG is nested inside another `<svg>`** (e.g. IMAGE, which nests the whole map template in one outer `<svg>` for static export). `wrapMapSvg()` created a brand-new overlay host `<div>` every time the map rebuilt (any settings change, not just the initial build), instead of reusing the one from the previous build - the stale overlay was left orphaned on top of the new map, still in whatever visibility state it was last in when abandoned, while the new overlay (the one `showSpinner`/`hideSpinner` now actually control) sat correctly hidden underneath/behind it. `wrapMapSvg()` now looks for an existing `.em-map-wrapper` overlay host on the shared ancestor and reuses it instead of creating a new one.

### Notes

- Published package: `eurostat-map@4.10.9`
- Dist-tag `latest` points to `4.10.9`
- Release tag format used: `4.10.9` (no `v` prefix)

## 4.10.8

### Fixes

- **Fixed the loading spinner never disappearing after a stat data fetch fails.** `updateEurobase`'s API-error branch and its `.catch`, plus `updateCSV` (which had no `.catch` at all), skipped the completion callback on failure. The caller's loading counter (which drives the spinner overlay) only decrements inside that callback, so any Eurostat API error, network blip, or CSV fetch failure left the counter stuck above zero and the spinner spinning forever - the geo-loading side already had this exact fix, but the stat-data side didn't.
- The SVG-nested overlay host used when the map's SVG sits inside another `<svg>` (e.g. IMAGE's static export layout) now sets `pointer-events: none` on itself, so it doesn't block hover/click on the map underneath while hidden.
- Geo data fetch failures in `updateGeoMapTemplate` now also run the completion callback (same reasoning as the stat-data fix above), so a failed geo fetch for one map/inset no longer leaves the spinner stuck even though other maps/insets loaded fine.

### Notes

- Published package: `eurostat-map@4.10.8`
- Dist-tag `latest` points to `4.10.8`
- Release tag format used: `4.10.8` (no `v` prefix)

## 4.10.7

### Fixes

- **Fixed hover tooltips silently doing nothing across most layer types** - bar, pie, waffle, stripe, coxcomb, sparklines, categorical, choropleth-trivariate, and mushroom proportional symbols. Layer-decorator code read map-level state (`_tooltip`, `_pathFunction`, `_projection`, `_statLabelFormatter`) directly off the layer object, but the layers migration only ever sets those on the top-level facade map, during `build()` - after the layer's own property-forwarding snapshot was already taken. `if (out._tooltip)` then silently evaluated to `false` everywhere it was read this way. Fixed by reading these off the owning facade (`out.map`) instead.
- **Fixed flow maps not rendering at all** (same root cause as above, but flow map code dereferences the missing property immediately - `out._pathFunction.centroid(...)` - so it crashed instead of silently no-oping).
- **Fixed flow map lines rendering off-screen, collapsed on top of each other, when node coordinates come from region centroids.** The centroid fallback used the map's already-projected `pathFunction.centroid()`, then projected those screen coordinates a second time.
- **Fixed a `RangeError: Maximum call stack size exceeded` in multi-layer maps combining a Dorling cartogram with other layers** (e.g. choropleth + proportional-symbol). `stopDorlingSimulation` recursed into `layers_`, but a layer only *inherits* that array from its facade rather than owning it - so every layer saw its sibling layers as children, and two siblings recursed into each other forever.
- **Fixed the coxcomb size legend throwing `sizeScale is not a function`**, and the coxcomb time-segment legend silently never appearing - both read the relevant scale off the map facade instead of the coxcomb layer that actually owns it.
- **Fixed bivariate choropleth tooltips and hover interactions**, including regions staying non-interactive after a map update interrupted an in-progress region-color transition.
- **Fixed the loading spinner never appearing when the map's SVG is nested inside another `<svg>` element** (e.g. static image export).
- Fixed two Statistics Explained business examples (`construction`, `distributive-trade`) whose page referenced the shared library script with a broken relative path.

Example (previously threw, or silently produced no tooltip, depending on layer type):

```javascript
// Tooltips now appear on hover; previously silently did nothing.
eurostatmap.map('bar').gridCartogram(true).stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()

// Flow lines now render at the correct on-screen position; previously
// rendered collapsed together, off-screen.
eurostatmap.map('flow').flowGraph({ nodes: [...], links: [...] }).build()
```

### Notes

- Published package: `eurostat-map@4.10.7`
- Dist-tag `latest` points to `4.10.7`
- Release tag format used: `4.10.7` (no `v` prefix)

## 4.10.6

### Fixes

- **Fixed a `RangeError: Maximum call stack size exceeded` that made every standalone map type (choropleth, proportional-symbol, categorical, etc.) fail to build.** Introduced by the 4.10.5 layers migration: a layer's inherited `mapServices` prototype fell back to reading `map[key]` for any field/method it didn't own itself, while the map's own forwarding accessors read the opposite direction (`map[key]` → `layer[key]`) - for any forwarded field or method a layer never set on itself (e.g. no ranked bar chart configured), this bounced back and forth until the stack overflowed. No API changes; existing code that calls `.build()` on any map type now works again.

Example:

```javascript
// Previously threw "RangeError: Maximum call stack size exceeded" for every
// migrated map type - now builds normally again.
eurostatmap.map('ch').stat({ eurostatDatasetCode: 'demo_r_d3dens' }).build()
```

### Notes

- Published package: `eurostat-map@4.10.6`
- Dist-tag `latest` points to `4.10.6`
- Release tag format used: `4.10.6` (no `v` prefix)

## 4.10.5

### New

- **Proportional-symbol color datasets can now contain categorical exceptions alongside numeric values.** Configure `categoryFillStyle` with the category's symbol fill and `categoryText` with its user-facing legend or tooltip label. Numeric values continue through the configured color classification.

Example:

```javascript
eurostatmap
    .map('ps')
    .stat('size', populationByRegion)
    .stat('color', densityWithExceptions)
    .categoryFillStyle({ confidential: '#777777' })
    .categoryText({ confidential: 'Confidential' })
    .build()
```

- **Statistical value label backgrounds are now fully configurable.** Labels support independent text color and padding, rectangular or circular backgrounds, and rounded rectangle corners.

Example:

```javascript
eurostatmap.map('ch').labels({
    values: true,
    backgrounds: true,
    backgroundFill: '#ffffff',
    statLabelTextColor: '#222222',
    backgroundPadding: { x: 6, y: 3 },
    backgroundShape: 'rect',
    backgroundBorderRadius: 4,
})
```

### Improvements

- **All standalone thematic map types now use the common layer implementation internally.** Their existing fluent APIs remain available through the active layer, while applications can use the same layer architecture consistently across choropleth, categorical, proportional-symbol, composition, flow, spark, and multivariate maps.

Example:

```javascript
const map = eurostatmap.map('ps')
map.encoding('size', { stat: 'population' })
map.psSettings({ sizeMin: 2, sizeMax: 30 })
map.build()
```

## 4.10.4

### Fixes

- **Ranked bar charts crashed on proportional-symbol maps once the region count crossed the histogram-fallback threshold**, throwing "Cannot read properties of undefined (reading 'length')". The histogram fallback assumed the active layer was always a choropleth (reading `thresholds_`/`classToFillStyle()` directly), which isn't true for layers reached via the encoding API such as proportional symbols. It now goes through the map-type-generic `getColorClassifier`/`getNumberOfClasses`/`getClassToFillStyle` accessors instead. Proportional-symbol ranked bar charts now also rank/size bars by the **size** encoding (the value symbol areas are proportional to) rather than the color encoding.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap
    .map('ps')
    .encoding('size', { stat: 'population' })
    .encoding('color', { stat: 'density' })
    .rankedBarChart({ countryGroup: 'eu' }) // no longer crashes past the histogram-fallback threshold
    .build()
```

- **Ranked bar chart hover highlight never cleared on mouseout.** `highlightRegionById()` set the hover color without first stashing the region's original fill into `fill___`, so `unhighlightRegionById()` (which reads `fill___` to restore it) always found it empty and left the region stuck in the hover color.

- **Statistical label backgrounds ignored their configured colour, and left a stray empty rectangle behind for 'data not available' regions.** The `.em-label-background` CSS class hardcoded `fill: #ffffff`, which - being an actual CSS declaration rather than a presentation attribute - always overrode the colour set via `.labels({ backgroundFill })`, no matter what was configured. Background rectangles were also appended even for regions with no label text to show.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap
    .map('ch')
    .labels({ values: true, backgrounds: true, backgroundFill: '#ffcc00' }) // now actually applied
    .build()
```

- **`tooltip.omitRegions` was ignored on pie, bar, and waffle composition maps** - an omitted region still highlighted and showed its tooltip on hover. Choropleth, categorical, coxcomb, and proportional-symbol maps already respected it; the shared composition-map mouseover handlers and each chart type's own glyph-level handler now check it too.

Example:

```javascript
eurostatmap
    .map('pie')
    .tooltip({ omitRegions: ['FR'] }) // FR is now correctly excluded from hover/tooltip
    .build()
```

- **Diverging discrete legends using `pointOfDivergenceLabelsAtExtremes` positioned each label too close to its arrow tip**, most noticeable on the shorter of the two arrows. The reserved margin is widened from 14px to 20px.

- **Proportional-symbol spike legends' title now shares the common `em-size-legend-title` CSS class** used by other legend types, so shared title styling/selectors apply consistently across legend types.

- **`'composition'` is now a recognized `MapType` in TypeScript**, matching what the runtime already accepted as an alias for the pie map type.

```ts
eurostatmap.map('composition') // no longer a type error
```

## 4.10.3

### Fixes

- **Multivariate (size + color) proportional-symbol maps with insets could throw `"... is not a function"` and render no symbols at all in their insets**, while the main map rendered fine. `applyClassificationToMap()` and the draw-order fallback both checked the color classifier on the per-call target object - which for an inset is that inset's own separate map instance, not the shared layer that actually holds the classifier. Insets were treated as if they had no color classifier at all, so their symbols got tagged with a placeholder `'has-data'`/`'nd'` class instead of a numeric one; styling then tried to divide that placeholder to pick a color, producing `NaN` and an "is not a function" error that aborted styling for every inset.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap
    .map('ps')
    .psSettings({ classificationMethod: 'threshold', colors, thresholds })
    .insets('eu')
    .build()
```

## 4.10.2

### Fixes

- **Hovering the max/min stat-value label in a discrete legend now correctly highlights the matching feature on proportional-symbol maps too, not just choropleths.** The mouseover handler isolated a single region by id using choropleth-only region-fill logic (`getLegendRegionsSelector`/`highlightRegions`), and mouseout always called the choropleth-only `unhighlightRegions` - neither worked for PS symbols, which live in a separate centroids group and are highlighted via opacity, not fill.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap
    .map('ps')
    .psSettings({ classificationMethod: 'threshold', colors, thresholds })
    .legend({ maxMin: true, colorLegend: { maxMin: true } }) // hover the max/min labels - now highlights the right circle
    .build()
```

- **`pointOfDivergenceLabelsStacked` + `pointOfDivergenceLabelsAtExtremes` positioned the top diverging label further north than the max stat value label**, and (independently) sat its label almost flush against the arrow tip when `pointOfDivergenceLabelsAtExtremes` was false. Both labels now use consistent vertical offsets that match the max/min value labels' own centering, with a wider, balanced gap from the arrow tip in the non-extremes case.

## 4.10.1

### New

- **Diverging discrete legends (choropleth and proportional-symbol color legends) gained several new styling options**, all optional and backward compatible:
    - `showDivergingLine` - hide the horizontal divergence line/tick and show only the up/down arrows.
    - `divergingLinePadding` - control the gap left after the longest legend label when computing the line's length, instead of a fixed 15px.
    - `pointOfDivergenceLabelsAtExtremes` - position the 2 arrow labels near the top/bottom of the whole scale instead of near the divergence point. Unless `divergingArrowLength` is explicitly set, the arrows stretch to reach near their own label.
    - `pointOfDivergenceLabelsStacked` - position the 2 labels above/below their arrowhead (starting at the arrow's x position) instead of beside it, to save horizontal width.

Example:

```javascript
eurostatmap
    .map('ch')
    .legend({
        pointOfDivergenceLabel: 'Increase|Decrease',
        pointOfDivergence: 3,
        showDivergingLine: false,
        pointOfDivergenceLabelsAtExtremes: true,
        pointOfDivergenceLabelsStacked: true,
    })
    .build()
```

### Fixes

- **Diverging proportional-symbol color legends (`colorLegend.pointOfDivergence`/`pointOfDivergenceLabel`) didn't reliably render.** PS classification called deprecated `psThresholds()`/`psClasses()` wrappers internally (spamming console warnings on every threshold-based classification), and the PS legend never defaulted `pointOfDivergence` when only the label was set - unlike the choropleth legend, whose own default could itself land on a non-integer class index for odd class counts, silently skipping the divergence line since it's matched by strict equality.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap
    .map('ps')
    .psSettings({ classificationMethod: 'threshold', colors, thresholds })
    .legend({ colorLegend: { pointOfDivergenceLabel: 'Increase|Decrease' } }) // pointOfDivergence now defaults correctly
    .build()
```

- **Custom tooltip `textFunction`s reading `map.noDataText_` for `':'` values got `undefined` instead of the configured no-data text**, for both choropleth and proportional-symbol maps. Region hover events call `textFunction(region, layer)` with the internal layer object, not the map - `noDataText_` is map-level state and was never forwarded onto it, unlike `statData`. Now forwarded the same way.

- **The divergence point's own threshold-value label was always relocated (or removed) to avoid overlapping the horizontal divergence line**, even when `showDivergingLine: false` left no line to overlap. It now stays in its normal place next to its own tick in that case.

## 4.10.0

### New

- **Choropleth maps can now mix a small set of categorical exceptions into an otherwise numeric classification**, via `categoryFillStyle`/`categoryText`. Useful when a handful of regions have no meaningful numeric value for a metric (e.g. "no railway lines" on a map of electrification rate) but still deserve their own legend entry and colour, instead of being lumped into the generic "no data" class or forced into a second base layer (mixing two base layers, e.g. a categorical layer on top of a choropleth, is rejected - a region can only be classified by one base layer). Regions whose raw stat value matches a configured key get their own fill colour, legend swatch, and tooltip label instead of numeric classification or default no-data treatment.

Example:

```javascript
eurostatmap
    .map('ch')
    .categoryFillStyle({ '-': '#cccccc' })
    .categoryText({ '-': 'No railway lines' })
    .build()
```

## 4.9.5

### Improvements

- **The ranked bar chart no longer uses any `em-legend-*` CSS classes**, including its own >40-region histogram fallback. It's not a legend and never shared markup with one on purpose - the shared class names were an oversight that let legend-targeted stylesheets accidentally (and often incorrectly) restyle the bar chart too, most notably clobbering the per-bar value label's contrast-computed text color. Its elements now use their own `em-ranked-bar-chart-*` classes with their own default stylesheet. If you had custom CSS targeting the bar chart via `em-legend-*` selectors, update it to the new class names (see `src/core/decoration/ranked-bar-chart.js` and `src/css/decoration/ranked-bar-chart.css`).

## 4.9.4

### New

- **`rankedBarChart()` now works on proportional-symbol maps**, not just choropleth maps. Bars are colored using the map's own color classification (previously only reachable on choropleth layers), falling back to a flat bar color on map/layer types that don't classify regions into colored classes at all.

Example:

```javascript
eurostatmap
    .map('ps')
    .encoding('size', { stat: 'symbolSize' })
    .encoding('color', { stat: 'symbolColor' })
    .rankedBarChart({ countryGroup: 'eu' })
    .build()
```

### Improvements

- **Hovering a bar in the ranked bar chart now highlights only that bar's own region on the map**, instead of highlighting every region that shares its color class. No config changes needed - this is automatic.

## 4.9.3

### Breaking Changes

- **`RankedBarChartConfig` no longer extends `LegendConfig`.** It's a genuinely independent element, not a legend sub-feature, and the inheritance pulled in legend-only concepts (`noData`, `maxMin`/`maxMinLabels`, `titleFontSize`, `titlePadding`, `labelOffsets`, `shapeWidth`, `shapePadding`, `sepLineLength`, etc.) that never did anything for the bar chart. `RankedBarChartConfig` now declares only the fields it actually reads. If you were setting any of those legend-only fields on `rankedBarChart()`, they had no effect before and can simply be removed.

### New

- **`RankedBarChartConfig` gained `height`.** Without it, the bar list grows with region count - all ~35 EU/EFTA/CC countries at the default row height can end up taller than the map itself. When set, bar height and label font size scale down together proportionally so the chart never exceeds that budget.

Example:

```javascript
map.rankedBarChart({
    svgId: 'my-bar-chart-container',
    countryGroup: 'eu',
    height: 300, // bars and labels shrink together to fit this budget
})
```

## 4.9.2

### Fixes

- **`rankedBarChart` never rendered when enabled after the map's initial build** (e.g. a live "show ranked bar chart" toggle switched on after the map had already finished loading). The lazy first-time build only called `.build()` on the new bar-chart object, which just sets up its empty container - the actual bar drawing happens in `.update()`, which is otherwise triggered later by an internal pass tied to stat data resolving, a pass that had already run before the object existed. `.update()` is now called immediately after the lazy build so the bars draw right away.

Example (no code changes needed - just upgrade):

```javascript
// Enabling rankedBarChart after the map is already built and rendered now works correctly.
map.build()
// ...later, in response to a user toggle...
map.rankedBarChart({ svgId: 'my-bar-chart-container', countryGroup: 'eu' })
```

## 4.9.1

### Fixes

- **Legend rendered into a caller-managed external container (`legend({ svgId: ... })`) could jump to a default top-right corner position instead of staying where the caller placed it**, when the map's stat data loaded from a remote source (i.e. wasn't already available synchronously at build time). A deferred internal layout pass could run `applyPosition()` before the legend's "this container is externally positioned, leave it alone" flag had been set - which only happened on the legend's first full content update, itself gated on stat data being ready - so it fell back to positioning the legend itself, permanently overwriting the caller's transform.

Example (no code changes needed - just upgrade):

```javascript
map.legend({ svgId: 'my-legend-container' })
// The legend now reliably stays wherever #my-legend-container is positioned,
// even when statistical data is fetched remotely.
```

## 4.9.0

### New

- **New independent `rankedBarChart` map element** (`map.rankedBarChart(config)`), for choropleth-classified maps - separate from the legend, not a sub-feature of it: one horizontal bar per region, sorted by value, colored by the region's own class color, labeled with its id and value, in the style of statistical-atlas publications. Bars are right-anchored to a common edge and grow leftward as value increases; the value label is drawn inside the bar (automatically switching between black/white for contrast against the bar's own fill) when it fits, otherwise outside to the left of the bar; the region code sits in a bold-italic column that starts right after the bars' shared edge. Above an internal 40-region threshold, automatically falls back to the histogram distribution view instead of drawing one bar per region. Supports `title`/`subtitle` like the legend, and has its own `svgId`/positioning - it can render into a completely separate container/SVG element to the legend's.

Example:

```javascript
map.rankedBarChart({
    svgId: 'my-bar-chart-container',
    title: 'GDP per inhabitant',
    subtitle: 'EU member states only',
    countryGroup: 'eu',
})
```

- **`RankedBarChartConfig` gained `countryGroup`**, to limit which regions appear in the ranked bar chart to a political grouping: `'eu'` (27 member states), `'euEfta'` (+ Iceland, Liechtenstein, Norway, Switzerland), or `'euEftaCc'` (+ current EU candidate countries). Applied before the 40-region histogram-fallback threshold, so filtering a large dataset down to `'eu'` can bring it back within the bar-chart limit.

Example:

```javascript
map.rankedBarChart({ countryGroup: 'euEfta' })
```

## 4.8.6

### Fixes

- **Legend hover-highlight interactions on exported/zoomable maps were unintentionally blocked by `onlyApplyOpacityWhileZoomed` until the user zoomed in.** That setting now purely controls the legend box's own background opacity (its documented purpose) and no longer incidentally blocks the swatch hover-to-highlight interaction via a capture-phase `stopImmediatePropagation()` on legend `mouseover`.

Example (no code changes needed - just upgrade):

```javascript
map.legend({ onlyApplyOpacityWhileZoomed: true })
// Hovering a legend swatch now highlights the map immediately, even before zooming in.
```

## 4.8.5

### New

- **`BivariateLegendConfig` gained `axisTitleFontSize`**, for overriding the axis title font size independently of the legend CSS default.

Example:

```javascript
map.legend({ axisTitleFontSize: 13 })
```

### Improvements

- **The legend background box's conditional opacity (`onlyApplyOpacityWhileZoomed`) now stays synced with the live zoom state** instead of only being applied once, at legend creation.
- **Bivariate legend option changes made via a live `.legend()` call are now correctly honoured** on the next redraw - `annotationOffsets`, `annotationLineEndOffsets` and `noDataYOffset` were previously only checked against the _initial_ config, so a later `.legend({...})` update with these fields could get silently overridden by rotation-dependent defaults.
- **Bivariate legend x-axis break labels no longer sit on top of their tick marks** - label position now accounts for `tickLength`.

### Fixes

- **Overseas inset scalebars (`'image'`, `'eu'`, `'euEfta'` presets) never rendered.** These built-in presets set scalebars via the deprecated flat fields (`showScalebar`, `scalebarPosition`, etc.), but the scalebar renderer only reads the modern nested `scalebar` config - so `scalebar_` stayed unset and nothing drew. Legacy flat scalebar fields on any inset config (built-in presets or your own) are now normalized onto `scalebar` automatically.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap.map('choropleth').insets('image').build()
// Every overseas inset (Guadeloupe, Réunion, Malta, etc.) now shows its scalebar again.
```

### Breaking Changes

- **`BivariateLegendConfig`'s `annotationLineEndOffset` is renamed to `annotationLineEndOffsets`**, for naming consistency with the other per-corner offset options.
- **`BivariateLegendConfig`'s deprecated `annotationPadding` option is removed.** Use `annotationOffsets`/`annotationLineEndOffsets` instead.

Example:

```javascript
map.legend({ annotationLineEndOffsets: { x: 2, y: -2 } })
```

## 4.8.3

### Improvements

- **`InsetConfig` now types the fields insets actually accept**, instead of an untyped catch-all. Adds `svgId`, `position`, `titlePosition`, `subtitlePosition`, `labels`, `zoomButtons`, `nuts2jsonBaseURL`, `projectionFunction`, `insets` (for nested insets), `insetBoxPosition`, and the scalebar-related fields (`scalebar`, plus the deprecated flat `scalebarPosition`/`scalebarUnits`/etc. still accepted at runtime).

Example:

```typescript
import type { InsetConfig } from 'eurostat-map'

const inset: InsetConfig = {
    geo: 'MT',
    x: 0,
    y: 0,
    width: 90,
    height: 100,
    svgId: 'inset-mt',
    scalebar: { show: true, position: [1, 60] },
}
```

- **`LabelsConfig` and its `Label` entry type are now exported from the package root** (previously only used internally, so consumers had to redeclare the shape themselves).

Example:

```typescript
import type { LabelsConfig, Label } from 'eurostat-map'
```

- **`LocationConfig`'s `LocationLabelStyle` and `LocationShape` types are now exported from the package root**, alongside the already-exported `LocationConfig`.

Example:

```typescript
import type { LocationLabelStyle, LocationShape } from 'eurostat-map'
```

### Fixes

- **`CategoricalMapConfig` was missing `classToText`**, even though `.classToText()` has always been a real, supported categorical-map builder method (used for legend/tooltip labels). The config-object type now matches the builder API.

Example:

```typescript
import type { CategoricalMapConfig } from 'eurostat-map'

const config: CategoricalMapConfig = {
    classToFillStyle: { A: '#1f78b4', B: '#33a02c' },
    classToText: { A: 'Category A', B: 'Category B' },
}
```

## 4.8.2

### Fixes

- **Proportional symbols (and other centroid-based layers) could end up permanently empty in inset maps.** An optimistic first render pass could run before an inset's own async geometry fetch resolved; that premature pass cached an _empty_ centroid list, and since an empty array is still truthy, every later readiness check treated it as "already computed" and skipped recomputing it - even after the real geometry arrived. Symbols now only get cached once the inset's own projection is actually ready, so late-resolving insets pick up their data correctly instead of silently staying blank. Affects every inset style (`'image'`, `'eu'`, `'euEfta'`, and manually-configured insets), and is most visible on proportional-symbol maps, where it previously required manually rebuilding the insets (e.g. toggling the inset style off and back on) to see the circles appear.

Example (no code changes needed - just upgrade):

```javascript
eurostatmap.map('proportionalSymbol').insets('image').build()
// Inset symbols (Guadeloupe, Réunion, Malta, etc.) now render correctly on the first build.
```

## 4.8.1

### New

- **`.insets()` accepts three new named presets alongside `'default'`: `'image'`, `'eu'`, and `'euEfta'`.** `'image'` is a fully hand-tuned overseas-territories layout (Malta, Liechtenstein, and the EU/EFTA overseas and remote territories) with connecting decoration - a background box, separator lines between adjacent insets, and soft blur/fade gradients on a few edges - built in instead of requiring the caller to hand-roll the layout and decoration DOM themselves. `'eu'` and `'euEfta'` are simpler undecorated grid layouts of the same territory sets (the latter adding Liechtenstein and Svalbard), for callers who want the territory selection without the `'image'` chrome.

Example:

```javascript
eurostatmap.map('choropleth').insets('image').insetBoxPosition([545, 81]).build()
```

- **Bivariate legend axis arrows and extreme labels can now be set independently per axis.** `axisArrows` and `showAxisExtremes` accept either a single boolean (both axes) or `{ x, y }` to control each axis separately.

Example:

```javascript
map.legend({
    axisArrows: { x: true, y: false },
    showAxisExtremes: { x: true, y: false },
})
```

- **Bivariate legend axis titles support multiline text**, using the same pilcrow (`¶`) line-break convention as other map text fields.

Example:

```javascript
map.legend({ label1: 'GDP per¶capita', label2: 'Population¶density' })
```

### Fixes

- **The `'image'` inset preset no longer shows a stray grey frame around every inset.** Every map instance (main map and insets alike) gets a `.em-frame` rect from the generic build path regardless of preset; `'image'`'s own separator lines already provide the visual separation this layout wants, so frames are now hidden by default for this preset and re-enabled only on the small zoomed-in detail insets (the Guadeloupe/Açores close-ups) that declare their own `frameStrokeWidth`.

## 4.8.0

### New

- **Geographic labels (country/sea names) now support the same `backgrounds` readability treatment previously only available for statistical value labels** - a solid background rectangle behind each label instead of (or as well as configured) a stroke halo. New `backgroundFill` option controls the rectangle's fill color.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .labels({
        labels: eurostatmap.getDefaultLabels().EUR_3035.en,
        backgrounds: true,
        backgroundFill: '#ffe4b5',
    })
    .build()
```

### Improvements

- **World-map centroid selection no longer depends on incidental state ordering** - `geo_ == 'WORLD'` is now checked before falling back on `centroidsData` presence, so stale or malformed centroid state can't accidentally route a world map through the wrong (NUTS-level-indexed) centroid path.
- **Statistical label halos on mixed-level maps no longer duplicate at the wrong centroid for regions present in more than one geometry collection** (noticeable for Serbia) - halos now bind to the same deduplicated feature set the value-label layer itself uses.
- **Bivariate legend break labels are now opt-in per axis**, drawn only when `breaks1`/`breaks2` arrays are explicitly supplied, instead of an unreliable auto-derive-from-classifier path (`showBreaks`) that has been removed.

### Fixes

- **Continuous (choropleth) legend domain is now correctly forwarded from the active layer to the map facade** - `domain_` was missing from `stat-map.js`'s field-forwarding list (every other classification field was already forwarded), so the continuous legend always read the `[0,1]` fallback instead of the real computed domain, placing tick labels tens of thousands of pixels off-canvas and inflating the legend background box to an enormous height.
- **Proportional-symbol draw-order sorting no longer drops symbols whose centroid id has no directly-matching value** - filtering these out entirely (rather than sorting them last) could wipe out every symbol for a layer or inset whose own centroid ids don't literally match a coarser dataset's ids (e.g. an inset's NUTS2/3-level ids against a country-level dataset). Symbols without a resolvable value already render at `r=0` downstream, so keeping them in the sort only affects z-order, not which regions end up visible.
- **Categorical map tooltips now correctly show the "no data" state for explicit `':'` values**, not just `undefined`/falsy ones, and render it in the same table markup as populated tooltips instead of a bare text node.

## 4.7.1

### Fixes

- **Legends no longer forced into the top-right corner when rendered into a caller-managed external container (`svgId`)** - if you position your own legend `<g>` yourself (e.g. as a sibling of the map's zoom group, so it stays fixed during pan/zoom) and pass its id via `legend({ svgId })` without `x`/`y`/`position`, the legend now renders into your container without eurostat-map overwriting its transform. Previously, an unscoped default-position fallback was applied regardless, and a scoped-vs-unscoped selector mismatch elsewhere could also cause a second, wrongly-positioned duplicate element to be created.

Example:

```javascript
// caller-managed container, positioned externally via its own transform - not by eurostat-map
eurostatmap.map('choropleth').legend({ svgId: 'my-external-legend-container' }).build()
```

- **Proportional-symbol insets no longer show phantom, off-position circles for unrelated countries** - insets were supplementing their centroids from the same unscoped, whole-map country list the main map uses, then projecting those through the inset's own (tiny, zoomed-in) projection - placing symbols for countries far outside the inset's own territory well outside its visible viewBox. Insets now only use their own NUTS-scoped centroids.

Example:

```javascript
eurostatmap
    .map('ps')
    .nutsLevel('mixed')
    .insets(true) // e.g. Malta, Liechtenstein, Açores, Madeira insets
    .encoding('size', { stat: 'population' })
    .build()
```

- **Scalebar config objects built with `a ?? b` style fallback chains no longer clobber defaults with explicit `undefined`** - a partial scalebar config (main map, `.scalebar({...})`, or an inset's `scalebar` config) that included a key present-but-`undefined` (a common byproduct of normalizing legacy option names) previously overwrote a good default via `Object.assign`, which could throw `TypeError: Cannot read properties of undefined (reading '0')` inside `addScalebarToMap`. Merging now skips explicitly-`undefined` keys.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .scalebar({ position: [10, 10] }) // other fields safely fall back to defaults, even if a caller
    // builds this object with `field: a ?? b` where both a and b are undefined
    .build()
```

## 4.7.0

### New

- **Legend hover opacity/highlighting can now be gated to only apply while the map is zoomed in** - `legend({ onlyApplyOpacityWhileZoomed: true })` suppresses hover highlighting at the initial zoom level, and re-enables it automatically once the user zooms in; zooming back out to the initial view disables it again.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .legend({
        onlyApplyOpacityWhileZoomed: true,
    })
    .build()
```

### Fixes

- **Scalebars on insets no longer render with `NaN` coordinates** - the scalebar is now redrawn once the map's position/pixel-size is fully resolved, instead of relying only on a subsequent zoom event. Previously, an inset scalebar drawn before its pixel size was known (e.g. before geo data finished loading) could permanently bake `NaN` into its tick/midline coordinates if that inset was never panned or zoomed afterwards.

Example:

```javascript
eurostatmap.map('choropleth').insets(overseasInsetsWithScalebars).scalebar(true).build()
```

## 4.6.2

### Fixes

- **Choropleth now auto-resolves fill data when no explicit fill encoding is provided** - legacy setups that only define one named stat dataset now render without requiring `encoding('fill', ...)`.

Example:

```javascript
eurostatmap
    .map('choropleth')
    .stat('value', { customData: { FR: 10, DE: 20, ES: 15 } })
    // no explicit encoding('fill', { stat: 'value' }) needed
    .build()
```

- **Inset updates now reliably reuse/reposition external inset SVG containers and clear stale placeholders** - switching inset layouts repeatedly no longer leaves stale external inset scaffolding visible.

Example:

```javascript
map.insets(overseasInsets).build()

// Later switch to a smaller inset set (for example LI/MT-only) and back again.
map.insets(liMtInsets).build()
map.insets(overseasInsets).build()
```

- **Proportional-symbol circles now render again in external inset SVGs after map-type switches** - inset symbol drawing now uses the owning proportional-symbol layer state for size/classifier while still rendering inside inset containers.

Example:

```javascript
const map = eurostatmap.map('ps').stat('population', { customData: values }).encoding('size', { stat: 'population' }).insets(overseasInsets).build()
```

- **Proportional-symbol tooltips now work on external inset symbols** - tooltip handlers now resolve the tooltip host from inset context with fallback to the parent map tooltip instance.

Example:

```javascript
const map = eurostatmap
    .map('ps')
    .tooltip({
        textFunction: (id, name, value) => `<b>${name}</b><br/>${value}`,
    })
    .insets(overseasInsets)
    .build()
```

## 4.6.1

### Fixes

- **Continuous legend hover tolerance now matches configured width** - `highlightTolerance` is now interpreted as the total highlighted value span (not plus/minus each side). For example, `highlightTolerance: 1` highlights a width of exactly 1 unit.

Example:

```javascript
eurostatmap
    .map('ch')
    .colorSchemeType('continuous')
    .legend({
        highlightTolerance: 1, // highlights exactly a 1-unit value band
    })
    .build()
```

- **Removed false proportional-symbol deprecation warnings from internal rendering** - deprecated `ps*` wrappers are no longer called internally during style updates, so deprecation warnings now appear only when user code calls deprecated APIs.

Example:

```javascript
// Preferred API (no deprecation warning):
map.psSettings({
    fillOpacity: 0.9,
    stroke: '#fff',
    strokeWidth: 0.2,
})

// Deprecated API still warns (only when called by user code):
// map.psFillOpacity(0.9)
```

## 4.6.0

### New

- **`sizeLegend.subtitle` and `colorLegend.subtitle`** — proportional-symbol legends now support a subtitle line rendered below the title in both the size and colour sections.

- **Per-level symbol filtering** — `map.nutsLevel(n)` now strictly enforces that only NUTS level _n_ symbols are rendered. Setting `nutsLevel('mixed')` continues to show all levels simultaneously.

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
