# eurostat-map.js CSS

Here you can find the CSS classes used to style the map and its components, in case you wish to override the default styles.

## Map

```css
.em-map
.em-title,
.em-subtitle,
.em-source-pretext
.em-source-dataset-link
.em-frame
.em-insets
.em-sea
.em-scalebar-line
.em-scalebar-label
.em-footnote
.em-centroid
.em-graticule

.em-cntrg
.em-nutsrg
.em-worldrg
#g_worldbn
#em-nutsbn
.em-cntbn
.em-worldbn
.em-kosovo-bn
.em-bn-d //disputed
.em-bn-co //coastal
.em-bn-0 //NUTS0
.em-bn-1 //NUTS1
.em-bn-2 //NUTS2
.em-bn-3 //NUTS3
```

## Legends

```css
.em-legend-background
.em-legend-label
.em-legend-title
.em-legend-separator
.em-legend-tick
.em-bivariate-frame
.em-bivariate-nodata
.em-bivariate-axis-title
.em-bivariate-nodata-label
.em-bivariate-tick
.em-bivariate-tick-label
.em-bivariate-square
.em-legend-rect
.em-pie-size-legend-line
```

## Insets

```css
.em-insets
.em-inset-title
.em-inset-subtitle
```

To target a class within all insets use:

```css
.em-insets .em-frame {
    /* your rule here */
}
```

or for a specific inset use:

```css
#em-inset-[your inset svgId here] {
    /* your rule here */
}
```

## Labels

```css
#em-labels
.em-stat-label
.em-stat-label-shadow
.em-flow-label
.em-flow-label-shadow
.em-label-cc
.em-label-shadow-cc
.em-label-countries
.em-label-shadow-countries
.em-label-seas
.em-label-shadow-seas
.em-flow-labels
.em-flow-label
.em-flow-label-shadow
```

## Tootlip

```css
.tooltip-eurostat
.estat-vis-tooltip-text
.estat-vis-tooltip-bar
.em-tooltip-piechart-breakdown
.em-tooltip-piechart-container
```
