# eurostat-map: Data-Driven Maps

<div align="center">
  <img src="https://img.shields.io/bundlephobia/min/eurostat-map" alt="npm bundle size">
  <img src="https://img.shields.io/npm/v/eurostat-map" alt="npm">
  <img src="https://img.shields.io/badge/license-EUPL-success" alt="license">
  <a href="http://www.awesomeofficialstatistics.org"><img src="https://awesome.re/mentioned-badge.svg" alt="Mentioned in Awesome Official Statistics"></a>
</div>

<br>
<div align="center">
  <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/eurostat-map-logo-cropped.png" alt="examples" width="400"/>
</div>
<div align="center">
  <em>Build publication-ready statistical maps of Europe in minutes.</em>
</div>

<div align="center">
  D3-based mapping library for Eurostat and custom data, with built-in map types for analytical storytelling.
</div>

<div align="center">
  <a href="docs/reference.md"><strong>API docs</strong></a> ·
  <a href="https://eurostat.github.io/eurostat-map/examples/index.html"><strong>Live examples</strong></a> ·
  <a href="https://observablehq.com/collection/@eurostat-ws/eurostatmap-js"><strong>Quickstart notebook</strong></a>
</div>
<hr>

- **Interactive SVG maps** rendered using **D3.js**.
- **TypeScript support** with built-in definition typings.
- **NUTS geometries** fetched dynamically via the **Nuts2json API** (TopoJSON format).
- **Eurostat API integration** using the **JSON-stat** standard.

<hr>
<br>
<div align="center">
<a href="https://eurostat.github.io/eurostat-map/examples/population-density.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/examples.gif" alt="examples" width="600"/> </a>
</div>

---

## Resources

- [Quick Start](#quick-start)
- [What You Can Build](#what-you-can-build)
- [Examples by Use Case](#examples-by-use-case)
- [Installation](#installation)
- [Documentation](#documentation)
- [Developer Path](#developer-path)
- [Technical details](#technical-details)
- [About](#about)
- [Contribute](#contribute)
- [Copyright](#copyright)
- [Disclaimer](#disclaimer)

---

## Quick Start

```bash
npm install eurostat-map
```

```javascript
import eurostatmap from 'eurostat-map'

eurostatmap
    .map('choropleth')
    .title('Population density in Europe')
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
    .legend({ x: 500, y: 180, title: 'Density, people/km²' })
    .build()
```

Want a guided setup? Try the notebook:
https://observablehq.com/@joewdavies/eurostat-map-js

## What You Can Build

- [Choropleth](https://eurostat.github.io/eurostat-map/examples/population-density.html): classed or continuous regional shading.
- [Value-by-alpha](docs/reference.md): dual encoding with color and opacity.
- [Bivariate choropleth](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html): two variables in one map.
- [Trivariate choropleth](https://eurostat.github.io/eurostat-map/examples/trivariate.html): three-variable ternary coloring.
- [Categorical](https://eurostat.github.io/eurostat-map/examples/categorical.html): discrete class-based mapping.
- [Proportional symbols](https://eurostat.github.io/eurostat-map/examples/prop-circles.html): size-based symbol encoding.
- [Mushroom](https://eurostat.github.io/eurostat-map/examples/mushroom.html): bilateral symbol comparison per region.
- [Pie composition](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html): proportional category shares.
- [Bar composition](docs/reference.md): grouped/stacked regional breakdowns.
- [Stripe composition](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html): compact stripe-based composition.
- [Waffle composition](https://eurostat.github.io/eurostat-map/examples/waffle.html): grid-cell composition breakdowns.
- [Coxcomb composition](https://eurostat.github.io/eurostat-map/examples/coxcomb.html): radial composition profiles.
- [Sparkline](https://eurostat.github.io/eurostat-map/examples/sparklines.html): in-map time series microcharts.
- [Flow map](https://eurostat.github.io/eurostat-map/examples/flowmap.html): directional links between territories.

## Examples by Use Case

### Core analytical maps

- [Population density choropleth](https://eurostat.github.io/eurostat-map/examples/population-density.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-density.html))
- [Proportional circles](https://eurostat.github.io/eurostat-map/examples/prop-circles.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-circles.html))
- [Categorical NUTS typology](https://eurostat.github.io/eurostat-map/examples/categorical.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/categorical.html))
- [World map](https://eurostat.github.io/eurostat-map/examples/world.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/world.html))

### Composition and structure

- [Proportional pie charts](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-piecharts.html))
- [Farm size composition](https://eurostat.github.io/eurostat-map/examples/farm_size.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/farm_size.html))
- [Livestock composition](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/livestock_composition.html))

### Time and change

- [Population change](https://eurostat.github.io/eurostat-map/examples/population-change.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-change.html))
- [Sparklines since 2012](https://eurostat.github.io/eurostat-map/examples/sparklines.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/sparklines.html))
- [20 years of GDP change](https://eurostat.github.io/eurostat-map/examples/small_multiple.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/small_multiple.html))

### Relationships and advanced views

- [Bivariate unemployment/population](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/pop-unemploy-bivariate.html))
- [Flow map](https://eurostat.github.io/eurostat-map/examples/flowmap.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/flowmap.html))
- [Country focus: Spain](https://eurostat.github.io/eurostat-map/examples/spain.html) (see [code](https://github.com/eurostat/eurostat-map/blob/master/examples/spain.html))

## Installation

### Node.js

```npm
npm install eurostat-map
```

then

```javascript
import eurostatmap from 'eurostat-map'
```

or

```javascript
const eurostatmap = require('eurostat-map')
```

### Standalone

For the latest version, use:

```html
<script src="https://unpkg.com/eurostat-map"></script>
```

For a fixed version, use:

```html
<script src="https://unpkg.com/eurostat-map@X.Y.Z"></script>
```

where X.Y.Z is a [version number](https://www.npmjs.com/package/eurostat-map?activeTab=versions).

## Documentation

For detailed documentation see the **[API reference page](docs/reference.md)**.

You can jump directly to map-type sections from the table of contents in [docs/reference.md](docs/reference.md).

Anything unclear or missing? Feel free to [ask](https://github.com/eurostat/eurostat.js/issues/new)!

## About

|                |                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _contributors_ | [<img src="https://github.com/jgaffuri.png" height="40" />](https://github.com/jgaffuri) [<img src="https://github.com/JoeWDavies.png" height="40" />](https://github.com/JoeWDavies) |
| _version_      | See [npm](https://www.npmjs.com/package/eurostat-map?activeTab=versions)                                                                                                              |
| _status_       | Since 2018                                                                                                                                                                            |
| _license_      | [EUPL 1.2](https://github.com/eurostat/Nuts2json/blob/master/LICENSE)                                                                                                                 |

## Contribute

Feel free to [ask for assistance](https://github.com/eurostat/eurostat.js/issues/new), fork the project or simply star it (it's always a pleasure).

## Copyright

The [Eurostat NUTS dataset](http://ec.europa.eu/eurostat/web/nuts/overview) is copyrighted. There are [specific provisions](https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units) for the usage of this dataset which must be respected. The usage of these data is subject to their acceptance. See the [Eurostat-GISCO website](https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units) for more information.

## Disclaimer

The designations employed and the presentation of material on these maps do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence. Palestine*: This designation shall not be construed as recognition of a State of Palestine and is without prejudice to the individual positions of the Member States on this issue.
