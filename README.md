<div align="center">

# [eurostat-map](https://github.com/eurostat/eurostat-map)

</div>

<div align="center">
  <img src="https://img.shields.io/bundlephobia/min/eurostat-map" alt="npm bundle size">
  <img src="https://img.shields.io/npm/v/eurostat-map" alt="npm">
  <img src="https://img.shields.io/badge/license-EUPL-success" alt="license">
  <a href="http://www.awesomeofficialstatistics.org"><img src="https://awesome.re/mentioned-badge.svg" alt="Mentioned in Awesome Official Statistics"></a>
</div>

<div align="center">
  <em>Customizable thematic maps. See <strong><a href="docs/reference.md">documentation</a></strong>.</em>
</div>

<br>

<div align="center">
<a href="https://eurostat.github.io/eurostat-map/examples/population-density.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/examples.gif" alt="examples" width="600"/> </a>
</div>

<div align="center">
<em>Based on D3 and designed for Eurostat data but compatible with custom geometries and stats.</em>
</div>

---

## Table of Contents

- [eurostat-map](#eurostat-map)
    - [Table of Contents](#table-of-contents)
    - [Examples](#examples)
    - [Installation](#installation)
        - [Node.js](#nodejs)
        - [Standalone](#standalone)
    - [Documentation](#documentation)
    - [Technical details](#technical-details)
    - [About](#about)
    - [Contribute](#contribute)
    - [Copyright](#copyright)
    - [Disclaimer](#disclaimer)

---

## Examples

You can build an interactive statistical map with just a few lines of code:

```javascript
eurostatmap
    .map('choropleth') // Specify the map type
    .title('Population density in Europe') // Add a title
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' }) // Configure dataset
    .legend({ x: 500, y: 180, title: 'Density, people/km²' }) // Add a legend
    .build() // Build the map
```

For a quick tutorial check out this notebook:
https://observablehq.com/@joewdavies/eurostat-map-js

- [Population density](https://eurostat.github.io/eurostat-map/examples/population-density.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-density.html))
- [Population map with proportional circles](https://eurostat.github.io/eurostat-map/examples/prop-circles.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-circles.html))
- [GDP map with custom proportional symbols](https://eurostat.github.io/eurostat-map/examples/prop-symbols.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-symbols.html))
- [Causes of death with proportional pie charts](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-piecharts.html))
- [Population change ](https://eurostat.github.io/eurostat-map/examples/population-change.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-change.html))
- [NUTS typology as a categorical map](https://eurostat.github.io/eurostat-map/examples/categorical.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/categorical.html))
- [Focus on Spain](https://eurostat.github.io/eurostat-map/examples/spain.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/spain.html))
- [20 years of GDP change in Europe](https://eurostat.github.io/eurostat-map/examples/small_multiple.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/small_multiple.html))
- [Unemployment/population relation](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/pop-unemploy-bivariate.html))
- [Farm sizes composition](https://eurostat.github.io/eurostat-map/examples/farm_size.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/farm_size.html))
- [Livestock composition](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/livestock_composition.html))
- [Sparklines: Population in Europe since 2012](https://eurostat.github.io/eurostat-map/examples/sparklines.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/sparklines.html))
- [World map](https://eurostat.github.io/eurostat-map/examples/world.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/world.html))
- [Flow map](https://eurostat.github.io/eurostat-map/examples/flowmap.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/flowmap.html))

## Installation

### Node.js

```npm
npm install eurostatmap
```

then

```javascript
import eurostatmap from 'eurostatmap'
```

or

```javascript
eurostatmap = require('eurostatmap')
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

Code examples:

- For a [choropleth map](docs/reference.md#choropleth-map),
- For a [proportional symbol map](docs/reference.md#proportional-symbol-map),
- For a [proportional pie chart map](docs/reference.md#proportional-pie-chart-map),
- For a [categorical map](docs/reference.md#categorical-map).
- For a [bivariate choropleth map](docs/reference.md#bivariate-choropleth-map).
- For a [stripe composition map](docs/reference.md#stripe-composition-map).
- For a [sparkline map](docs/reference.md#sparkline-map).
- For a [flow map](docs/reference.md#flow-map).

Anything unclear or missing? Feel free to [ask](https://github.com/eurostat/eurostat.js/issues/new) !

## Technical details

Maps based on [NUTS regions](http://ec.europa.eu/eurostat/web/nuts/overview) rely on [Nuts2json API](https://github.com/eurostat/Nuts2json) and [TopoJSON](https://github.com/mbostock/topojson/wiki) format. Statistical data are accessed using [Eurostat STATISTICS API](https://wikis.ec.europa.eu/display/EUROSTATHELP/API+-+Getting+started+with+statistics+API) for [JSON-stat](https://json-stat.org/) data. The data are decoded and queried using [JSON-stat library](https://json-stat.com/). Maps are rendered as SVG maps using [D3.js library](https://d3js.org/).

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
