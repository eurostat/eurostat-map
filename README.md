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
  <style>
    .readme-mosaic {
      width: 100%;
      max-width: 810px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .readme-mosaic td {
      padding: 6px;
      width: 33.333%;
    }

    .readme-mosaic-frame {
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 8px;
    }

    .readme-mosaic-frame img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

  </style>
  <table class="readme-mosaic">
    <tr>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/population-density.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/ch_ex.png" alt="Choropleth map example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/prop-circles.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/ps_ex.png" alt="Proportional symbols example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/flowmap.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/flow_ex.png" alt="Flow map example"/></div></a></td>
    </tr>
    <tr>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/pie_ex.png" alt="Pie chart map example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/mushroom.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/mushroom_ex.png" alt="Mushroom map example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/sparklines.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/sparklines_ex.png" alt="Sparklines map example"/></div></a></td>
    </tr>
    <tr>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/categorical.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/ct_ex.png" alt="Categorical map example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/chbi_ex.png" alt="Bivariate map example"/></div></a></td>
      <td><a href="https://eurostat.github.io/eurostat-map/examples/trivariate.html" target="_blank"><div class="readme-mosaic-frame"><img src="docs/img/chtri_ex.png" alt="Trivariate map example"/></div></a></td>
    </tr>
  </table>
</div>

---

## Resources

- [Quick Start](#quick-start)
- [Examples](https://eurostat.github.io/eurostat-map/examples/index.html)
- [Documentation](#documentation)
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
eurostatmap
    .map('choropleth')
    .title('Population density in Europe')
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
    .legend({ x: 500, y: 180, title: 'Density, people/km²' })
    .build()
```

Want a guided setup? Try the notebook:
https://observablehq.com/@joewdavies/eurostat-map-js

## Documentation

For detailed documentation see the **[Documentation page](docs/reference.md)**.

For generated, signature-accurate API docs from TypeScript/JSDoc, see [https://eurostat.github.io/eurostat-map/docs/api/index.html](https://eurostat.github.io/eurostat-map/docs/api/index.html).

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
