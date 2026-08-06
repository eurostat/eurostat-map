# RYB 2026 review comments

Items marked **[library]** require a change to shared `src/` code, not just the RYB example
pages — flagged for approval before touching, per instructions not to change library source
without asking first.

## Priority: special (non-dropdown) maps

- [x] Bosnia/Türkiye should show as "data not available" with **no regional boundaries**, like
      Ukraine. Root cause was that this behaviour is implemented by `styleMixedNUTS()` / geometry
      loading, which only activates when `nutsLevel('mixed')`, while the 5 dropdown choropleths
      used a concrete `nutsLevel(json.nutsLevel)` (e.g. `2`) — so it never engaged for them, and
      every country's full sub-region boundaries always loaded regardless of data coverage. Fixed
      by switching `dropdown-choropleth.js` to `.nutsLevel('mixed')`. This is an example-only
      change (no `src/` edits needed) since the maps already use `customData`, not remote
      fetching, so the mixed-mode remote-fetch caveat in AGENTS.md doesn't apply. Verified
      visually on CH02M02, CH08M03 and CH13M02: countries whose data is coded at country level
      with no value (e.g. Türkiye in CH13M02) now render as flat grey with no internal boundaries,
      exactly like Ukraine, while countries that DO have a real country-level value (e.g. Bosnia
      and Herzegovina in CH08M03, `14.4`) still render with their classified colour - just without
      spurious sub-region boundaries. Also re-checked dropdown option switching still rebuilds
      correctly in mixed mode.
- [x] Map frame extent (Greenland partly visible, extra Africa) — dropdown choropleths only.
      `dropdown-choropleth.js` had `.position(resolvedPosition)` commented out, so maps used the
      library's auto-fit extent instead of a tuned crop. Re-enabled and tuned (also nudged the
      legend down slightly, since the tighter crop otherwise put Iceland directly behind it).
      Checked visually on all 5 dropdown maps.
- [x] Logo position — confirmed fine to leave as-is per Andrew's follow-up ("Fine for me to leave
      logo where it is"). No change made.
- [x] Special maps (pie/coxcomb/mushroom/ternary) need the ESTAT logo included (previously PDF-only,
      logo calls were commented out) — enabled `.showEstatLogo(true)` on CH02M03, CH03M02, CH10M02,
      CH10M06, CH11M04, CH11M05. Follow-up fix: initially paired this with an explicit
      `.logoPosition([2, MAPHEIGHT - 12])` copied from elsewhere in these files, which you flagged
      as overlapping map content (e.g. sitting on top of the Algeciras port symbol on CH11M04,
      partly obscuring the "eurostat" text). Root cause: that Y offset assumed a ~12px-tall logo
      clearance, but the actual default logo image is 40px tall (`src/core/decoration/logo.js`),
      so it landed inside the live drawing area instead of the blank margin below it - unlike
      `dropdown-choropleth.js`'s dropdown maps, which deliberately size their drawing area 90px
      shorter than the container specifically to leave that margin. Fixed by removing the custom
      `.logoPosition(...)` entirely on all 6 files and letting the library's own default
      positioning (`getDefaultBottomY` - already correctly accounts for logo height and header
      offset) place it. Verified on all 6: logo now sits cleanly in blank space, fully legible, no
      overlap with map content.
- [x] **10.2 (Tourist nights) and 10.6 (Short-stay accommodation): coxcomb symbols not
      displaying** — **[library, confirmed regression, fixed with your permission]**. Root cause
      (as previously found): `statCoxcomb()`'s custom-data path patched `layer.build` to inject
      data after build completes, but since the layers migration, `eurostatmap.map('coxcomb')`
      returns a separate facade whose own `.build()` (the one the page actually calls) never
      delegated to the layer's patched version, so data was never injected. Fixed in
      `src/layers/composition/map-coxcomb.js` by registering each `time:category` stat dataset
      directly via `.setData()` at `statCoxcomb()` call time (synchronously, same pattern
      pie/bar/waffle/stripe already use via `_registerCategoricalStatChannel`), instead of
      deferring into a patched `build()`. Verified: both pages now render coxcomb glyphs on
      276/322 and 268/322 regions respectively, matching the pre-migration baseline exactly.
      Removed a stray leftover debug `console.log('UA M01:DOM value: ...')` while in there.
