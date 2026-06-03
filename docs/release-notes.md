# Release notes

## Unreleased

- Composition maps: pie chart API refactored to use `compositionSettings({...})` for shared composition options and `pieSettings({...})` for pie-specific options.
- Composition sizing renamed from radius-oriented naming to generic sizing (`minSize`/`maxSize`) for non-circular composition symbols.
- Pie composition rendering now supports multiple composition symbol types through `compositionSettings.type` (including `flag`, `segment`, `ring`, `radar`, `agepyramid`, `halftone`, `pie`).
- Backward compatibility aliases for removed pie-prefixed methods added in deprecated API shims with migration warnings.
- Dorling collision behavior improved for non-circular composition symbols (especially flag-like shapes) with shape-aware collision radius inflation.
- Dorling padding now applies consistently across animated, synchronous, and worker-based simulation paths.

## v4.0.0

- Almost all **inline styles moved to CSS** (see ./css.md and deprecated.js)
- Users can now specify **custom geometries** (linked to statistics with 'regions:true' property)
- **Function names** renamed to more understandable ones (e.g. clnb() to numberOfClasses())
- **Jenks and ckmeans** classification methods added (uses simple-statistics library)
- **Annotations** capability added (uses d3-svg-annotation)
- **map.position({x,y,z})** setting now replaces map.geoCenter([x,y]) and map.pixelSize()
- stroke-width and font-size (e.g. for stat labels) now **adjusts accordingly when zooming in and out**
- Default nutsYear now 2024
- Choropleth legends can now be **bar charts** (use legend.histogram: true) see test/map-types/choropleth/test_bar_chart_legend.html
- **Labelling** API refactored.
- **map.labels({processValueLabelCentroids((region, centroid)=> custom logic)})** function now available to manually adjust or edit label centroids (e.g. for overlapping label placement correction). See test/test_labels.html
- Default geometries (NUTS) filter: **map.filterGeometriesFunction((geometries)=>{return geometries})** to be used in favour of countriesToShow([]) and bordersToShow([])
