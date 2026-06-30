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
  D3-based mapping library for Eurostat and custom data - the engine that powers <a href="https://gisco-services.ec.europa.eu/image/" target="_blank"><strong>IMAGE</strong></a>.
</div>

<div align="center">
  <a href="docs/reference.md" target="_blank"><strong>Documentation</strong></a> ·
  <a href="https://eurostat.github.io/eurostat-map/examples/index.html" target="_blank"><strong>Live examples</strong></a> ·
  <a href="https://observablehq.com/collection/@eurostat-ws/eurostatmap-js" target="_blank"><strong>Quickstart notebook</strong></a>
</div>
<hr>

- **Interactive SVG maps** rendered using **D3.js**.
- **TypeScript support** with built-in definition typings.
- **NUTS geometries** fetched dynamically via the **Nuts2json API** (TopoJSON format).
- **Eurostat API integration** using the **JSON-stat** standard.

<hr>
<br>
<div align="center">

  <table>
    <tr>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/choropleth/population-density.html" target="_blank"><img src="examples/img/previews/choropleth/population-density.png" alt="Population density example"  /></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/proportional-symbols/prop-circles.html" target="_blank"><img src="examples/img/previews/proportional/prop-circles.png" alt="Proportional circles example"  /></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/flow/flowmap.html" target="_blank"><img src="examples/img/previews/flow/flowmap.png" alt="Flow map example"  /></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/mushroom/mushroom.html" target="_blank"><img src="examples/img/previews/mushroom/mushroom.png" alt="Mushroom map example"  /></a></td>
    </tr>
    <tr>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/sparklines/sparklines-grid-cartogram.html" target="_blank"><img src="examples/img/previews/sparklines/sparklines-grid-cartogram.png" alt="Sparklines map example"  /></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/bivariate/pop-unemploy-bivariate.html" target="_blank"><img src="examples/img/previews/bivariate/pop-unemploy-bivariate.png" alt="Bivariate map example"  /></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/trivariate/trivariate.html" target="_blank"><img src="examples/img/previews/trivariate/trivariate.png" alt="Trivariate map example"  /></a></td>
        <td><a href="https://eurostat.github.io/eurostat-map/examples/stripe/livestock_composition.html" target="_blank"><img src="examples/img/previews/stripe/livestock_composition.png" alt="Trivariate map example"  /></a></td>
    </tr>
  </table>
</div>

---

## Resources

- [Quick Start](#quick-start)
- [Examples](https://eurostat.github.io/eurostat-map/examples/index.html)
- [Documentation](#documentation)
- [Made with eurostat-map](#made-with-eurostat-map)
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
```

or

```javascript
const eurostatmap = require('eurostat-map')
```

or

```html
<script src="https://unpkg.com/eurostat-map"></script>
```

then

```javascript
const map = eurostatmap
    .map('choropleth')
    .title('Population density in Europe')
    // define statistical dataset
    .stat('population-density', {
        eurostatDatasetCode: 'demo_r_d3dens',
        unitText: 'people/km²',
    })
    // encode dataset into visual variable(s)
    .encoding('fill', { stat: 'population-density', scale: 'quantile', classes: 7 })
    .legend({ position: 'top right', title: 'Density, people/km²' })
    .build()
```

Legend corner placement supports `position: 'top right' | 'top left' | 'bottom right' | 'bottom left'`.
When `header(false)` is used and a title/subtitle is drawn in the main SVG, top-corner legends are automatically shifted down only when they would overlap the title text.

For multivariate maps, you can use data-driven visual variables like so:

```javascript
const map = eurostatmap
    .map('proportionalSymbol')
    .nutsLevel(1)
    .stat('population', {
        eurostatDatasetCode: 'demo_r_pjangrp3',
        filters: { age: 'TOTAL', sex: 'T', unit: 'NR', time: '2023' },
        unitText: 'inhabitants',
    })
    .stat('gdpPerCapita', {
        eurostatDatasetCode: 'nama_10r_3gdp',
        filters: { unit: 'EUR_HAB', time: '2023' },
        unitText: 'EUR/inhabitant',
    })
    .encoding('size', { stat: 'population', scale: 'sqrt', range: [5, 30] })
    .encoding('color', { stat: 'gdpPerCapita', scale: 'quantile', classes: 5 })
    .build()
```

Legacy patterns such as `stat({...})` for single-dataset maps or channel-named datasets (`stat('size', ...)`, `stat('color', ...)`) remain supported for backward compatibility.

Want a guided setup? Try the notebook:
https://observablehq.com/@joewdavies/eurostat-map-js

## Documentation

For detailed documentation on what eurostat-map can do, see the **[documentation page](docs/reference.md)**.

For generated, signature-accurate API docs from TypeScript/JSDoc, see [the API docs](https://eurostat.github.io/eurostat-map/docs/api/index.html).

Anything unclear or missing? Feel free to [ask](https://github.com/eurostat/eurostat.js/issues/new)!

## Made with eurostat-map

Here are some public projects and publications built with eurostat-map:

- [IMAGE](https://gisco-services.ec.europa.eu/image/) - Eurostat's interactive map generator.
- [Regions in Europe 2025](https://ec.europa.eu/eurostat/web/interactive-publications/regions-2025) - interactive publication.
- [Eurostat Regional Yearbook](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Eurostat_regional_yearbook) - interactive publication.
- [Women make up 53% of science & technology ranks](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260529-2)
- [Average work week nearly 36 hours in the EU in 2025](https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20260527-1)
- [Tourism nights booked via platforms hit nearly 1 billion](https://ec.europa.eu/eurostat/en/web/products-eurostat-news/w/ddn-20260401-1)
- [EU rail passengers made 8.7 billion trips in 2024](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260514-1)
- [EU life expectancy increases again and hits 81.5 years](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260313-3)
- [Statistics Explained - Businesses in Manufacturing](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Businesses_in_the_manufacturing_sector#Regional_data:_Manufacturing)

## About

eurostat-map is an open-source JavaScript library for building interactive, publication-ready statistical maps focused on Europe. It combines D3-based SVG rendering with direct support for Eurostat datasets (JSON-stat), NUTS geographies from Nuts2json, and custom data workflows, and includes map types such as choropleth, proportional symbols, cartograms, flow maps, and composition charts. The project is designed for analysts, journalists, and institutions that need reproducible, configurable map visualizations for both exploratory analysis and official communication.

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