- [x] **Maritime freight/passengers (CH11M04/M05): ports rendered 3-4× in different places** —
      **[library, confirmed regression, fixed with your permission]**. Two compounding bugs in
      `src/layers/proportional-symbol/mushrooms/map-mushroom.js`: (1) `updateSymbolsDrawOrder()`
      only ran for the main map, never per-inset, and `applyStyleToMap()` selected centroids via
      an unscoped `map.svg().selectAll('g.em-centroid')` (matching every map/inset sharing the
      page's one physical SVG) instead of the properly-scoped `getCentroidsGroup(map)` - so every
      inset pass redrew every port's arcs into every other inset's (and the main map's) centroids
      too; (2) the classification state (`_mushroomScale_`, `mushroomColors_`, etc.) lives only on
      the owning layer, never copied onto per-inset map instances by `buildInset()`'s attribute
      whitelist (`src/core/insets.js`), so `applyStyleToMap` needed to read that state from the
      layer, not the passed-in map/inset, while still scoping DOM/geometry lookups to the
      map/inset itself. Separately, `filterGeometriesFunction` (the example's own callback that
      merges the port point data into the loaded geometries) now receives the calling map/inset
      as a 2nd argument (`src/core/geo/geometries.js`) so CH11M04.html/CH11M05.html can push each
      inset only its own single designated port instead of every port on the mainland map
      unconditionally. Verified visually and via duplicate-ID counts: main map is now completely
      clean, the two "zoomed-in mainland" insets (Germany/Denmark, Belgium/Netherlands) correctly
      show every mainland port, and the 4 single-port overseas insets each show exactly their own
      one port.
- [x] Causes of death (CH02M03): only the pie-chart map view is needed — dropped the "Type"
      dropdown and its other options (flag/ring/segment/radar/agepyramid/halftone/stripe) along
      with the now-unused type-switching/stripe-map code; the page now just builds the pie map
      directly.
- [x] Causes of death (CH02M03): legend labels now read "Circulatory system", "Cancer (malignant
      neoplasms)", "Respiratory system" (plus "Other") as in the static version, rather than the
      previous short labels.
- [x] Tertiary education (CH03M02, ternary): needs a narrow (700px) layout — main map + legend
      underneath only, no small multiples, no colour controls. Per your direction: the original
      file (with the hue/chroma/lightness/breaks/spread sliders and the 3 small-multiple maps) is
      preserved as `CH03/CH03M02_test.html` for dev/testing use; `CH03M02.html` itself is now
      permanently stripped to just the main map with the legend stacked directly underneath it
      (flex column layout, no sliders, no small multiples, no small-multiples export button).
      Note found in passing, not fixed (out of scope for this pass, pre-existing even in the
      original file): the legend subtitle text ("Areas with more green have a higher % of
      bachelor's students...") is wider than the legend's own configured width and gets clipped -
      just less noticeable when overlaid on the busy map than now that it's isolated on white
      underneath it. Flag if you'd like this addressed separately.
- [x] Tertiary education (CH03M02): hovering a blank area of the legend triangle (no plotted dot
      under the cursor) spuriously highlights random regions on the main map — **[library, fixed
      with your permission]**. Root cause confirmed live: the triangle's colour background is
      tiled with ~840 small polygon grid cells covering the whole plot area (not just where data
      points sit), each with its own hover handler that highlights every region sharing that
      cell's colour by color-matching - so hovering any blank cell (not an actual data point)
      still fired it. The actual plotted data points already have their own separate, precise
      hover handler (highlights by class index, not color-matching) that was working correctly.
      Fixed in `src/legend/choropleth/legend-choropleth-trivariate.js` per your direction: the
      triangle-background handler is now gated on `colorTarget === 'triangles'` - inert (as
      intended) for CH03M02's `colorTarget: 'points'` config, but still active for any map that
      explicitly wants the coarser "hover a colour area" interaction via `colorTarget: 'triangles'`.
      Verified: hovering the same blank grid cell that previously dimmed 278/279 regions now
      leaves all 279 at full opacity; hovering an actual data point still correctly highlights.
- [x] Maritime freight/passengers (CH11M04/M05) were designed for print (1080×900) and need to be
      700px wide for online embedding: reduced symbol `maxSize`, shrunk the insets, and moved every
      annotation so its geographic position is maintained. Per your direction: scaled every
      pixel-dependent value (map width/height, zoom `z`, inset width/height/position/`z`, symbol
      `minSize`/`maxSize`, legend position, and every annotation's `x`/`y`/`dx`/`dy` plus, for
      CH11M04's two callout-circle annotations, `subject.radius`/`radiusPadding` and
      `connector.points`) by the same ratio (700/1080 ≈ 0.648), so the whole layout stays
      geographically/proportionally coherent rather than just shrinking the canvas around
      unscaled content. Also fixed two things the scale-down exposed that weren't purely
      proportional: (1) the footnote credits ("Administrative Boundaries...", "Cartography...")
      were positioned side-by-side at fixed offsets tuned for the wider canvas and started
      overlapping - now right-aligned and stacked as two lines, matching the pattern already used
      in `dropdown-choropleth.js`; (2) the map's own `.footnote()` note text had no
      `.footnoteWrap()` set and rendered as one long unwrapped line that ran into the credits -
      added `footnoteWrap(90)`. Nudged the inset column width up from the strict scaled value
      (61px) to 76px since the longest inset title ("Guadeloupe (FR)") was clipped by its own box
      at 61px (title font-size doesn't shrink with the box). Manually nudged the "Algeciras" label
      on CH11M04 (`dy`) since it landed directly on top of the logo at the new scale - a case
      exactly like the annotation edit-mode workflow (Toggle annotation edit mode → drag → Export
      annotations JSON) already built into these pages is meant for, if further nudging is wanted.
      **Known remaining cosmetic issue, not fixed**: CH11M05's size legend ("5.7 million" / "1
      million") renders with the two values' semicircle icons and labels crowded/overlapping -
      tried the `sizeLegend.shapePadding` config option but it had no visible effect at any value
      tested, suggesting the actual cause is elsewhere in the mushroom legend's rendering (not a
      simple config fix); flagging rather than guessing further. Verified both pages otherwise
      render cleanly at 700px: symbols, insets, and annotation labels are legible and in the
      right places, footer/footnote text no longer overlaps.

## Dropdown choropleth maps (CH02M02, CH04M03, CH08M03, CH08M04, CH13M02)

- [x] ESTAT logo placement — per Andrew's follow-up, fine to leave where it is. No change made.
- [x] Tooltip: values ending in `.0` are truncated (e.g. "7" instead of "7.0") — **[library, fixed
      with your permission]**. Root cause was `choroplethTooltipFunction` formatting values via
      `spaceAsThousandSeparator()` (`src/core/utils.js`), which calls `number.toLocaleString('en')`
      — this drops trailing zeros and has no way to force a fixed decimal count. Fixed by adding a
      `formatTooltipValue()` helper in `src/layers/choropleth/map-choropleth.js`: precision is an
      explicit `.tooltip({ decimals: N })` config when set, otherwise auto-detected from the
      max precision seen across that stat dataset's own values (reusing `getMaxDomainPrecision`,
      which used to be a legend-bar-chart-only local helper — moved it to the shared
      `src/legend/legend-utils.js` per your steer, so both the legend and the tooltip use the same
      precision-detection logic). Verified: "85.0 years" (was "85 years") on CH02M02; unaffected
      values like "87.9 years" and other, non-RYB choropleth examples (population density) still
      format exactly as before. Maritime transport maps (CH11M04/M05) untouched, as requested -
      confirmed they use their own hand-rolled `toFixed(1)` tooltip text, not this shared function.
- [ ] Map frame extent (Greenland, extra Africa) — see above, fixed via `.position(...)`.
- [ ] Inset (island regions) vertical position — insets currently sit higher than the main map
      body, unlike the static maps. Not yet root-caused; likely an `insetBoxPosition`/layout
      tuning issue in `dropdown-choropleth.js`, not a library bug, but needs verification against
      the newly-fixed map extent above first (the extent fix may change where the insets need to
      sit). Not yet done.
- [x] Palestine tooltip wording — explicitly excluded from this pass per your instruction.
- [x] Bosnia and Herzegovina — see "Bosnia/Türkiye" item above (fixed via `nutsLevel('mixed')`).
- [x] Copyright note: "Administrative Boundaries" → "Administrative boundaries" (lowercase b), to
      match the static maps. Fixed in `dropdown-choropleth.js`'s `addCartographyCredits()`.

### Life expectancy at birth (CH02M02)

- No item-specific comments beyond the shared list above.

### Employment rate by educational attainment (CH04M03)

- [ ] Title for "tertiary education" option wraps to one line while the other two options wrap to
      two lines, so the map visibly "jumps" on selection. Not yet done — needs a forced line break
      for the tertiary-education title text to match the other two options' height.
- [x] Tooltip: remove the space before `%` (e.g. "17.4 %" → "17.4%") — **[library, fixed with your
      permission]**, same fix as the `.0` truncation item above. Superseded an earlier version of
      this fix (auto-detect: no space only when unit is exactly `%`) per your feedback that
      spacing should be controlled by `unitText` itself, not guessed by the library. Now
      `choroplethTooltipFunction` concatenates `unitText` immediately after the value with no
      separator inserted at all - callers write `unitText: ' years'` for a space or `unitText: '%'`
      for none. Updated every plain-choropleth `unitText` across `examples/` (RYB's own JSON data
      files - `CH02M02.json`, `CH13M02.json` - and every other choropleth example:
      population-density, gdp-per-inhabitant, continuous, annotations, labelling, population-change,
      the grid-cartogram choropleths, etc.) to add the leading space these each relied on the old
      auto-space behaviour for; left `%`/`‰`/empty ones unchanged. Also updated
      `examples/RYB/scripts/extract_dropdown_choropleth.py` (the Excel→JSON generator for these
      dropdown datasets) with the same rule, so regenerating a dropdown map's JSON from its
      spreadsheet won't silently lose the space again - `clean_text()` unconditionally strips
      whitespace from the raw cell, so the space has to be added in the script, not typed into
      Excel. `test/` fixtures (dev-only, not user-facing) were left as-is. Verified: "85.0 years"
      still correct on CH02M02, "55.0%" still correct on CH04M03, "4 334.3 people/km²" still
      correct on the population-density example, "6.2 ‰" still correct on population-change.
- [x] Bosnia and Herzegovina regional boundaries — see shared item above (fixed).

### Regional specialisation in manufacturing (CH08M03)

- [x] Tooltip `%` spacing — see CH04M03 item above (fixed).
- [x] Bosnia and Herzegovina — see shared item above (fixed; this dataset has a real BA value so
      it still renders coloured, just without spurious sub-region boundaries).

### Labour market indicators (CH08M04)

- [x] Bosnia and Herzegovina — see shared item above (fixed).
- [x] Türkiye (no data, coded at NUTS 0) — see shared item above (fixed).

### Average size of farms (CH13M02)

- [x] Bosnia and Herzegovina and Türkiye (both no data, coded at NUTS 0) — see shared item above
      (fixed; verified visually, both now render flat grey with no sub-region boundaries).
