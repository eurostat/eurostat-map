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
.em-flow-link
.em-flow-link-outline

```

### Border hierarchy and the Kosovo border

Eurostat's rule is that the Kosovo border (`.em-kosovo-bn`) must always look in between a national and a regional border: less prominent than `.em-cntbn` (or `.em-worldbn` on world maps), more prominent than `.em-bn-1/2/3` (or the region outlines `.em-nutsrg [lvl]` on mixed-level maps). Distinguish it by stroke colour and width only: no `opacity` (its look would then depend on the fill underneath), no dashing unless the national borders are dashed too, and no halo.

The defaults are:

| Border   | Class           | Stroke    | Width |
| -------- | --------------- | --------- | ----- |
| National | `.em-cntbn`     | `#353535` | 0.8px |
| Kosovo   | `.em-kosovo-bn` | `#787878` | 0.5px |
| Regional | `.em-bn-1/2/3`  | `#868686` | 0.3px |

Map types that mute their national borders (proportional symbol, pie, coxcomb, sparkline, flow, bar and waffle maps, and world maps) scale the Kosovo border down with them. If you override the national or regional border styles, adjust `.em-kosovo-bn` so it stays in between, for example with white borders:

```css
.em-cntbn {
    stroke: #fff;
    stroke-width: 1px;
}
.em-kosovo-bn {
    stroke: #fff;
    stroke-width: 0.5px;
}
.em-bn-1,
.em-bn-2,
.em-bn-3 {
    stroke: #fff;
    stroke-width: 0.3px;
}
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
.em-tooltip
.em-tooltip-text
.em-tooltip-bar
.em-tooltip-piechart-container
```
