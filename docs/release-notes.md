# Release notes

## v4.0.0

-   Almost all **inline styles moved to CSS** (see ./css.md and deprecated.js)
-   Users can now specify **custom geometries** (linked to statistics with 'regions:true' property)
-   **Function names** renamed to more understandable ones (e.g. clnb() to numberOfClasses())
-   **Jenks and ckmeans** classification methods added (uses simple-statistics library)
-   **Annotations** capability added (uses d3-svg-annotation)
-   **map.maxBounds({xMin,yMin,xMax,yMax})** added to limit panning/zooming extent
-   **map.position({x,y,z})** setting now replaces map.geoCenter([x,y]) and map.pixelSize()
-   stroke-width and font-size (e.g. for stat labels) now **adjusts accordingly when zooming in and out**
-   Default nutsYear now 2024
-   Choropleth legends can now be **bar charts** (use legend.barChart: true) see test/map-types/choropleth/test_bar_chart_legend.html
-   **Labelling** API refactored.
-   **map.labels({processValueLabelCentroids((region, centroid)=> custom logic)})** function now available to manually adjust or edit label centroids (e.g. for overlapping label placement correction). See test/test_labels.html
-   **map.filterGeometriesFunction((geometries)=>{return geometries})** to be used in favour of countriesToShow([]) and bordersToShow([])
