---
name: eurostat-map
description: Build interactive statistical maps of Europe (choropleth, proportional symbols, bivariate, pie/composition, flow, cartograms...) with the eurostat-map JavaScript library, using Eurostat database codes, CSV or custom data on NUTS regions. Use when asked to make, edit or debug a map with eurostat-map or `eurostatmap`.
---

# Using eurostat-map

eurostat-map is a D3-based library that draws SVG thematic maps of Europe. It fetches NUTS
geometries (Nuts2json) and, optionally, statistics from the Eurostat database by itself, so a
working map is usually 10 to 20 lines. This file is a guide for people and agents **using** the
library. For changing the library itself, read [AGENTS.md](../../AGENTS.md).

Authoritative sources, in this order:

1. [docs/reference.md](../../docs/reference.md) (hand-written, one row per option; the published
   copy is https://eurostat.github.io/eurostat-map/docs/reference.html).
2. [Typings](../../src/types) and the generated API docs https://eurostat.github.io/eurostat-map/docs/api/index.html.
3. [examples/](../../examples), one runnable HTML page per map type (live: https://eurostat.github.io/eurostat-map/examples/index.html).

Copy the closest example and change it. Do not guess option names: look them up, because a wrong
name is silently ignored or fails only at build time.

## Minimal map

```html
<svg id="map"></svg>
<script src="https://unpkg.com/eurostat-map"></script>
<script>
    eurostatmap
        .map('choropleth')
        .title('Population density in Europe')
        .stat('density', { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²', filters: { time: '2021' } })
        .encoding('fill', { stat: 'density', scale: 'quantile', classes: 6 })
        .nutsLevel(2)
        .legend({ title: 'Density, people/km²', position: 'top right' })
        .build()
</script>
```

With npm: `import eurostatmap from 'eurostat-map'` (the package also ships TypeScript typings).

How it works:

- The map draws into the SVG element whose id is `svgId` (default `"map"`).
- Every setter is also a getter and returns the map, so calls chain: `map.width(800)` sets,
  `map.width()` reads.
- Nothing is drawn until `.build()`. After changing a built map, call the narrowest update that
  covers the change (`updateStatData()`, `updateClassification()`, `updateStyle()`, `updateLegend()`)
  or `build()` again.
- `.build()` starts async fetches. Use `.onBuild(fn)` to run code once drawing is finished.

## The model: `stat(...)` then `encoding(...)`

This is the preferred API (the old channel-named form `stat('size', ...)` still works).

- `stat(name, config)` registers a **named dataset**.
- `encoding(channel, { stat: name, ... })` binds a dataset to a **visual channel**: `fill`, `color`,
  `size`, `x`, `y`, `composition`, `opacity`...

Three kinds of data source (the `config` of `stat`):

| Source            | Config                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Eurostat database | `{ eurostatDatasetCode, filters: { dimension: 'CODE', time: '2023' }, unitText }`               |
| CSV               | `{ csvURL, geoCol: 'NUTS_ID', valueCol: 'value' }`                                              |
| Your own values   | `map.statData(name).setData({ DE: 12.1, FR: { value: 9.4, status: 'e' } })` (keys are NUTS ids) |

Rules that cause most mistakes:

- **Filters should pin every dimension except `geo`.** The default is `{ lastTimePeriod: 1 }`, and
  the geographic level is added from `nutsLevel` for you. Give a value for each other dimension of
  the dataset (age, sex, unit, time...); every example does. Find the codes with the Eurostat query
  builder (https://ec.europa.eu/eurostat/web/query-builder). With several values per region, the latest
  time or the first category is used and a console warning says which. An API error (unknown dataset, invalid
  filter) is logged to the browser console as `Error retrieving Eurostat data: ...`: read it first.
- **Region ids are NUTS codes**, which differ from ISO codes in places (Greece is `EL`, not `GR`).
  A custom value or CSV row only shows up if its id matches a region of the chosen `nutsLevel` and
  `nutsYear`.
- **Use `nutsLevel` and `nutsYear` that exist for your data.** Defaults are level 3 and year 2024,
  and not every Eurostat dataset is published at every level. `'mixed'` shows several levels.
- Proportional symbols draw negative values by their amount: blue and red by default, solid and outline with your own
  `fill` (`psSettings({ positiveFill, negativeFill })`).
- Choropleths are for _intensive_ values (rates, densities, shares). Use proportional symbols for
  _extensive_ values (counts, totals). This is the library's own guidance.

## Choosing a map type

`eurostatmap.map(type)`; the long name and the short alias are equivalent.

| Goal                            | Type                                                    | Channels                      |
| ------------------------------- | ------------------------------------------------------- | ----------------------------- |
| One rate or density per region  | `choropleth` (`ch`)                                     | `fill`                        |
| Totals, optionally coloured     | `proportionalSymbol` (`ps`)                             | `size`, `color`, `ring`       |
| Two variables at once           | `bivariateChoropleth` (`chbi`)                          | `x`, `y`                      |
| Three shares summing to a whole | `trivariateChoropleth` (`chtri`)                        | see reference                 |
| Categories (typologies)         | `categorical` (`ct`)                                    | `fill` + `classToFillStyle`   |
| Composition of a total          | `pie`, `waffle`, `bar`, `mushroom`, `stripe`            | `composition`                 |
| Composition over several times  | `coxcomb`                                               | `statCoxcomb({ ... })`        |
| Time trend per region           | `sparkline`                                             | see reference                 |
| Flows between places            | `flow`                                                  | `flowGraph({ nodes, links })` |

Composition maps take one `stat` with `categoryParameter`, `categoryCodes`, `categoryLabels` and
`categoryColors`, then `.encoding('composition', { stat })`. See `examples/composition` and
`examples/pie-charts`.

**Several layers** (for example a choropleth with proportional symbols on top): call
`eurostatmap.map()` with no type, register the `stat`s once, then `.layers([...])` or `.addLayer(type)`.
A map can have at most one _base_ layer (choropleth, categorical, bivariate...) plus any number of
_overlay_ layers (symbols, pies, flows...). See [docs/multi-layer-guide.md](../../docs/multi-layer-guide.md).

## Common customisation

| Need                 | Use                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classes and colours  | `numberOfClasses`, `classificationMethod` (`quantile`, `equinter`, `ckmeans`, `jenks`, `threshold` + `thresholds`), `colors('teal')` or an array, `colorSchemeType('continuous')` (its legend shows values only with `legend({ ticks: 5 })`)   |
| Diverging data       | `colors('cobalt-plum')` plus `pointOfDivergence(0)`; `colorStretch('sqrt')` (or `'cbrt'`, `'log'`) for skewed data with a continuous scheme                                         |
| Flow route shape     | `flowSettings({ lineType: 'straight', lineGeometry: 'greatCircle' })` for world maps. `edgeBundling` + `bundleSettings.chargeStrength`: > 0 bundles, < 0 un-bundles (fans routes out) |
| Flow small multiples | `flowSettings({ widthDomain: [0, max] })` with the same domain in every map keeps widths comparable; draw one shared legend with `legend({ svgId })` and `legend(false)` on the rest (see `examples/flow/flights/capital-airports.html`) |
| Reciprocal flows     | `flowSettings({ lineType: 'straight', bidirectional: true, bidirectionalLayout: 'parallel', arrows: true })` draws each direction side by side (not with edge bundling)             |
| Responsive layout    | Layout follows the width the map is drawn at (its container, or an explicit `width()`); omit a fixed `width()` to let it reflow, see [docs/responsive.md](../../docs/responsive.md) |
| Missing data         | `noDataFillStyle`, `noDataText`, legend `noData: false` to hide the entry                                                                                                           |
| Size and position    | `width`, `height`, `position({ x, y, z })`, `scale('60M')` for smaller, simpler geometry                                                                                            |
| Zoom                 | `zoomExtent([1, 8])`, `zoomButtons(true)`, `zoomTo({ x, y, z }, { duration })` glides to a view (needs zoom enabled)                                                                |
| Overseas territories | `insets('default')`                                                                                                                                                                 |
| Legend               | `legend({ title, position: 'top right', x, y, boxOpacity, decimals })`                                                                                                              |
| Tooltip              | `tooltip({ textFunction: (region, map) => html, showFlags: false })`                                                                                                                |
| Events               | `onRegionClick((event, regionId, props) => ...)`                                                                                                                                    |
| Own geometries       | `geometries([{ id, class, statisticalRegions: true, features }])`                                                                                                                   |
| World map            | `geo('WORLD')`, `proj('54030')` (choropleth only)                                                                                                                                   |
| Export               | `exportMapToPNG()`, `exportMapToSVG()`                                                                                                                                              |
| Accessibility        | `ariaDescription('main finding')` (say what the map shows); the name comes from `title`, arrow keys move between regions, flows and legend items (`keyboardNavigation(false)` to disable)                   |
| Failures             | `onError((error, map) => ...)`: `error.type` is `geometry`, `data` or `render`; `onBuild` does not run when data fails                                                              |
| Styling              | CSS classes (`em-*`, see [docs/css.md](../../docs/css.md)); `darkMode(true)`, `lightBorders(true)`                                                                                  |

## Gotchas

- **Needs network.** Geometries (Nuts2json on GitHub) and Eurostat data are fetched at build time.
  Offline or behind a proxy, set `nuts2jsonBaseURL` and supply data with CSV or `statData().setData`.
- **Deprecated calls still work but warn in the console** (for example `showZoomButtons` became
  `zoomButtons`). Follow the warning, and prefer the names in `reference.md` over older examples.
- **Style with options and CSS, not by editing the output SVG.** Classes are listed in
  [docs/css.md](../../docs/css.md).
- **Custom tooltips** get `(region, map)`: `tooltip({ textFunction: (region, map) => html })`.
  Read stat values through `map.statData().get(regionId)` or the `getEncoding*` helpers.
- **Attribution and boundaries.** The NUTS geometries are copyrighted with specific usage
  provisions (https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units). The README
  carries a disclaimer on territorial designations (Kosovo\*, Palestine\*): keep it when you
  publish a map.
- **Check the result.** Open the page and look at it: missing regions, an all-grey map or a legend
  with one class usually means wrong NUTS level, wrong filters or non-NUTS ids.

## Related

- To find the NUTS id of a place before hard-coding data, use the GISCO ID service
  (`https://gisco-services.ec.europa.eu/id/api-docs/`), which returns the NUTS regions containing a
  coordinate.
- For gridded (1 km, 100 m...) data instead of regions, use gridviz: https://github.com/eurostat/gridviz/tree/master/skills/gridviz
