- Tooltip: remove the space before `%` (e.g. "17.4 %" → "17.4%") — **[library, fixed with your
  permission]**, same fix as the `.0` truncation item above. The space is now only added when
  the unit isn't exactly `%` (auto-detected, no config needed - other units like "years" or
  "Nights" keep their space). Verified: "55.0%" on CH04M03.
  Shouldnt this be defined by the unitText and whether it has a space or not? instead of forcing all instances of % to have a space? so unitText:' %' vs unitText:'%'?

- All the logos you added in this session are not placed correctly in the bottom left corner of the map like they are in the dropdown choropleths.

- CH11M04 and M05 were designed for print, but now we need to adapt them so that they are 700px wide for online websites. This means: reducing the maxSize of the symbols, adjusting the annotations so their geographic positions are maintained, making the insets smaller, etc.
