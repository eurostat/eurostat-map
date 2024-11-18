# Release notes

## v4.0.0

-   Almost all inline styles moved to CSS (see ./css.md and deprecated.js)
-   Function names renamed to more understandable ones (e.g. clnb() to numberOfClasses())
-   Jenks and ckmeans classification methods added (uses simple-statistics library)
-   Annotations capability added (uses d3-svg-annotation)
-   map.maxBounds({xMin,yMin,xMax,yMax}) added to limit panning/zooming extent
-   map.position({x,y,z}) setting now replaces map.geoCenter([x,y]) and map.pixelSize()
-   stroke-width now adjusts accordingly when zooming in and out
-   Default nutsYear now 2024
-   Choropleth legends can now be bar charts (use legend.barChart: true) see test/map-types/choropleth/test_bar_chart_legend.html
