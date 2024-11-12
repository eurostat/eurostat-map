# [eurostat-map](https://github.com/eurostat/eurostat-map)

![npm bundle size](https://img.shields.io/bundlephobia/min/eurostat-map)
![npm](https://img.shields.io/npm/v/eurostat-map)
![license](https://img.shields.io/badge/license-EUPL-success)

Eurostat-map.js allows developers to quickly create and customise thematic web maps based on [NUTS regions](https://ec.europa.eu/eurostat/web/nuts/background), showing [Eurostat](https://ec.europa.eu/eurostat) data directly retrieved from the [Eurostat database](https://ec.europa.eu/eurostat/data/database), or custom data added manually.

<div>
<a href="https://eurostat.github.io/eurostat-map/examples/population-density.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/ch.png" alt="choropleth" width="400"/> </a>
<a href="https://eurostat.github.io/eurostat-map/examples/prop-circles.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/prop.png"  alt="proportional circles" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/prop-symbols.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/euro.png"  alt="proportional symbols" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/pie.png" alt="pie charts" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/livestock_composition.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/stripe.png" alt="stripes" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/bivar.png"  alt="bivariate choropleth" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/categorical.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/cat.png"  alt="categorical" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/population-dot-density.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/dot.png"  alt="dot density" width="400"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/world.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/world.png"  alt="dot density" width="400" height="70px"/></a>
<a href="https://eurostat.github.io/eurostat-map/examples/sparklines.html" target="_blank"> <img src="https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/previews/sparkline.png"  alt="dot density" width="400" height="70px"/></a>
</div>

## Examples

You can build an interactive statistical map with just a few lines of code:

```javascript
eurostatmap
    .map('ch')
    .title('Population density in Europe')
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
    .legend({ x: 500, y: 180, title: 'Density, people/km²' })
    .build()
```

-   [Population density](https://eurostat.github.io/eurostat-map/examples/population-density.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-density.html))
-   [Population density map with dot pattern](https://eurostat.github.io/eurostat-map/examples/population-dot-density.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-dot-density.html))
-   [Population map with proportional circles](https://eurostat.github.io/eurostat-map/examples/prop-circles.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-circles.html))
-   [GDP map with custom proportional symbols](https://eurostat.github.io/eurostat-map/examples/prop-symbols.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-symbols.html))
-   [Causes of death with proportional pie charts](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-piecharts.html))
-   [Population change ](https://eurostat.github.io/eurostat-map/examples/population-change.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-change.html))
-   [NUTS typology as a categorical map](https://eurostat.github.io/eurostat-map/examples/categorical.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/categorical.html))
-   [Focus on Spain](https://eurostat.github.io/eurostat-map/examples/spain.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/spain.html))
-   [20 years of GDP change in Europe](https://eurostat.github.io/eurostat-map/examples/small_multiple.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/small_multiple.html))
-   [Unemployment/population relation](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/pop-unemploy-bivariate.html))
-   [Farm sizes composition](https://eurostat.github.io/eurostat-map/examples/farm_size.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/farm_size.html))
-   [Livestock composition](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/livestock_composition.html))
-   [Sparklines: Population in Europe since 2012](https://eurostat.github.io/eurostat-map/examples/sparklines.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/sparklines.html))
-   [World map](https://eurostat.github.io/eurostat-map/examples/world.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/world.html))

## Installation

### Node.js

`npm install eurostatmap`

then

```javascript
import eurostatmap from 'eurostatmap'
```

or

```javascript
eurostatmap = require('eurostatmap')
```

### Standalone

-   For the latest version, use `<script src="https://unpkg.com/eurostat-map"></script>` as shown in [the examples](#examples).
-   For a fixed version, use `<script src="https://unpkg.com/eurostat-map@X.Y.Z"></script>`, where _X.Y.Z_ is a [version number](https://www.npmjs.com/package/eurostat-map?activeTab=versions).

## Documentation

For a quick tutorial check out this notebook:
https://observablehq.com/@joewdavies/eurostat-map-js

Or see the **[API reference](docs/reference.md)**:

-   For a [choropleth map](docs/reference.md#choropleth-map),
-   For a [proportional symbol map](docs/reference.md#proportional-symbol-map),
-   For a [proportional pie chart map](docs/reference.md#proportional-pie-chart-map),
-   For a [categorical map](docs/reference.md#categorical-map).
-   For a [bivariate choropleth map](docs/reference.md#bivariate-choropleth-map).
-   For a [stripe composition map](docs/reference.md#stripe-composition-map).
-   For a [sparkline map](docs/reference.md#sparkline-map).

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

## Support and contribution

Feel free to [ask support](https://github.com/eurostat/eurostat.js/issues/new), fork the project or simply star it (it's always a pleasure).

## Copyright

The [Eurostat NUTS dataset](http://ec.europa.eu/eurostat/web/nuts/overview) is copyrighted. There are [specific provisions](https://ec.europa.eu/eurostat/web/gisco/geodata/reference-data/administrative-units-statistical-units) for the usage of this dataset which must be respected. The usage of these data is subject to their acceptance. See the [Eurostat-GISCO website](http://ec.europa.eu/eurostat/web/gisco/geodata/reference-data/administrative-units-statistical-units/nuts) for more information.

## Disclaimer

The designations employed and the presentation of material on these maps do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence. Palestine*: This designation shall not be construed as recognition of a State of Palestine and is without prejudice to the individual positions of the Member States on this issue.
