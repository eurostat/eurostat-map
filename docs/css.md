# eurostat-map.js CSS

Here you can find the CSS classes used to style the map and its components, in case you wish to override the default styles.

## Map

```css
.em-map
.em--borders-light //on the map svg: map.lightBorders(true)
.em--dark //on the map svg: map.darkMode(true)
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
| National | `.em-cntbn`     | `#353535` | 0.8px, with a 1.9px white halo |
| Kosovo   | `.em-kosovo-bn` | `#787878` | 0.5px |
| Regional | `.em-bn-1/2/3`  | `#858585` | 0.3px |

These are the colours and widths of Eurostat's border guideline. A solid line with no halo vanishes over a fill of its own lightness, so no pair of different solid colours keeps the Kosovo border above the regional ones over every possible fill: over mid-tone data colours (about L\* 43-52, e.g. the 6th class `#5169be` of the default 7-class choropleth palette) the `#858585` regional lines stand out slightly more than the `#787878` Kosovo line. The guideline accepts this. `test/kosovo-border.test.mjs` checks the hierarchy over the fills each map actually renders and lists the fills that fall in that band.

Map types that mute their national borders (proportional symbol, pie, coxcomb, sparkline, flow, bar and waffle maps, and world maps) scale the Kosovo border down with them. Proportional symbol, pie and coxcomb maps share one style: grey national borders (0.8px), a `#999` 0.5px Kosovo border, 0.2px regional borders and 0.2px grey coastlines. Bar and waffle maps draw national borders in `#c2c2c2` (0.8px) and Kosovo in the same grey at 0.5px: a lighter Kosovo grey stood out as much as the national line over the `#adadad` no-data fill. If you override the national or regional border styles, adjust `.em-kosovo-bn` so it stays in between.

#### Border modes

Rather than overriding these rules for white borders or a dark background, use the built-in modes. `map.lightBorders(true)` adds `.em--borders-light` and `map.darkMode(true)` adds `.em--dark` to the map's `<svg>` and every inset's (see [reference.md](./reference.md#border-modes)). Their rules are in `css/border-modes.css`; both modes can be combined, and disputed borders (`.em-bn-d`) stay dashed in all of them.

| Mode           | National                                               | Kosovo            | Regional          | Disputed                |
| -------------- | ------------------------------------------------------ | ----------------- | ----------------- | ----------------------- |
| Default        | `#353535` 0.8px, 1.9px white halo                      | `#787878` 0.5px   | `#858585` 0.3px   | `#818181` 0.3px, dashed |
| `lightBorders` | `#fff` 1px, no halo                                    | `#fff` 0.5px      | `#fff` 0.3px      | `#fff` 0.3px, dashed    |
| `darkMode`     | unchanged (the white halo carries it on the dark land) | unchanged         | unchanged         | unchanged               |
| both           | as `lightBorders`                                      | as `lightBorders` | as `lightBorders` | as `lightBorders`       |

`darkMode` also fills the sea with `#1a1a2e` and land without data with `#2a2a3e`, and draws coastlines (`.em-bn-co`) in `#444466`. It does not restyle titles, legends, labels or tooltips.

Muted map types keep their scaled-down widths in every mode:

- with `lightBorders`, proportional symbol, pie, coxcomb, bar and waffle maps (muted by colour in the default mode) keep 0.8px national borders instead of 1px; flow and sparkline maps keep their thin lines (national 0.25/0.2px, Kosovo 0.16/0.12px); world maps keep 0.5px national and 0.3px Kosovo borders.
- with `lightBorders` and without `darkMode`, proportional symbol, pie, coxcomb, bar, waffle and sparkline maps, whose land is near-white (`#f2f2f2`), use light greys instead of white, which would vanish there: national and disputed `#cfcfcf`, Kosovo `#cfcfcf` too but thinner, regional `#dcdcdc`. Over the `#adadad` no-data fill, a lighter Kosovo grey stood out as much as the national line. Everywhere else light borders are white.
- with `darkMode`, where national borders are muted to a grey, the Kosovo border uses a darker grey than them (a lighter line stands out more on the dark land): `#6e6e80` on flow maps, `#80808e` on sparkline maps, `#9a9aa8` on bar and waffle maps. Proportional symbol, pie and coxcomb maps, whose no-data regions are mid-grey (`#adadad`), draw Kosovo in their national grey, `#808080`, at 0.5px against 0.8px: a darker grey stood out as much as their national line there. World maps lighten their national borders to `#8a8a9a` and draw Kosovo in the same colour at 0.3px, so it stays below the 0.5px national line over any fill (a darker `#66667a` stood out more than the national line over light fills).

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
