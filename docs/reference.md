# API reference

- [API reference](#api-reference)
    - [Map creation](#map-creation)
        - [Map definition](#map-definition)
        - [Map geography](#map-geography)
            - [World maps](#world-maps)
            - [Custom geometries](#custom-geometries)
        - [Statistical data](#statistical-data)
            - [Eurostat database](#eurostat-database)
            - [CSV](#csv)
            - [Custom JS](#custom-js)
    - [Map types](#map-types)
        - [Choropleth map](#choropleth-map)
            - [Choropleth legends](#choropleth-legends)
        - [Proportional symbol map](#proportional-symbol-map)
            - [Proportional symbol legends](#proportional-symbol-legends)
        - [Proportional pie chart map](#proportional-pie-chart-map)
        - [Categorical map](#categorical-map)
        - [Bivariate choropleth map](#bivariate-choropleth-map)
            - [Bivariate choropleth legends](#bivariate-choropleth-legends)
        - [Stripe composition map](#stripe-composition-map)
        - [Sparkline map](#sparkline-map)
        - [Flow map](#flow-map)
        - [Cartograms](#cartograms)
            - [Grid Cartograms](#grid-cartograms)
            - [Dorling Cartograms](#dorling-cartograms)
    - [Map texts](#map-texts)
        - [Map title \& subtitle](#map-title--subtitle)
        - [Labelling](#labelling)
        - [Footnotes](#footnotes)
    - [Map legend](#map-legend)
    - [Scalebar](#scalebar)
    - [Tooltip](#tooltip)
    - [Styling](#styling)
    - [Insets](#insets)
    - [Export](#export)
    - [Miscellaneous](#miscellaneous)
    - [Build and update](#build-and-update)
    - [Version migration](#version-migration)

## Map creation

Create a map with `let map = eurostatmap.map( mapType )`. Set the parameter `mapType` to a value corresponding with the desired map type:

- `"choropleth"` for a [choropleth map](#choropleth-map),
- `"proportionalSymbol"` for a [proportional symbol map](#proportional-symbol-map),
- `"pieChart"` for a [proportional pie chart map](#proportional-pie-chart-map),
- `"categorical"` for a [categorical map](#categorical-map).
- `"bivariateChoropleth"` for a [bivariate choropleth map](#bivariate-choropleth-map).
- `"stripeComposition"` for a [stripe composition map](#stripe-composition-map).
- `"sparkline"` for a [spark line map](#sparkline-map).

The `map` can then be customised with the methods listed in the tables below. Most of the map methods follow the pattern _map_.**myMethod**([*value*]): If a _value_ is specified, the method sets the parameter value and returns the _map_ object itself. If no _value_ is specified, the method returns the current value of the parameter.

It is also possible to specify the map parameters as an object: `let map = eurostatmap.map( mapType, { param1: v1, param2: v2} );`. This is equivalent to: `let map = eurostatmap.map( mapType ).param1(v1).param2(v2);`

### Map definition

Specify the map SVG element.

| Method                      | Type   | Default value | Description                                                                                             |
| --------------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------- |
| _map_.**svgId**([*value*])  | String | _"map"_       | The id of the SVG element of the HTML page where to draw the map.                                       |
| _map_.**width**([*value*])  | int    | _800_         | The width of the map, in pixel.                                                                         |
| _map_.**height**([*value*]) | int    | _auto_        | The height of the map, in pixel. If not specified, the height is set automatically as 85% of the width. |

### Map geography

Specify the NUTS geometries and the geographical extent of the map.

| Method                          | Type                  | Default value | Description                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**nutsLevel**([*value*])  | int/string            | _3_           | The nuts level to show on the map, from 0 (national level) to 3 (more local level). Note that not all NUTS levels are always available for Eurostat databases. When using custom data sources and mixing different NUTS levels, set this option to "mixed" to show the different levels at once.                                          |
| _map_.**nutsYear**([*value*])   | int                   | _2016_        | The version of the NUTS dataset to use. Possible values are given in [Nuts2json](https://github.com/eurostat/Nuts2json/#api). Note that the default value will be adjusted in the future depending on the [NUTS legislation in force](https://ec.europa.eu/eurostat/web/nuts/legislation).                                                |
| _map_.**geo**([*value*])        | String                | _"EUR"_       | The map geographical territory, by default the entire European territory _"EUR"_. For world maps use "WORLD" and set proj to 54030. Note that world templates are currently only available for choropleth maps. Other possible values are given in [Nuts2json](https://github.com/eurostat/Nuts2json/#overseas-territories---map-insets). |
| _map_.**proj**([*value*])       | String                | _"3035"_      | The map projection EPSG code. For world maps: use 54030. Possible values are given in [Nuts2json](https://github.com/eurostat/Nuts2json/#api). Note that these values depend on the geographical territory.                                                                                                                               |
| _map_.**scale**([*value*])      | String                | _"20M"_       | The simplification level of the map, among _"03M"_, _"10M"_, _"20M"_, _"60M"_ (for Europe). The most simplified version is _"60M"_. The level _"01M"_ is also available for some geographical territories: For more information on possible values by geographical territory, see [Nuts2json](https://github.com/eurostat/Nuts2json/).    |
| _map_.**position**([*value*])   | Object {x,y,z}        | _auto_        | The geographical coordinates of the position where to center the map view. These coordinates are expected to be expressed in the map projection. If not specified, a position is computed automatically.                                                                                                                                  |
| _map_.**zoomExtent**([*value*]) | Array                 | _undefined_   | The zoom extent. The first value within [0,1] defines the maximum zoom out factor - the second value within [1,infinity] defines the maximum zoom in factor. Set to _[1,1]_ to forbid zooming and allow panning. Set to _null_ to forbid both.                                                                                            |
| _map_.**maxBounds**([*value*])  | {xMin,yMin,xMax,yMax} | _undefined_   | The maximum bounds that the user can pan/zoom within.                                                                                                                                                                                                                                                                                     |

#### World maps

It is also possible to build thematic world maps using eurostat-map. Simply pass "WORLD" to the map.geo() method. See [this example](https://github.com/eurostat/eurostat-map/blob/master/examples/world.html) for how to configure a world map.

| Method                                  | Type          | Default value       | Description                                                            |
| --------------------------------------- | ------------- | ------------------- | ---------------------------------------------------------------------- |
| _map_.**projectionFunction**([*value*]) | d3 projection | _d3.geoRobninson()_ | Here you can define your own custom projection function for world maps |

#### Custom geometries

If you wish to make maps using your own custom geometries instead of NUTS regions, then you can specify them using:

```javascript
.geometries([
    {
        id: 'regions',
        class: 'regions',
        statisticalRegions: true, // this is how eurostat-map knows what regions the statistical values belong to.
        features: myRegionsGeoJSON.features, // stats are linked via feature.properties.id
        onEach: (elements) => {
            // Add any D3 custom styling or behavior here
        },
    },
    {
        id: 'borders',
        features: myBordersGeoJSON.features,
        class: 'borders',
    },
])

```

| Method                          | Type     | Default value | Description                                                            |
| ------------------------------- | -------- | ------------- | ---------------------------------------------------------------------- |
| _map_.**geometries**([*value*]) | Object[] | NUTS regions  | Here you can define your own custom geometries to be used in your maps |

You can find a [live example here](https://eurostat.github.io/eurostat-map/examples/custom-geometries.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/custom-geometries.html))

### Statistical data

The map statistical data can be accessed with the _map_.**statData**() method, which returns an object with the following methods:

| Method                   | Description                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **get**([*nutsId*])      | Return the stat value {value,status} from a nuts id. If no argument is specified, returns the entire index.                                                                  |
| **getValue**([*nutsId*]) | Return the stat value from a nuts id.                                                                                                                                        |
| **set**([*nutsId,stat*]) | Set a stat value from a nuts id. The new statistical data format can be either {value:34.324,status:"e"} or just the value only.                                             |
| **setData**([*index*])   | Set statistical data, already indexed by nutsId. The index has a structure like: { "PT":0.2, "LU":0.6, ...}, or with status: { "PT": {value:0.2, status:"e"}, "LU":0.6, ...} |
| **getArray**()           | Return all stat values as an array. This can be used to classify the values.                                                                                                 |
| **getUniqueValues**()    | Return stat unique values. This can be used for categorical maps.                                                                                                            |
| **getMin**()             | Get minimum value.                                                                                                                                                           |
| **getMax**()             | Get maximum value.                                                                                                                                                           |
| **unitText**([*value*])  | The text of the unit of measurement, to show in the tooltip. _undefined_ by default.                                                                                         |

The map statistical data source can be accessed with the _map_.**stat**([*value*]) method. Several types of data sources are supported (see sections below).

#### Eurostat database

Specify statistical data to be retrieved on-the-fly from [Eurostat database](https://ec.europa.eu/eurostat/web/main/data/database). The query parameters can be retrieved from [this page](https://ec.europa.eu/eurostat/web/json-and-unicode-web-services/getting-started/generate-new-query).

Example:

```javascript
map = eurostatmap.map(...);
map.stat( {
	eurostatDatasetCode: "lfst_r_lfu3rt",
	filters:{
		age: "Y20-64",
		sex: "T",
		unit: "PC",
		time: "2019"
	}
});
```

| Parameter               | Type   | Default value            | Description                                                                                                                                                                                                                                                   |
| ----------------------- | ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **eurostatDatasetCode** | String | _"demo_r_d3dens"_        | The Eurostat database code of the statistical variable. See [here](https://ec.europa.eu/eurostat/data/database) to find them.                                                                                                                                 |
| **filters**             | Object | _{ lastTimePeriod : 1 }_ | The Eurostat dimension codes to filter/select the chosen statistical variable. See [here](https://ec.europa.eu/eurostat/data/database) or [here](https://ec.europa.eu/eurostat/web/json-and-unicode-web-services/getting-started/query-builder) to find them. |
| **precision**           | int    | _2_                      | The precision of the statistical variable to retrieve (number of decimal places).                                                                                                                                                                             |

#### CSV

Specify statistical data to be retrieved from CSV data.

Example:

```javascript
map = eurostatmap.map(...);
map.stat( {
	csvURL: "https://raw.githubusercontent.com/eurostat/eurostat-map/master/examples/urb_rur_typo.csv",
	geoCol: "NUTS_ID_2013",
	valueCol: "urban_rural"
});
```

| Parameter    | Type   | Default value | Description                             |
| ------------ | ------ | ------------- | --------------------------------------- |
| **csvURL**   | String | _undefined_   | The CSV file URL.                       |
| **geoCol**   | String | _"geo"_       | The column with the NUTS ids.           |
| **valueCol** | String | _"value"_     | The column with the statistical values. |

#### Custom JS

Specify statistical data region by region, from JavaScript code, or any kind of JSON data source.

Example:

```javascript
map = eurostatmap.map(...);

//specify values region by region
map.statData().set("LU",500).set("DE",400).set("FR",100).set("IT",600)

//or in one time. Note that the 'status' can be specified but is not mandatory.
map.statData().setData({
	"FR": 10,
	"DE": {value:7,status:"e"},
	"UK": 12,
})
```

## Map types

There are many different types of thematic maps that you can create using eurostat-map. Here you will find documentation on how to build them.

### Choropleth map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/ch_ex.png)](https://eurostat.github.io/eurostat-map/examples/population-density.html)
[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/pp_ex.png)](https://eurostat.github.io/eurostat-map/examples/population-dot-density.html)
[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/dv_ex.png)](https://eurostat.github.io/eurostat-map/examples/population-change.html)

A [choropleth map](https://en.wikipedia.org/wiki/Choropleth_map) shows areas **colored or patterned** in proportion to a statistical variable. These maps should be used to show _intensive_ statistical variables such as proportions, ratios, densities, rates of change, percentages, etc.

Here is [an example](https://eurostat.github.io/eurostat-map/examples/population-density.html) with color value (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-density.html)), [another](https://eurostat.github.io/eurostat-map/examples/population-change.html) with a diverging color scheme (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-change.html)), and [a last one](https://eurostat.github.io/eurostat-map/examples/population-dot-density.html) with a texture pattern (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/population-dot-density.html)).

Example:

```javascript
eurostatmap
    .map('choropleth')
    .title('Population in Europe')
    .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'inhab./km²' })
    .classifMethod('threshold')
    .threshold([50, 75, 100, 150, 300, 850])
    .tooltipShowFlags(false)
    .legend({ noData: false, decimals: 0, x: 15, y: 160 })
    .build()
```

| Method                                    | Type      | Default value          | Description                                                                                                                                                        |
| ----------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _map_.**numberOfClasses**([*value*])      | int       | _7_                    | The number of classes. When _classificationMethod == "threshold"_, this parameter is inferred from the number of breaks specified.                                 |
| _map_.**classificationMethod**([*value*]) | String    | _"quantile"_           | The classification method. Possible values are _"quantile"_, _"equinter"_ for equal intervals, and _"threshold"_ for user defined threshol (see threshold method). |
| _map_.**colors**([*value*])               | Array     | _null_                 | The colours to use for the classes. if unspecified, default colorFun is used.                                                                                      |
| _map_.**thresholds**([*value*])           | Array     | _[0]_                  | If _classifMethod = "threshold"_, the breaks of the classification.                                                                                                |
| _map_.**makeClassifNice**([*value*])      | _boolean_ | true                   | Make nice break values. Works only for _classifMethod = "equinter"_.                                                                                               |
| _map_.**colorFunction**([*value*])        | Function  | _d3.interpolateYlOrBr_ | The color function, as defined in [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic/)                                                                  |
| _map_.**classToFillStyle**([*value*])     | Function  | See description        | A function returning a fill style for each class number. The default values is the function returned by `eurostatmap.getColorLegend(colorFun())`.                  |
| _map_.**noDataFillStyle**([*value*])      | String    | _"lightgray"_          | The fill style to be used for regions where no data is available.                                                                                                  |

#### Choropleth legends

In addition to [the default legend parameters](#map-legend), choropleth maps have the following specific legend parameters:

| Parameter          | Type                     | Default value                     | Description                                                                   |
| ------------------ | ------------------------ | --------------------------------- | ----------------------------------------------------------------------------- |
| **ascending**      | String                   | _true_                            | The legend cells order. Set to false to invert.                               |
| **shapeWidth**     | int                      | _15_                              | The cell width.                                                               |
| **shapeHeight**    | int                      | _13_                              | The cell heigth.                                                              |
| **sepLineLength**  | int                      | _17_                              | The separation line length.                                                   |
| **decimals**       | String                   | _0 _                              | The number of decimal places for the legend labels.                           |
| **labelType**      | 'ranges' or 'thresholds' | _thresholds_                      | The type of legend labels to be generated.                                    |
| **labelOffset**    | int                      | _3_                               | The distance between the legend box elements to the corresponding text label. |
| **labelFormatter** | Function                 | _d3.format("." + decimals + "f")_ | A function used to format the values of the legend labels.                    |
| **labels**         | string[]                 | _null_                            | Manually define the labels to be used in the legend as an array               |
| **noData**         | boolean                  | _true_                            | Show 'no data' style.                                                         |
| **noDataText**     | Text                     | _"No data"_                       | 'No data' text label.                                                         |

### Proportional symbol map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/pc_ex.png)](https://eurostat.github.io/eurostat-map/examples/prop-circles.html)
[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/ps_ex.png)](https://eurostat.github.io/eurostat-map/examples/prop-circles.html)

A proportional symbol map shows symbols (typically circles) **sized** in proportion to a statistical variable. These maps should be used to show statistical _extensive_ variables such as quantities, populations, numbers, etc. Here is [an example](https://eurostat.github.io/eurostat-map/examples/prop-circles.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-circles.html)).

Example:

```javascript
eurostatmap
    .map('proportionalSymbol')
    .nutsLevel(1)
    .stat({
        eurostatDatasetCode: 'demo_r_pjangrp3',
        filters: { age: 'TOTAL', sex: 'T', unit: 'NR', time: 2016 },
        unitText: 'inhabitants',
    })
    .psMaxSize(25)
    .psFill('red')
    .build()
```

Along with data-driven sizing, it is possible to colour the symbols according to a statistical variable as well. This is achieved by adding the "size" and "color" strings to their corresponding stat methods. For example:

```javascript
    //GDP per inhabitant (colour of symbol)
    .stat("color", { eurostatDatasetCode: "nama_10r_3gdp", unitText: "EUR/inhabitant", filters: { unit: "EUR_HAB", time: "2018" } })
    // Total GDP (size of symbol)
    .stat("size", { eurostatDatasetCode: "nama_10r_3gdp", unitText: "Million EUR", filters: { unit: "MIO_EUR", time: "2018" } })
```

It is also possible to prevent overlapping via the 'dorling' method:

```javascript
   .dorling(true)
```

Please be aware that by using this method you will essentially be turning the map into a Cartogram. If deformation is high, please consider hiding the background elements/basemap.

| Method                                      | Type             | Default value        | Description                                                                                                                                                                              |
| ------------------------------------------- | ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**psShape**([*value*])                | string           | _circle_             | The shape of the symbol. Accepted values: circle, spike, bar, square, star, cross, diamond, triangle, wye or custom                                                                      |
| _map_.**psCustomShape**([*value*])          | Object           | null                 | A custom symbol to be used with d3.symbol when psShape is set to "custom". See http://using-d3js.com/05_10_symbols.html#h_66iIQ5sJIT                                                     |
| _map_.**psCustomSVG**([*value*])            | Template Literal | null                 | Use this method for defining a custom SVG, which will be used as the proportional symbol. E.g. map.psCustomSVG(`<svg width="100" height="100"><rect width="100" height="100" /></svg>`). |
| _map_.**psOffset**([*value*])               | Object           | {x:0,y:0}            | Defines the offsets to apply to the symbols on the map. Only applicable to symbols where custom svgs are specified ( through psCustomSVG)                                                |
| _map_.**psMaxSize**([*value*])              | number           | _30_                 | The maximum size of the symbol. For shapes and vertical bars, this value is in pixels, but for psCustomSVG() it represents the scale factor of the transform applied to it.              |
| _map_.**psMinSize**([*value*])              | number           | _0.8_                | The minimum size / scale of the symbol.                                                                                                                                                  |
| _map_.**psBarWidth**([*value*])             | number           | _5_                  | Width in pixels of the vertical bars. Only to be used with a psShape of type "bar"                                                                                                       |
| _map_.**psFill**([*value*])                 | String           | _"#B45F04"_          | The fill color or pattern of the symbol, for when a colour scheme is not defined.                                                                                                        |
| _map_.**psFillOpacity**([*value*])          | number           | _0.7_                | The opacity of the symbol, from 0 to 1.                                                                                                                                                  |
| _map_.**psStroke**([*value*])               | String           | _"#fff"_             | The stroke color of the symbol.                                                                                                                                                          |
| _map_.**psStrokeWidth**([*value*])          | number           | _0.3_                | The width of the stroke.                                                                                                                                                                 |
| _map_.**psClasses**([*value*])              | number           | _5_                  | The number of classes to use when applying data-driven colour for the symbols. Similar to numberOfClasses() for choropleth maps.                                                         |
| _map_.**psColorFun**([*value*])             | function         | _d3.interpolateOrRd_ | The color function, as defined in [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic/)                                                                                        |
| _map_.**psSizeScale**([*value*])            | string           | 'sqrt' or 'linear'   | The D3 scale function used to define the sizes of the symbols. The following methods are then called internally: psSizeScale().domain(sizeDomain).range([psMinSize, psMaxSize])          |
| _map_.**psClassificationMethod**([*value*]) | String           | _"quantile"_         | The classification method. Possible values are _"quantile"_, _"equinter"_ for equal intervals, and _"threshold"_ for user defined threshold (see threshold method).                      |
| _map_.**psThreshold**([*value*])            | Array            | _[0]_                | If _psClassificationMethod = "threshold"_, the breaks of the classification.                                                                                                             |
| _map_.**psColours**([*value*])              | Array            | null                 | The colours to be using data-driven colour. The number of colours specified in the array should match the number of classes (specified using psClasses())                                |
| _map_.**noDataFillStyle**([*value*])        | String           | _"lightgray"_        | The fill style to be used for regions where no data is available.                                                                                                                        |

#### Proportional symbol legends

In addition to [the default legend parameters](#map-legend), proportional symbol maps have the following specific legend parameters:
As proportional symbol maps allow for two visual variables (size and colour), a legend configuration object can be specified for each variable (sizeLegend and colorLegend).

| Parameter               | Type    | Default value | Description                                                                                     |
| ----------------------- | ------- | ------------- | ----------------------------------------------------------------------------------------------- |
| _map_.**ascending**     | Boolean | _false_       | The order of the legend elements. Set to true to invert.                                        |
| _map_.**legendSpacing** | Number  | _35_          | Spacing between the color & size legends (if applicable)                                        |
| _map_.**labelFontSize** | Number  | _12_          | The font size of the legend labels                                                              |
| _map_.**sizeLegend**    | Object  | see below     | The configuration object of the legend which illustrates the values of different symbol sizes   |
| _map_.**colorLegend**   | Object  | see below     | The configuration object of the legend which illustrates the values of different symbol colours |

**sizeLegend**

The following parameters are properties of the sizeLegend object:

| Parameter          | Type     | Default value                     | Description                                                                                   |
| ------------------ | -------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| **title**          | String   | _null_                            | Title of the size legend                                                                      |
| **titlePadding**   | Number   | _10_                              | Padding between the legend title and legend body                                              |
| **values**         | Number   | _undefined_                       | Manually set the raw data values to be used in the legend                                     |
| **cellNb**         | Number   | _4_                               | Number of symbols to be shown in the legend (when values are not set manually)                |
| **shapePadding**   | Number   | _10_                              | The padding between consecutive legend shape elements                                         |
| **shapeOffset**    | Object   | _{x:0, y:0}_                      | The offset applied to the shape elements in the legend. Applicable for use with psCustomSVG() |
| **shapeFill**      | String   | _white_                           | The colour of the symbols in the size legend. If unspecified, the colour of psFill() is used. |
| **labelOffset**    | Number   | _25_                              | The distance between the legend box elements to the corresponding text label.                 |
| **decimals**       | Number   | _0_                               | The number of decimals for each label.                                                        |
| **labelFormatter** | Function | _d3.format("." + decimals + "f")_ | A function used to format the values of the legend labels.                                    |
| **noData**         | Boolean  | _false_                           | Show a 'no data' legend item in the size legend.                                              |
| **noDataText**     | String   | _'No data'_                       | Text shown in the 'no data' legend item in the size legend.                                   |

**colorLegend**

The following parameters are properties of the colorLegend object:

| Parameter              | Type     | Default value                     | Description                                                                   |
| ---------------------- | -------- | --------------------------------- | ----------------------------------------------------------------------------- |
| **title**              | String   | _null_                            | Title of the size legend                                                      |
| **titlePadding**       | Number   | _10_                              | Padding between the legend title and legend body                              |
| **marginTop**          | Number   | _35_                              | Margin top in pixels. Distance between size and color legends                 |
| **shapeWidth**         | Number   | _13_                              | The width of the legend box elements                                          |
| **shapeHeight**        | Number   | _13_                              | The height of the legend box elements                                         |
| **shapePadding**       | Number   | _10_                              | The padding between consecutive legend shape elements                         |
| **shapePadding**       | Number   | _10_                              | The padding between consecutive legend shape elements                         |
| **labelOffset**        | Number   | _25_                              | The distance between the legend box elements to the corresponding text label. |
| **decimals**           | Number   | _0_                               | The number of decimals for each label.                                        |
| **labelFormatter**     | Function | _d3.format("." + decimals + "f")_ | A function used to format the values of the legend labels.                    |
| **noData**             | Boolean  | _true_                            | Show a legend element that represents "no data" values.                       |
| **noDataText**         | String   | _No data_                         | No data element label text.                                                   |
| **sepLineLength**      | Number   | _17_                              | The length of the separation line between classes.                            |
| **sepLineStroke**      | Number   | _black_                           | The colour of the separation line between classes.                            |
| **sepLineStrokeWidth** | Number   | _1_                               | The width of the separation line between classes.                             |

### Proportional pie chart map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/pie_ex.png)](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html)

A proportional pie chart map shows pie charts **sized** in proportion to a statistical variable. The slices of the pie chart are made up of the different categories of that statistical variable. Here is [an example](https://eurostat.github.io/eurostat-map/examples/prop-piecharts.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/prop-piecharts.html)).

Example:

```javascript
//population composition by age
eurostatmap
    .map('pieChart')
    .nutsLevel(1)
    .stat('Y_LT15', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y_LT15', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .stat('Y15-64', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y15-64', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .stat('Y_GE65', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y_GE65', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .catLabels({ Y_LT15: '< 15', 'Y15-64': '15 to 64', Y_GE65: '> 65' })
    .catColors({ Y_LT15: '#33a02c', 'Y15-64': '#cab2d6', Y_GE65: '#ff7f00' })
    .legend({ x: 550, y: 200, sizeLegend: { title: 'Total Population' }, colorLegend: { title: 'Population by Age' } })
```

Or simpler:

```javascript
//population composition by age
eurostatmap
    .map('pieChart')
    .nutsLevel(3)
    .nutsYear(2016)
    .stripeWidth(10)
    .stripeOrientation(45)
    .statPie(
        { eurostatDatasetCode: 'demo_r_pjanaggr3', filters: { sex: 'T', unit: 'NR', time: '2019' }, unitText: 'people' },
        'age', //parameter that the categories belong to
        ['Y_LT15', 'Y15-64', 'Y_GE65'], //category codes
        ['< 15', '15 to 64', '> 65'], //labels
        ['#33a02c', '#cab2d6', '#ff7f00'] //colours
    )
    .legend({ x: 550, y: 200, sizeLegend: { title: 'Total Population' }, colorLegend: { title: 'Population by Age' } })
```

If the sum of the chosen categories do not represent the complete total for that variable, then an optional code can be included as the last parameter passed to the statPie() method. For example, when making a proportional pie chart map for different causes of death, the chosen categories "Respiratory", "Cancer", "Circulatory" do not represent all causes of death. In this case, the code for "all causes of death" is specified ("A-R_V-Y"). The shares of each categories are then calculated according to this total and not just the total of the specified categories. The remaining share is then given the label "other", which can be changed using the pieOtherText() method and the colour of its pie slices can be changed using the pieOtherColor() method.

```javascript
         .statPie(
            { eurostatDatasetCode: "hlth_cd_asdr2", filters: { sex: "T", time: "2016", age: "TOTAL", unit: "RT" }, unitText: "death rate per 100 000" },
            "icd10", //parameter that the categories belong to
            ["J", "C", "I"], //category codes
            ["Respiratory", "Cancer", "Circulatory"], //category labels
            ["orange", "#A4CDF8", "#2E7AF9", "blue"], //colours
            "A-R_V-Y" //code for the total (all causes of death)
          )
```

| Method                                    | Type    | Default value | Description                                                                                                                                                                 |
| ----------------------------------------- | ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**pieMaxRadius**([*value*])         | Number  | _15_          | The maximum radius of the pie chart.                                                                                                                                        |
| _map_.**pieMinRadius**([*value*])         | Number  | _5_           | The minimum radius of the pie chart.                                                                                                                                        |
| _map_.**catColors**([*value*])            | object  | _auto_        | The colors of the slices, indexed by category code. If not specified, different colors are proposed.                                                                        |
| _map_.**catLabels**([*value*])            | object  | _auto_        | The colors of the slices, indexed by category code.                                                                                                                         |
| _map_.**showOnlyWhenComplete**([*value*]) | boolean | _false_       | Draw a region only when data is available for all categories. If one is missing, the region is considered as with 'no data'. If not, the value of missing data is set to 0. |
| _map_.**noDataFillStyle**([*value*])      | string  | _"darkgray"_  | The fill style to be used for regions where no data is available.                                                                                                           |
| _map_.**pieChartInnerRadius**([*value*])  | number  | _0_           | Inner radius of the pie charts. Increase this value to turn the pie charts into donut charts.                                                                               |
| _map_.**pieStrokeFill**([*value*])        | string  | _white_       | The colour of the pie chart stroke.                                                                                                                                         |
| _map_.**pieStrokeWidth**([*value*])       | number  | 0.3           | The width of the pie chart stroke.                                                                                                                                          |
| _map_.**pieOtherText**([*value*])         | string  | _Other_       | The colour of the "other" segments of the pie charts (only applicable when the total is calculated using a separate category code, specified in the statPie method)         |
| _map_.**pieOtherColor**([*value*])        | string  | _"#FFCC80"_   | The colour of the "other" segments of the pie charts (only applicable when the total is calculated using a separate category code, specified in the statPie method)         |

In addition to [the default legend parameters](#map-legend), proportional pie chart maps have the following specific legend parameters:

| Method                             | Type   | Default value | Description                                                                                   |
| ---------------------------------- | ------ | ------------- | --------------------------------------------------------------------------------------------- |
| _map_.**labelFontSize**([*value*]) | int    | _12_          | Font size of the legend label.                                                                |
| _map_.**legendSpacing**            | Number | _35_          | Spacing between the color & size legends (if applicable).                                     |
| _map_.**sizeLegend**               | Object | see below     | The configuration object of the legend which illustrates the values of different pie sizes.   |
| _map_.**colorLegend**              | Object | see below     | The configuration object of the legend which illustrates the values of different pie colours. |

**sizeLegend**

The following parameters are properties of the **sizeLegend** object:

| Parameter        | Type   | Default value             | Description                                                                                                                    |
| ---------------- | ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **title**        | String | _null_                    | Title of the size legend.                                                                                                      |
| **titlePadding** | Number | _10_                      | Padding between the legend title and legend body.                                                                              |
| **values**       | Array  | auto (max and min radius) | The values used to size the pie charts in the legend. If unspecified, the highest and lowest values shown on the map are used. |

**colorLegend**

The following parameters are properties of the **colorLegend** object:

| Parameter                   | Type    | Default value | Description                                                               |
| --------------------------- | ------- | ------------- | ------------------------------------------------------------------------- |
| **title**                   | String  | _null_        | Title of the size legend.                                                 |
| **titlePadding**            | Number  | _10_          | Padding between the legend title and legend body.                         |
| **shapeWidth**([*value*])   | number  | _13_          | Width of the legend box elements.                                         |
| **shapeHeight**([*value*])  | number  | _15_          | Height of the legend box elements.                                        |
| **shapePadding**([*value*]) | number  | _5_           | Distance between consecutive legend box elements.                         |
| **labelOffset**([*value*])  | number  | _5_           | Distance between the legend box elements to the corresponding text label. |
| **noData**([*value*])       | boolean | _true_        | Show/hide 'no data' legend box element.                                   |
| **noDataText**([*value*])   | string  | _"No data"_   | 'No data' label text.                                                     |

### Categorical map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/ct_ex.png)](https://eurostat.github.io/eurostat-map/examples/categorical.html)

A categorical map shows areas according to categories (or discrete values). Here is [an example](https://eurostat.github.io/eurostat-map/examples/categorical.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/categorical.html)).

Example:

```javascript
eurostatmap
    .map('categorical')
    .nutsYear(2013)
    .nutsLevel(3)
    .stat({
        csvURL: 'https://raw.githubusercontent.com/eurostat/eurostat-map/dev/examples/urb_rur_typo.csv',
        geoCol: 'NUTS_ID_2013',
        valueCol: 'urban_rural',
    })
    .classToFillStyle({ urb: '#fdb462', int: '#ffffb3', rur: '#ccebc5' })
    .classToText({ urb: 'Urban', int: 'Intermediate', rur: 'Rural' })
    .legend({ x: 10, y: 170, order: ['urb', 'int', 'rur'] })
    .build()
```

| Method                                | Type   | Default value | Description                                                                                               |
| ------------------------------------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| _map_.**classToFillStyle**([*value*]) | Object | _auto_        | An object giving the fill style depending on the class code. If not specify, use default colors.          |
| _map_.**classToText**([*value*])      | Object | _auto_        | An object giving the legend label text depending on the class code. If not specified, use the class code. |
| _map_.**noDataFillStyle**([*value*])  | String | _"lightgray"_ | The fill style to be used for regions where no data is available.                                         |

In addition to [the default legend parameters](#map-legend), categorical maps have the following specific legend parameters:

| Parameter         | Type    | Default value | Description                                                                                                                                           |
| ----------------- | ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **shapeWidth**    | int     | _15_          | The cell width.                                                                                                                                       |
| **shapeHeight**   | int     | _13_          | The cell heigth.                                                                                                                                      |
| **shapePadding**  | number  | _5_           | The distance between consecutive legend elements                                                                                                      |
| **labelFontSize** | int     | _13_          | The label font size.                                                                                                                                  |
| **labelOffset**   | int     | _5_           | The distance between the legend box elements to the corresponding text label.                                                                         |
| **noData**        | boolean | _true_        | Show 'no data' style.                                                                                                                                 |
| **noDataText**    | Text    | _"No data"_   | 'No data' text label.                                                                                                                                 |
| **order**         | array   | _"undefined"_ | The order in which the legend classes should be drawn. E.g. ['urb','int','rur']. If left undefined, eurostatmap will order the classes automatically. |

### Bivariate choropleth map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/chbi_ex.png)](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html)

A bivariate choropleth map is a choropleth map showing the combination of two statistical variables. It shows how the correlation between these variables varies across space. Here is [an example](https://eurostat.github.io/eurostat-map/examples/pop-unemploy-bivariate.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/pop-unemploy-bivariate.html)).

Example:

```javascript
eurostatmap
    .map('bivariateChoropleth')
    .nutsLevel(2)
    .nutsYear(2016)
    .stat('v1', { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'inh./km²' })
    .stat('v2', {
        eurostatDatasetCode: 'lfst_r_lfu3rt',
        filters: { age: 'Y20-64', sex: 'T', unit: 'PC', time: 2017 },
        unitText: '%',
    })
    .numberOfClasses(4)
    .build()
```

| Method                                | Type     | Default value | Description                                                                                                      |
| ------------------------------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| _map_.**numberOfClasses**([*value*])  | int      | _3_           | The number of classes for the classification. The same value is used for both variables.                         |
| _map_.**startColor**([*value*])       | color    | _"#e8e8e8"_   | The color for lowest values of both variables.                                                                   |
| _map_.**color1**([*value*])           | color    | _"#73ae80"_   | The color for the highest values of variable 1, and lowest of variable 2.                                        |
| _map_.**color2**([*value*])           | color    | _"#6c83b5"_   | The color for the highest values of variable 2, and lowest of variable 1.                                        |
| _map_.**endColor**([*value*])         | color    | _"#2a5a5b"_   | The color for highest values of both variables.                                                                  |
| _map_.**classifier1**([*value*])      | Function | _auto_        | A function which returns a class number from a stat value. This allows you to set the class thresholds manually. |
| _map_.**classifier2**([*value*])      | Function | _auto_        | A function which returns a class number from a stat value. This allows you to set the class thresholds manually. |
| _map_.**classToFillStyle**([*value*]) | Function | _auto_        | A function returning the colors for each pair of classes i,j.                                                    |
| _map_.**noDataFillStyle**([*value*])  | color    | _"lightgray"_ | The fill style to be used for regions where no data is available.                                                |

#### Bivariate choropleth legends

In addition to [the default legend parameters](#map-legend), bivariate choropleth maps have the following specific legend parameters:

| Parameter             | Type     | Default value    | Description                                                                      |
| --------------------- | -------- | ---------------- | -------------------------------------------------------------------------------- |
| **squareSize**        | number   | _50_             | The size, in pixel, of the legend square.                                        |
| **rotation**          | number   | _0_              | The rotation to apply to the main legend. Recommended values are either 0 or -45 |
| **label1**            | string   | _"Variable 1"_   | The text for the label of variable 1.                                            |
| **label2**            | string   | _"Variable 2"_   | The text for the label of variable 1.                                            |
| **breaks1**           | string[] | _undefined_      | An array of strings shown as axis labels for variable 1                          |
| **breaks2**           | string[] | _undefined_      | An array of strings shown as axis labels for variable 2                          |
| **labelFontSize**     | int      | _12_             | The font size of the legend label.                                               |
| **noData**            | boolean  | _true_           | Show/hide 'no data' style in the legend.                                         |
| **noDataShapeSize**   | number   | _15_             | The size, in pixel, of the 'No data' legend shape.                               |
| **noDataText**        | Text     | _"No data"_      | 'No data' text label.                                                            |
| **noDataYOffset**     | Text     | 0                | Add distance between the main legend and the 'no data' item in pixels            |
| **yAxisLabelsOffset** | Object   | _{ x: 0, y: 0 }_ | Offset the axis labels that correspond with breaks1                              |
| **xAxisLabelsOffset** | Object   | _{ x: 0, y: 0 }_ | Offset the axis labels that correspond with breaks2                              |

### Stripe composition map

[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/comp1.png)](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html)
[![Example](https://raw.githubusercontent.com/eurostat/eurostat-map/master/docs/img/comp2.png)](https://eurostat.github.io/eurostat-map/examples/farm_size.html)

A stripe composition map is a choropleth map showing the composition of a statistical variable using a pattern of stripes of different colors and widths. The color of a stripe corresponds to its category, and its width is proportional to the share of this category in the total. A stripe composition map shows how proportions vary across space.

Here is [an example](https://eurostat.github.io/eurostat-map/examples/livestock_composition.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/livestock_composition.html)), and [another one](https://eurostat.github.io/eurostat-map/examples/farm_size.html) (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/farm_size.html))

Example:

```javascript
//population composition by age
eurostatmap
    .map('stripeComposition')
    .nutsLevel(3)
    .nutsYear(2016)
    .stripeWidth(10)
    .stripeOrientation(45)
    .stat('Y_LT15', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y_LT15', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .stat('Y15-64', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y15-64', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .stat('Y_GE65', {
        eurostatDatasetCode: 'demo_r_pjanaggr3',
        filters: { age: 'Y_GE65', sex: 'T', unit: 'NR', time: '2019' },
        unitText: 'people',
    })
    .catLabels({ Y_LT15: '< 15', 'Y15-64': '15 to 64', Y_GE65: '> 65' })
    .catColors({ Y_LT15: '#33a02c', 'Y15-64': '#cab2d6', Y_GE65: '#ff7f00' })
    .legend({ x: 550, y: 10, title: 'Population by age' })
```

Or simply:

```javascript
//population composition by age
eurostatmap
    .map('stripeComposition')
    .nutsLevel(3)
    .nutsYear(2016)
    .stripeWidth(10)
    .stripeOrientation(45)
    .statComp(
        { eurostatDatasetCode: 'demo_r_pjanaggr3', filters: { sex: 'T', unit: 'NR', time: '2019' }, unitText: 'people' },
        'age',
        ['Y_LT15', 'Y15-64', 'Y_GE65'],
        ['< 15', '15 to 64', '> 65'],
        ['#33a02c', '#cab2d6', '#ff7f00']
    )
    .legend({ x: 550, y: 10, title: 'Population by age' })
```

| Method                                    | Type    | Default value | Description                                                                                                                                                                 |
| ----------------------------------------- | ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**stripeWidth**([*value*])          | number  | _50_          | Width of the stripes series.                                                                                                                                                |
| _map_.**stripeOrientation**([*value*])    | number  | _0_           | Orientation of the stripes, in degree. Set to 0 for vertical and 90 for horizontal.                                                                                         |
| _map_.**catColors**([*value*])            | object  | _auto_        | The colors of the stripes, indexed by category code. If not specified, different colors are proposed.                                                                       |
| _map_.**catLabels**([*value*])            | object  | _auto_        | The colors of the stripes, indexed by category code.                                                                                                                        |
| _map_.**showOnlyWhenComplete**([*value*]) | boolean | _false_       | Draw a region only when data is available for all categories. If one is missing, the region is considered as with 'no data'. If not, the value of missing data is set to 0. |
| _map_.**noDataFillStyle**([*value*])      |         | _"lightgray"_ | The fill style to be used for regions where no data is available.                                                                                                           |
| _map_.**pieChartRadius**([*value*])       |         | _40_          | Radius of the pie chart to show in the tooltip.                                                                                                                             |
| _map_.**pieChartInnerRadius**([*value*])  |         | _15_          | Inner radius of the pie chart to show in the tooltip.                                                                                                                       |

In addition to [the default legend parameters](#map-legend), stripe composition maps have the following specific legend parameters:

| Method                             | Type    | Default value | Description                                                               |
| ---------------------------------- | ------- | ------------- | ------------------------------------------------------------------------- |
| _map_.**shapeWidth**([*value*])    | number  | _13_          | Width of the legend box elements.                                         |
| _map_.**shapeHeight**([*value*])   | number  | _15_          | Height of the legend box elements.                                        |
| _map_.**shapePadding**([*value*])  | number  | _5_           | Distance between consecutive legend box elements.                         |
| _map_.**labelFontSize**([*value*]) | int     | _12_          | Font size of the legend label.                                            |
| _map_.**labelOffset**([*value*])   | number  | _5_           | Distance between the legend box elements to the corresponding text label. |
| _map_.**noData**([*value*])        | boolean | _true_        | Show/hide 'no data' legend box element.                                   |
| _map_.**noDataText**([*value*])    | string  | _"No data"_   | 'No data' label text.                                                     |

### Sparkline map

A sparkline is a very small line chart, typically drawn without axes or coordinates. It presents the general shape of the variation (typically over time) in some measurement, such as temperature, in a simple and highly condensed way. A chart is drawn for each region showing the temporal variations of each.

Here is [an example](https://eurostat.github.io/eurostat-map/examples/sparklines.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/sparklines.html))

Example:

```javascript
eurostatmap
    .map('sparkline')
    .nutsLevel(1)
    .statSpark(
        { eurostatDatasetCode: 'demo_r_pjanaggr3', filters: { sex: 'T', unit: 'NR' }, unitText: 'people' },
        ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019'], //dates
        ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019'] //labels
    )
    .sparkType('area')
    .sparkLineWidth(70)
    .sparkLineHeight(20)
    .sparkLineOpacity(0.9)
    .build()
```

| Method                                      | Type              | Default                                                                                           | Description                                                                                                                                                                  |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**sparkType**([*value*])              | string            | "area"                                                                                            | Type of chart to use. Can be 'line' or 'area'                                                                                                                                |
| _map_.**sparkLineColor**([*value*])         | string / Function | "black"                                                                                           | colour of the sparklines. Also accepts an acessor function e.g: `.sparkLineColor((d, i) => (d[d.length - 1].value > 100 ? 'red' : 'blue'))`                                  |
| _map_.**sparkAreaColor**([*value*])         | string / Function | "#41afaa"                                                                                         | colour of the area chart fill (when sparkType set to area) Also accepts an acessor function e.g: `.sparkAreaColor((d, i) => (d[d.length - 1].value > 100 ? 'red' : 'blue'))` |
| _map_.**sparkLineWidth**([*value*])         | number            | 30                                                                                                | width of the spark charts                                                                                                                                                    |
| _map_.**sparkLineHeight**([*value*])        | number            | 20                                                                                                | height of the spark charts                                                                                                                                                   |
| _map_.**sparkLineStrokeWidth**([*value*])   | number            | 0.4                                                                                               | stroke width of the spark lines                                                                                                                                              |
| _map_.**sparkLineOpacity**([*value*])       | number            | 0.6                                                                                               | opacity of the spark lines                                                                                                                                                   |
| _map_.**sparkChartCircleRadius**([*value*]) | number            | 0.5                                                                                               | Radius of the circles at each record                                                                                                                                         |
| _map_.**sparkTooltipChart**([*value*])      | object            | {width: 100, height: 80, margin: { left: 60, right: 40, top: 40, bottom: 40 }, circleRadius: 1.5} | config for the chart shown in the tooltip                                                                                                                                    |

### Flow map

Here is [an example](https://eurostat.github.io/eurostat-map/examples/flowmap.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/flowmap.html))

```javascript
const exampleGraph = {
    nodes: [
        // the ids of the nodes and links correspond with the ids of the map's regions (e.g. NUTS id)
        { id: 'FR' },
        { id: 'DE' },
        { id: 'IT' },
        { id: 'ES' },
        { id: 'BE' },
        { id: 'Custom', x: 420000, y: 320000 },
    ],
    links: [
        { source: 'FR', target: 'DE', value: 8201 },
        { source: 'FR', target: 'IT', value: 4969 },
        { source: 'FR', target: 'ES', value: 4542 },
        { source: 'FR', target: 'BE', value: 4303 },
        { source: 'FR', target: 'Custom', value: 3445 },
    ],
}

const map = eurostatmap
    .map('flow')
    .flowGraph(exampleGraph)
    .nutsLevel(0)
    .flowColor('#72bb6f')
    .flowOverlayColors(['#bbd7ee', '#c7e3c6']) // exporter, importers
    .build()
```

| Method                                 | Type   | Default                | Description                                                                                                                |
| -------------------------------------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| _map_.**flowGraph**([*value*])         | Object | undefined              | The graph object with the links and nodes to be used to define the flow map's data. Same format that is used by d3 sankey. |
| _map_.**flowColor**([*value*])         | String | '#72bb6f'              | The color of the flows and arrows.                                                                                         |
| _map_.**flowOverlayColors**([*value*]) | array  | ['#bbd7ee', '#c7e3c6'] | The colors of the 'exporters' and 'importers' polygons (the colours of the region of origin and region of destination).    |

### Cartograms

As of version 4.1.0 you can now create grid cartograms and dorling cartograms by using the following functions:

#### Grid Cartograms

```javascript
map.gridCartogram(true)
```

You can switch between squares and hexagons using

```javascript
map.gridCartogramShape('hexagon')
```

and define container or cell padding using:

```javascript
map.gridCartogramCellPadding(5).gridCartogramContainerPadding(80)
```

If you wish, you can even define custom grid positions using:

```javascript
map.gridCartogramPositions(
    `,IS,  ,  ,  ,NO,SE,FI,  ,  ,  ,  ,
    ,  ,  ,  ,  ,  ,  ,  ,EE,  ,  ,  ,
    ,  ,  ,  ,  ,  ,  ,  ,LV,  ,  ,  ,
    ,IE,UK,  ,  ,DK,  ,LT,  ,  ,  ,  ,
    ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
    ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
    ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
    ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
    ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,
    ,  ,  ,  ,  ,  ,  ,AL,EL,TR,  ,  ,
    ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  
   `
)
```

Here is [an example](https://eurostat.github.io/eurostat-map/examples/grid-cartogram.html) of such map (see [the code](https://github.com/eurostat/eurostat-map/blob/master/examples/grid-cartogram.html))

#### Dorling Cartograms

Can be used like so:

```javascript
eurostatmap.map('proportionalSymbol').dorling(true).backgroundMap(false).psCodeLabels(true).psFill('#e04a28').psMaxSize(100).psMinSize(8)
```

removing the background map is optional but recommended:

```javascript
map.backgroundMap(false)
```

you can toggle the region code being shown inside the proportional symbols with:

```javascript
map.psCodeLabels(true)
```

## Map texts

Here you can find all the different texts you can add to the map.

### Map title & subtitle

Specify the map title, its style and position.

| Method                                | Type          | Default value | Description                                                                                            |
| ------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| _map_.**title**([*value*])            | String        | ""            | The title text.                                                                                        |
| _map_.**titlePosition**([*value*])    | Array ([x,y]) | auto          | The title position. If not specified, a position is automatically computed, on the top left corner.    |
| _map_.**subtitle**([*value*])         | String        | ""            | The subtitle text.                                                                                     |
| _map_.**subtitlePosition**([*value*]) | Array ([x,y]) | auto          | The subtitle position. If not specified, a position is automatically computed, on the top left corner. |

### Labelling

You can customise the labels shown on the map using the following settings:

```javascript
map = eurostatmap.map(...)
	.labels({
        labels: [
            { text: 'Test label', x: 3500000, y: 4260000, class: 'test' },
            { text: 'MEDITERRANEAN SEA', x: 5472000, y: 1250000, class: 'ocean', letterSpacing: 7 },
            { text: 'ATLANTIC OCEAN', x: 2700000, y: 2650000, class: 'ocean', letterSpacing: 2 },
            { text: 'NORTH SEA', x: 3915000, y: 3700000, class: 'ocean' },
            { text: 'BALTIC SEA', x: 4840000, y: 3600000, class: 'ocean', rotate: -30 },
            { text: 'NORWEGIAN SEA', x: 3850000, y: 4800000, class: 'ocean', letterSpacing: 1 },
            { text: 'BLACK SEA', x: 6300000, y: 2500000, class: 'ocean', letterSpacing: 4 },
        ],
        values: true, // label statistical values directly
        backgrounds: true, // for better legibility of labelled values
        shadows: true,
        processValueLabelCentroids: (region, centroid) => {
            // (optional) adjust NUTS1 label positions manually to avoid overlapping
            if (region.properties.id == 'ES4') {
                return [centroid[0] - 10, centroid[1] + 19]
            } else if (region.properties.id == 'DE4') {
                return [centroid[0] + 4, centroid[1] + 8]
            }
            return centroid
        },
    })
```

You can use the 'class' attribute to customise the labels accordingly (e.g. class: 'ocean' can be styled with .em-label-ocean).

These are the default classes used to style the labels:

```css
#em-labels
.em-stat-label
.em-stat-label-shadow
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

### Footnotes

Specify the text to be shown at the bottom of the map.

| Method                                    | Type    | Default value                   | Description                                                                                                                          |
| ----------------------------------------- | ------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| _map_.**footnote**([*value*])             | String  | _Some default text_             | The text. Note that the default value is mandatory.                                                                                  |
| _map_ .**footnoteTooltipText**([*value*]) | String  | The default disclaimer message. | Set a text to be shown in a tooltip when passing over the footnote. Set to _null_ if no tooltip has to be shown.                     |
| _map_ .**showSourceLink**([*value*])      | Boolean | true                            | Shows a link to the source dataset in the bottom right corner. (uses eurostatdatabasecode specified when using the stat() function). |

## Map legend

Specify the style of the map legend with _map_.**legend**({_parameters_}).

Example:

```javascript
map = eurostatmap.map(...)
	.legend({
		title: "Legend (%)",
		x: 10, y: 120,
		boxOpacity: 1,
        boxPadding: 10
	});
```

| Parameter      | Type   | Default value | Description                                                                                                            |
| -------------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **svgId**      | String | _auto_        | The SVG element where to draw the legend. If not specified, an element is automatically built within the map.          |
| **title**      | Text   | _""_          | The legend title.                                                                                                      |
| **x**          | number | _auto_        | The legend element X position, in case it is embeded within the map. If not specified, an automatic value is computed. |
| **y**          | number | _auto_        | The legend element Y position, in case it is embeded within the map. If not specified, an automatic value is computed. |
| **boxOpacity** | number | _0.7_         | The legend box opacity, from 0 to 1. Sets opacity of em-legend-background                                              |
| **boxPadding** | number | _0.7_         | The legend box padding. Sets padding of em-legend-background                                                           |

For legends of specific map types please refer to their own sections:

- [Choropleth legends](#choropleth-legends)
- [Proportional symbol legends](#proportional-symbol-legends)
- [Bivariate choropleth legends](#bivariate-choropleth-legends)

## Scalebar

| Method                                    | Type    | Default value              | Description                                          |
| ----------------------------------------- | ------- | -------------------------- | ---------------------------------------------------- |
| _map_.**showScalebar**([*value*])         | Boolean | _false_                    | Adds a scalebar to the map                           |
| _map_.**scaleBarPosition**([*value*])     | array   | _calculated (bottom left)_ | The X/Y position of the scalebar.                    |
| _map_.**scalebarFontSize**([*value*])     | int     | _8_                        | The font size in pixels of the scalebar text.        |
| _map_.**scalebarTicks**([*value*])        | int     | _5_                        | The number of ticks in the scalebar.                 |
| _map_.**scalebarTickHeight**([*value*])   | int     | _13_                       | The height of each tick in pixels.                   |
| _map_.**scalebarSegmenHeight**([*value*]) | int     | _30_                       | The width in pixels of each segment in the scalebar. |
| _map_.**scalebarTextOffset**([*value*])   | array   | _[4,8]_                    | The offset in pixels for the scalebar text ([x,y]).  |
| _map_.**scalebarUnits**([*value*])        | string  | _' km'_                    | The suffix text for the last scalebar label          |
| _map_.**scalebarMaxWidth**([*value*])     | string  | _px_                       | The maximum width of the scalebar                    |
| _map_.**scalebarHeight**([*value*])       | string  | _px_                       | The height of the scalebar                           |

## Tooltip

The tooltip is the little rectangle showing information on the map feature under the mouse/finger pointer.

You can configure the style and content of the tooltip.

Example:

```javascript
map = eurostatmap.map(...)
	.tooltip({
		maxWidth: "200px",
		fontSize: "16px",
		background: "white",
		padding: "5px",
		border: "0px",
		borderRadius: "5px",
		boxShadow: "5px 5px 5px grey",
		transitionDuration: 200,
		xOffset: 30,
		yOffset: 20,
		textFunction: (feature => { return feature.properties.na;  })
		showFlags: false
	});
```

| Property               | Type     | Default value        | Description                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **maxWidth**           | String   | _"200px"_            | The maximum width of the tooltip container.                                                                                                                                                                                                                                                                                                |
| **fontSize**           | String   | _"16px"_             | The font size of the tooltip text.                                                                                                                                                                                                                                                                                                         |
| **background**         | String   | _"white"_            | The background colour of the tooltip.                                                                                                                                                                                                                                                                                                      |
| **padding**            | String   | _"5px"_              | The padding of the tooltip container.                                                                                                                                                                                                                                                                                                      |
| **border**             | number   | _"0px"_              | The border styling of the tooltip container.                                                                                                                                                                                                                                                                                               |
| **borderRadius**       | String   | _"5px"_              | The border-radius of the tooltip container.                                                                                                                                                                                                                                                                                                |
| **boxShadow**          | String   | _"5px 5px 5px grey"_ | The box-shadow of the tooltip container..                                                                                                                                                                                                                                                                                                  |
| **transitionDuration** | Number   | _200_                | The transition time applied to the tooltip.                                                                                                                                                                                                                                                                                                |
| **xOffset**            | Number   | _30_                 | The x offset between the tooltip and the cursor.                                                                                                                                                                                                                                                                                           |
| **yOffset**            | Number   | _20_                 | The y offset between the tooltip and the cursor.                                                                                                                                                                                                                                                                                           |
| **textFunction**       | Function | _see example above_  | A function returning the text to show in a tooltip which appears when the mouse passes over map features. The function signature is `function(rg, map)` where `rg` is the selected region and `map` is the map. Set to _null_ if no tooltip is needed.                                                                                     |
| **showFlags**          | String   | _false_              | Set to _null_, _0_ or _false_ if no [flag](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Tutorial:Symbols_and_abbreviations#Statistical_symbols.2C_abbreviations_and_units_of_measurement) should be shown in the tooltip. Set to _"short"_ to show the flag as a letter. Set to _"long"_ to show the flag as a text. |

## Styling

Specify specific map styles. As of V4, styles have been moved to CSS classes. See [css.md](./css.md) for a list of CSS rules.
See deprecated.js for deprecated style functions and their successors. (or check the developer console for warnings when using deprecated functions)

| Method                                   | Type    | Default value | Description                                                                                                                                              |
| ---------------------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _map_.**hoverColor**([*value*])          | String  | _"#purple"_   | The fill style of the selected NUTS regions.                                                                                                             |
| _map_.**drawCoastalMargin**([*value*])   | boolean | _true_        | Set to true to show a coastal blurry margin. False otherwise.                                                                                            |
| _map_.**coastalMarginStdDev**([*value*]) | number  | _2_           | The standard deviation of the coastal blurry margin.                                                                                                     |
| _map_.**drawGraticule**([*value*])       | boolean | _false_       | Set to true to show the graticule (meridian and parallel lines). False otherwise. Calls to this method after the map is built will update the graticule. |

## Insets

To add map insets, use the _map_.**insets**([*values*]) method.

For default map insets showing European overseas territories and small countries, use:

```javascript
eurostatmap.map(...)
	.insets("default");
```

To specify more precisely which insets to show, their geographical extent, scale, position, etc., specify the list of insets such as:

```javascript
eurostatmap.map(...)
	.insets(
		{ geo:"MQ", scale:"01M", position: { z: 1000 }, title:"Martinique", width:200, height:90, x:0, y:0 },
		{ geo:"GF", scale:"03M", position: { z: 9000 }, title:"French Guyana", width:200, height:90, x:210, y:0 }
	)
	.insetBoxPosition([335,345]);
```

See also [this example with a focus on Spain](https://eurostat.github.io/eurostat-map/examples/spain.html) (see [the code](../examples/spain.html)).

Note that a map inset is built as a proper map within a map: It has all properties of a map, and share most of them with its parent map. It is thus possible to define map insets within map insets, following a recursive structure.

| Method                                | Type   | Default value | Description                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _map_.**insets**([*values*])          | List   | _[]_          | The list of insets. Each map inset is described as an object with the map inset attributes.                                                                                                                                                                  |
| _map_.**insetBoxPosition**([*value*]) | number | _auto_        | The position of the insets box element within the map.                                                                                                                                                                                                       |
| _map_.**insetBoxPadding**([*value*])  | number | _5_           | When several insets are specified within the map, the distance between the different insets.                                                                                                                                                                 |
| _map_.**insetBoxWidth**([*value*])    | number | _210_         | The default width of the insets box, which are squared by default.                                                                                                                                                                                           |
| _map_.**insetZoomExtent**([*value*])  | Array  | _null_        | The zoom extent of inset maps. The first value within [0,1] defines the maximum zoom out factor - the second value within [1,infinity] defines the maximum zoom in factor. Set to _[1,1]_ to forbid zooming and allow panning. Set to _null_ to forbid both. |
| _map_.**insetScale**([*value*])       | String | _"03M"_       | The default scale of the insets.                                                                                                                                                                                                                             |

## Export

Export the map as a PNG image or a SVG file.

| Method                     | Type   | Default value                  | Description |
| -------------------------- | ------ | ------------------------------ | ----------- |
| _map_.**exportMapToPNG**() | _this_ | Export the map as a PNG image. |
| _map_.**exportMapToSVG**() | _this_ | Export the map as a SVG image. |

## Miscellaneous

| Method                                         | Type     | Default value         | Description                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _map_.**noDataText**([*value*])                | String   | _"No data available"_ | The text to show for regions where no data is available.                                                                                                                                                                                                                                                                                                                       |
| _map_.**language**([*value*])                  | String   | _"en"_                | The language code, for multilingual maps.                                                                                                                                                                                                                                                                                                                                      |
| _map_.**transitionDuration**([*value*])        | int      | _800_                 | When updating statistical figures, the map style changes progressively. This parameter sets the duration of this transition, in ms.                                                                                                                                                                                                                                            |
| _map_.**filtersDefinitionFunction**([*value*]) | Function | _function() {}_       | A function defining SVG filter elements. To be used to defined fill patterns.                                                                                                                                                                                                                                                                                                  |
| _map_.**callback**([*value*])                  | Function | _undefined_           | A function to execute after the map build is complete.                                                                                                                                                                                                                                                                                                                         |
| _map_.**getTime**()                            | String   | -                     | Return the _time_ parameter of the statistical data. When a filter such as _{ lastTimePeriod : 1 }_ is used, this method allows a retrieval of the map timestamp.                                                                                                                                                                                                              |
| _map_.**setFromURL**()                         | _this_   | -                     | Set some map parameters based on URL parameters: "w" for width, "h" for height, "x" for xGeoCenter, "y" for yGeoCenter, "z" for pixGeoSize, "s" for scale, "lvl" for nuts level, "time" for time, "proj" for the CRS, "geo" for the geographical territory, "ny" for the NUTS version, "lg" for the langage, "sl" to show legend, "numberOfClasses" for the number of classes. |

## Build and update

After changing some parameters, one of the following methods need to be executed:

| Method                           | Type   | Default value                                                                                                                           | Description |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| _map_.**build**()                | _this_ | Build (or rebuild) the entire map.                                                                                                      |
| _map_.**updateGeoData**()        | _this_ | Get new geometrical data. It should be used to update the map when parameters on the map geometries have changed.                       |
| _map_.**buildMapTemplate**()     | _this_ | Update the map when parameters on the map template have changed.                                                                        |
| _map_.**updateStatData**()       | _this_ | Get new statistical data. It should be used to update the map when parameters on the statistical data sources have changed.             |
| _map_.**updateStatValues**()     | _this_ | Update client side information related to statistical values. It should be used to update the map when statistical values have changed. |
| _map_.**updateClassification**() | _this_ | Update the map when parameters on the classification have changed.                                                                      |
| _map_.**updateStyle**()          | _this_ | Update the map when parameters on the styling have changed.                                                                             |

Anything unclear or missing? Feel free to [ask](https://github.com/eurostat/eurostat.js/issues/new) !

## Version migration

See https://github.com/eurostat/eurostat-map/blob/master/docs/release-notes.md for any major changes.
