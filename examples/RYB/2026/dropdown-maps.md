For the Yearbook we need the choropleth maps with dropdowns for the following

Ch2 Map 2 A-B
Ch4 M3 A-C
Ch8 map 3 -A-C
Ch8 map 4 A-B
CH13 - A-C

Same colours, same classes and same scale 20M, but they do not want the max and min labels in the legend when it Is a dropdown map.

In order to do this, you will need to use examples/statistics-explained/business/human-services as a template (same skeleton). But each of our dropdown maps will only need one dropdown select input, which changes the map (e.g one option for map A, one for map B). Each map is defined in the excel sheet of its own name. For example CH2 map2 A is defined in CH02/data/RYB2026 CH02 Health-for maps.xlsx in the sheet named 'CH02M2A' and map B is in 'CH02M2B'. The same structure applies to the rest of the maps.

You will need to:

- use the NUTS column for the NUTS codes and the Value column for the statistical values. The class column can be ignored.
- Cell I6 (more or less) for the map title
- Cell I6 (more or less) for the map subtitle
- Cell I17 (more or less) for the legend title
- Cell I35 (more or less) for the footnote
- Cell I39 (more or less) for the source text
- Cells K18-23 (maybe more if there are more classes) for the colours array
- Cells N19-23 (maybe more if there are more classes) for the thresholds array

So there will be 5 HTML files in total, each showing a choropleth map with a dropdown above it. Make sure to share and centralise logic among them, to avoid repeated css and js.
