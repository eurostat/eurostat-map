# Eurostat-Map Development Rules & Guidelines

Welcome to the `eurostat-map` codebase! Please follow these guidelines when contributing to
or editing files in this repository. This file applies to any AI coding agent working in
this repo, regardless of provider or tool (Claude Code, Cursor, Codex, Gemini, Copilot, etc.).

## Commit and push after every task

After completing any task in this repository (a fix, a feature, a docs update, etc.),
commit the changes and push to the current remote branch. Don't leave finished work
sitting uncommitted in the working tree.

- Stage only the files relevant to the task (avoid broad `git add -A` sweeps that pick up
  unrelated in-progress work from elsewhere in the tree — check `git status` first, since
  multiple agents/sessions may be working in this repo concurrently).
- Build with the locked toolchain (`npm ci` first in a new checkout or worktree).
- If source under `src/` changed, rebuild the bundle (`npm run build-prod`, and the dev
  bundle via `npx webpack --config webpack/webpack.config.dev.js --no-watch` if
  `build/eurostatmap.js` is also tracked as changed) and include the updated `build/`
  output in the same commit.
- Push after committing — don't leave commits local-only.

## Release process: version bumps need sign-off, only the user publishes to npm

**Before running any release step (version bump, `npm publish`, git tag, or GitHub Release),
read `docs/release-flow.md` in full and follow it end-to-end.** It is the authoritative,
step-by-step release procedure (preflight checks, build-both-bundles, commit/tag/push order,
the hand-over to the user for `npm publish`, the GitHub Release that follows it, post-publish
verification, and release-notes structure) - the summary below is not a substitute for it and
omits steps (e.g. creating and pushing the git tag, and the GitHub Release) that
`docs/release-flow.md` requires. Skipping it produces a real gap: e.g. a version published to npm
with no matching git tag ever created.

This package is consumed by `image` (the sibling `image` repo, dependency
`eurostat-map` in its `package.json`) and possibly other consumers, so releases are not casual:

- **Never run `npm publish`: it only works with the user's security key**, so an agent cannot do
  it. Do the other release-flow steps (bump version, rebuild, update `docs/release-notes.md`,
  commit, tag, push), tell the user the version is ready for them to publish, and wait. Once they
  say it is done, verify with `npm view eurostat-map version` and create the GitHub Release.
- **No publish is coming unless the maintainer asks for a release to be prepared.** Until then, don't bump or tag, and
  don't defer work to "the next version": it all goes into the pending release.
- **Always confirm the semver level explicitly** (patch/minor/major) before bumping the version
  or publishing — don't infer it silently, even for a change that looks obviously non-breaking.
- **Don't bump the version once per fix.** While iterating on a batch of not-yet-published
  changes (e.g. several small bugfixes found back-to-back in the same session/review), keep
  committing normally but hold off on bumping the version or publishing until the whole batch is
  ready — bumping 4.10.2 → 4.10.3 → 4.10.4 for three separate small fixes that were never
  published in between is exactly the mistake to avoid. Ask the user, or use judgment, about
  when a batch is "done."
- Once a version is actually published, update `image/package.json` + `image/yarn.lock`
  (`yarn add eurostat-map@<version>` from `image/`, **not** `npm install` - see that repo's
  `AGENTS.md`) and verify image still builds before considering the change fully landed.

## Never let a library change harm IMAGE

Before shipping a change to default layout, legend config names, CSS classes or public API, check how `image/image/src` (sibling
repo) uses it, and compare the result with the version IMAGE ships (`image/image/node_modules/eurostat-map`): render IMAGE's
legend configs and CSS with both bundles and diff element positions, and run IMAGE's browser tests against the new build
(copy `build/` over its `node_modules` copy, clear `image/.angular/cache`, `npm run e2e`, then restore). Fix IMAGE directly
if it needs to change (read its `AGENTS.md` first).

## Known bug class: confusing the shared layer with the current map/inset instance

Several real bugs here (fixed 2026-07-29: image-repo issues #379 and #380) came from the same
root cause, so check for it first when a symptom looks similar:

- Classifier/config state that's genuinely global to a map type (`classifierColor_`,
  `noDataText_`, `psClassToFillStyle_`, etc.) is only ever set on the **shared owning layer**
  - never on an individual **inset**, which is a separate map/facade instance with no classifier
  of its own. Code that reads this state off whatever "map" or "target" object happens to be the
  current call context (rather than off the real shared layer) silently gets `undefined`/falsy
  for every inset, even though the main map works fine.
- Relatedly, `addMouseEventsToRegions`/`addMouseEventsToSymbols`-style event handlers must pass
  the **map instance** (`textFunction(region, map)`, matching the documented
  `TooltipConfig.textFunction` signature) to a *custom* tooltip `textFunction`, not the internal
  per-type `layer` object - the two are different objects whenever the map has a real Layer
  (`layer.map` points to the map; a custom tooltip written against the public API expects `map`
  itself, e.g. reading `map.noDataText_`). The *default* built-in tooltip functions are written
  the other way around (they expect `layer` and do `layer.map.noDataText_`), so don't just swap
  the argument at the call site - either forward the missing state onto `layer` too (see
  `attachThematicApi` in `core/layer.js` for the existing `statData`/`noDataText_` precedent), or
  make the receiving function itself normalize via a `getLayerAndMap()`-style helper (see
  `map-proportional-symbols.js`).
- When "not showing on insets" or "works live but not in exported HTML" bug reports come in for
  choropleth or proportional-symbol maps, grep for the affected field's name across
  `core/layer.js`, `map-choropleth.js`, `map-proportional-symbols.js`, and `ps-classification.js`
  and check whether it's actually reachable from every object that might get passed around as
  "the current map", not just the one call site.
- If interaction is disabled during a D3 transition, restore `pointer-events` and attach handlers
  on both transition fulfillment and interruption. Insets or repeated updates can interrupt the
  transition; an empty rejection handler leaves the map permanently non-interactive.
- `_tooltip` is created on the owning map during `build()`, after real layers are constructed, so
  do not expect `layer._tooltip` to inherit it. Interaction handlers on layers must resolve
  `layer.map._tooltip` (with the current map/inset tooltip as the first choice).
- The choropleth decorator registers its default tooltip formatter during construction, replacing
  a formatter supplied in the constructor config. For a single-layer choropleth example, assign
  `map.tooltip().textFunction` after construction and before `build()`.

## Known bug class: behaviour gated on a flag that only the public setter sets

Insets copy their config with `mt[key + '_'] = config[key]` (`core/insets.js`), which bypasses the fluent setters. A flag
set only inside a setter (`_widthExplicit_`, the old `_heightExplicit_`) is therefore unset for every inset, and logic
like "recompute the default unless the caller set it" silently overrides the inset's own size (every inset became 0.85 x
its width tall, caught by `test/e2e/inset-regression.test.mjs`). Track the *auto-computed* case instead
(`_heightAuto_`, set only by the code that computes the default), so a value that arrived any other way is kept.
Likewise, `core/deprecated.js` shims must target the classes the library really draws (`.em-bn-<lvl>`, not the old
`.bn_<lvl>`); a shim that updates a class nothing carries is a silent no-op.

## `nutsLevel_ === 'mixed'` and remote stat refetches

`stat-map.js`'s `updateStatData()` used to unconditionally force the fetch level to country
(`nl = 0`) whenever `out.nutsLevel_ === 'mixed'` (every map type except `spark`), regardless of
what `geoLevel` the caller already set in their `stat()` config's `filters`. Fixed (2026-08) in
`stat-data.js`'s `getEurobasePromise`: an explicit `filters_.geoLevel` is now respected the same
way an explicit `filters_.geo` already was - confirmed with a live headless-browser test (not
just reading source) that a `stat({filters:{geoLevel:'nuts3'}}).updateStatData()` call was
silently fetching country-level data before the fix. If a similar "remote refetch ignores my
filter" symptom comes up again for a mixed-level map, check this code path first.

Separately - and easy to get wrong when building on the above - `nutsLevel_ === 'mixed'` itself
gates a large amount of unrelated rendering logic (grep `nutsLevel_ === 'mixed'`: region
visibility in `map-choropleth.js`'s `styleMixedNUTS()` and `map-proportional-symbols.js`'s
`styleMixedNUTSRegions()`, geometry loading in `core/geo/geometries.js`, centroids in
`core/geo/centroids.js`, plus categorical/bivariate/pie/bar/waffle/coxcomb layers). Never call
`map.nutsLevel(someConcreteLevel)` on a mixed-level map just to change which level's *data* is
shown - that flips the map out of mixed mode and breaks all of the above. A consumer that wants
"show me NUTS level N's data on an otherwise-mixed map" (e.g. IMAGE's exported-HTML NUTS-level
dropdown, image-repo issue #176) should leave `nutsLevel('mixed')` alone and only change the
`geoLevel` stat filter on refetch - `styleMixedNUTS`/`styleMixedNUTSRegions` already show exactly
the regions that end up with a classified/sized value from whatever data was just fetched.

## Use the library's API in examples; fix the library instead of working around it

Never hand-roll a workaround in an example (own SVG patterns, injected rects, manual legend boxes, per-element
restyling in `onBuild`). Search `src/`, `docs/reference.md` and the bundled d3-annotation options first (e.g.
`patternFill()` for hatching with its own legend item; `note.bgPadding` for a callout box). If the API is missing or
misbehaves, fix or extend the library, rebuild the bundles and commit them. Example: `patternFill` overlays were
invisible on proportional-symbol maps because the map type's CSS overrode their `fill` attribute; the fix was in
`core/decoration/pattern-fill.js` (inline style), not in the example.

## Layer decorators and map services

- Every public `MapType` alias must be registered in `core/layer-registry.js` by its module and
  constructed through `buildSingleLayerMap`; add a registry-enumeration test when adding a type.
- Real layers inherit live map services through the forwarding prototype built by `createLayer`.
  Keep thematic state as own properties on the layer; do not copy map state into decorators.
- Generic legends constructed for a real layer normalize their references as `legend.map` (the
  owning map/services) and `legend.layer` (the thematic state). Type-specific legends must read
  classifier, scale, date, color, and other decorator-owned state from `legend.layer`.
- Discrete colour legends share the SVG swatch and label renderer in `src/legend/legend-swatch.js`.
  Every vertical swatch stack (choropleth ranges/thresholds, categorical, flow colour) is laid out by
  `appendLegendSwatchRows`/`swatchStackLayout` there; add separators or ticks through its `decorate` hook and
  never position swatches by hand (the flow legend once had a different gap from the choropleth one).
  The discrete colour legend is split by concern in `src/legend/discrete/` (`vertical`, `horizontal`, `max-min`,
  `divergence`, `extras` for no-data/category swatches, `shared`); add a feature to the module that owns it.
  IMAGE (sibling repo) depends on the legend's CSS classes (`em-legend-rect`, `em-legend-label`, `em-legend-title`...)
  and on the `legend()` config names, so keep both. `test/e2e/legend-layout.test.mjs` pins the geometry: run it after
  touching any legend layout.
  Scope flow legend highlights to the owning SVG and match custom colour entries against the stable
  `data-color` on each route. Route hover and gradients can change the visible fill or stroke.
- Flow rendering writes projected coordinates into graph nodes. On redraw, project from the original
  coordinates rather than reprojecting the previous screen positions. In parallel layouts, use the
  same rendered circle radii for connector clearance and for the node symbols.
- Flow great circles (`lineGeometry: 'greatCircle'`, `flow/great-circle.js`) work from the node's *raw* coordinates
  (`out._flowNodeCoordinates`): lon/lat on world maps and custom projection functions, the map CRS (EPSG:3035...)
  otherwise, converted with `projectFromMap`/`projectToMap`. d3's `geoPath` cuts routes at the antimeridian; an
  edge-bundled route is one polyline, so those start straight. Tapered and parallel routes are straight-segment
  geometry and stay straight. `bundleSettings` merges with the defaults (a partial object once made every bundled
  route NaN); a negative `chargeStrength` un-bundles.
- Small multiples of flow maps need `flowSettings({ widthDomain })` (one shared width scale) and one legend: the first map draws it
  with `legend({ svgId })`, the others `legend(false)`. A flow legend part is left out with `false` (`nodeSizeLegend: false`).
- Flow legends are stacked from measured sizes (title, then label rows, then the lines), never from fixed offsets, and labels that would touch
  are moved onto another row (`assignLabelRows` in `legend/legend-swatch.js`). Keep it that way for any new legend: a fixed offset is how
  the width legend's title once ended up over its labels. `test/e2e/flow-legend-overlap.test.mjs` checks that no two pieces overlap.
- Rules for every legend, flow or not: `setBoxDimension` runs `separateStackedParts` (legend-swatch.js), which moves an overlapping
  top-level group below the earlier ones, so make each sub-legend its own `<g>` child of `lgg` (a graphic made of several interlocking
  groups, like the bivariate square, goes inside one wrapper group). Use `legibleSwatchHeight` and `titleClearance` for stacks and
  titles, accept `false` for every sub-legend, and reuse the choropleth option names (`orientation`, `width`, `labels`, `maxMin`,
  `maxMinLabels`) instead of inventing new ones. `test/e2e/legend-overlap.test.mjs` renders every legend type under stress.
  The separation pass compares what is drawn (leaf elements, text without line spacing), not group boxes: IMAGE uses
  tight legends (`titlePadding: -4`) that must not move.
- To change a built flow map, do not rebuild it: set `flowGraph`/`flowSettings` and call `updateStyle()` (or `legend(cfg)`, which redraws
  flows then legend), which keeps the base map and zoom; `updateFlowWidths()` restyles bundled routes without restarting the
  bundling. `updateStyle()` must therefore stay safe to call repeatedly (it once sank the flow layer under the base map).
- A custom flow `nodeSizeScale` used with a size legend needs a `domain()` method, including when
  the example supplies explicit legend values.
- Edge bundling must choose its charge distance independently of the node size scale.
  Circle size scales can be plain functions without D3's `range()` method.
- `stat()` and `statData()` remain map-owned to avoid map-to-layer forwarding recursion. A layer
  that needs to expand a special one-object stat config (spark's `dates`, for example) must expose
  an own `handleStatConfig` hook; do not override `layer.stat()` and expect the public map facade
  to call it.

## Docs must track the API

- `docs/reference.md` is hand-written: when adding or changing a public method, legend config (`src/types/legend/*`) or
  map option, add/update its row there too (the legend section has one subsection per legend type). A quick audit:
  diff method names in `src/types/core/MapInstance.d.ts` against `**name**` in `reference.md`.
- `npm run type-check` runs `scripts/check-docs-sync.js`, which fails if a `MapInstance` method or a legend /
  ranked-bar-chart config property in `src/types` is missing from `reference.md` (add a row, or an entry to the
  `IGNORED_*` lists with a reason). Add a section mapping there when adding a new legend config interface.
- `skills/eurostat-map/SKILL.md` is the guide for agents that *use* the library. When a map type, channel, default or documented gotcha changes, update it too. It links to
  `reference.md` for detail, so keep it short.
- `docs/api/` is generated by typedoc; `.github/workflows/api-docs.yml` regenerates and commits it when `src/types`
  changes on master (so `git pull` before your next push). Run `cmd /c npm run update-docs` to refresh it locally.
- TypeDoc 0.28 calls `Minimatch.matchOne()`, which minimatch 11 removed. Check
  `cmd /c npm run update-docs -- --emit none` when changing the TypeDoc-scoped minimatch override.
- The Pages site serves `docs/*.md` raw at `.md` URLs; link to the rendered `.html` URL from HTML anchors (Jekyll only
  rewrites `.md` links written in Markdown syntax).

## GitHub etiquette and history

- Include the relevant GitHub issue number in every commit message for work tied to an issue
  (for example, `Refs #183`). Use `owner/repo#123` for issues in another repository.
- After pushing completed issue work, show the user the exact closing comment and ask for
  permission to post it and close the issue. Wait for explicit approval before either action.
- **Never post a comment on an issue or PR (or close one with a comment) without showing the user the
  draft and getting approval first.** These go out publicly under the user's account.
- Don't rewrite or force-push `master` unless explicitly asked. If you must (e.g. scrubbing a commit message),
  re-point every release tag in the rewritten range to its new commit and force-push them too, otherwise the
  old commits stay reachable. External PRs branched before a rewrite can no longer be merged on GitHub: apply
  the diff with `git cherry-pick`, keep the contributor as author, write the message yourself (no AI trailers),
  then comment/close the PR (with approval, see above).
- `statData.set()` tells a stat object `{value, status}` from a bare value with `'value' in stat`, never with a
  truthy `stat.value`, so exact zeros and empty strings survive. Watch for the same `!x.value` pattern elsewhere.

## Never add a Co-Authored-By / AI-authorship trailer

Do not add a `Co-Authored-By: <agent name>` (or any AI/assistant authorship) trailer to
commit messages in this repository, regardless of what a default commit workflow template
suggests.

## Architectural & Language Separation
* **JavaScript Source**: The runtime library is written in pure ECMAScript 6 (ES6) modules in the `src/` directory. Do not convert the source code files to `.ts`.
* **TypeScript Typings**: All TypeScript typing support is defined via declaration files (`.d.ts`) in the `src/types/` directory.
* **Synchronization Requirement**: If you add, remove, or modify any public methods, options, map types, or builder chain methods in the JavaScript files, you **MUST** immediately update the corresponding type definitions in `src/types/` to match.

## API Design & Patterns
* **Fluent/Builder Pattern**: The library utilizes a fluent interface. Methods serve as both getters and setters:
  - Calling `map.width()` returns the current value.
  - Calling `map.width(800)` sets the value and returns the map instance (`this` or `out`) for chainability.
  *Ensure all setter methods return the parent object `out`!*
* **Dynamic Property Creation**: The core config properties in `src/core/stat-map.js` are dynamically mapped from array loops:
  ```javascript
  ['legend_', 'legendObj_', 'noDataText_', ...].forEach(function (att) {
      out[att.substring(0, att.length - 1)] = function (v) { ... }
  })
  ```
  Ensure any new global attributes added to `stat-map.js` are correctly typed in `src/types/core/MapInstance.d.ts` and `src/types/core/MapConfig.d.ts`.

## Working with D3 and Cartographic Utilities
* Always reuse existing layout, margin, coordinate transformation, and projection helpers in `src/core/geo/proj4.js` and `src/core/utils.js` instead of rewriting them.
* Do not introduce new heavy external libraries unless absolutely necessary. Rely on the bundled version of D3.js and helper libraries like `simple-statistics`.

## Development & Build Commands on Windows
Because script execution can be disabled in certain PowerShell environments, always use the Command Prompt prefix `cmd /c` when invoking npm scripts:
* **Validate Types**: `cmd /c npm run type-check` (runs `tsc --noEmit`)
* **Tests**: `cmd /c npm test` runs `test:unit`, `test:integration` and `test:e2e`; the layout and what goes where
  are in `test/README.md`. Unit tests (`test/unit`, `node:test`) import `src/` directly through
  `test/helpers/register-src.mjs` and need no build; integration and e2e run against the **built**
  `build/eurostatmap.js`, so rebuild the dev bundle first. `*.test.mjs` files in `unit/` and `integration/` are
  picked up automatically; a new e2e test has to be added to the `test:e2e` script.
* New pure logic gets a unit test. A module that touches `window`/`document` at import time (e.g. `core/insets.js`,
  `src/index.js`) cannot be loaded by the unit loader: test it through the bundle, or extract the logic.
* `test/manual/` holds the browser pages to check by eye (formerly at the top of `test/`); they load the bundle by
  relative path, so moving one means fixing its `../` depth.
* **Production Build**: `cmd /c npm run build-prod` (copies typings and builds output to `build/`)
* **Local Test Server**: `cmd /c npm run server`
* **Format Files**: `cmd /c npm run format` (runs Prettier). Don't run it, or `prettier --write` on a
  whole directory, for a small change: many tracked files aren't Prettier-clean (and some are CRLF),
  so it rewrites dozens of unrelated files. Format only the files you touched.
* `npm test` includes `test/e2e/kosovo-border.test.mjs`, which needs Playwright's Chromium
  (`npx playwright install chromium` after a Playwright bump). It is offline: synthetic Nuts2json.
* `node scripts/smoke-harness.js` (17 cherry-picked examples) compares serialized SVG against
  `test/e2e/baselines/`; recapture with `--capture` after deliberate DOM changes. The `--all`
  baselines are not maintained (many missing or stale), so only its page errors and timeouts mean anything.
  The harness mocks map geometry and statistics, but examples still need network access for external
  scripts and CSVs. Restricted networking can cause page errors or timeouts in the 17-example run.

## Border hierarchy (Kosovo rule)

The Kosovo border (`.em-kosovo-bn`) must always look in between national and regional borders:
width and colour only, never opacity or dashing (unless national borders are dashed), no halo.
Every map type that mutes national borders in `src/css/layers/*.css` (and world maps, via
`world.css`) must scale `.em-kosovo-bn` down with them. When changing any border width or colour, run
`node test/e2e/kosovo-border.test.mjs --verbose`; it prints national/Kosovo/regional per map type.

- Border modes (`lightBorders()` -> `.em--borders-light`, `darkMode()` -> `.em--dark`) live in
  `src/css/border-modes.css`, imported last so its rules beat same-specificity `css/layers` rules;
  the dark section comes before the light one so light borders win when both are set. A new muted
  map type, or a new per-type border rule, needs checking in every mode: the test runs each scenario
  in all of them (`--mode <name>` to run one). Watch specificity: world Kosovo uses an id selector.
- Colours follow Eurostat's guideline (Kosovo `#787878` 0.5px, regional `#858585` 0.3px, also in dark
  mode); the user rejected sharing one grey to beat regional over every fill. A solid line vanishes over
  a fill of its own lightness, so over mid-tone fills (L* ~43-52) regional out-contrasts Kosovo: the
  test lists those rendered fills as guideline-limit notes, and fails on anything else. It measures
  prominence over the fills each map really renders (land, sea, all class colours, no-data colour).
  Muted types paint no-data regions `#adadad`; where their national border has no halo, a Kosovo grey
  other than the national one fails there, so Kosovo takes the national grey, thinner (ratio <= 0.7).
- Mixed-NUTS styling (`styleMixedNUTS` and its ps/composition/bivariate twins) copies each region's
  *computed* stroke inline, freezing whatever CSS applied at that moment; `applyBorderModeClasses`
  clears it when a mode is switched on a built map. Anything else that restyles borders via CSS
  classes after build has to do the same.
- `ps-background.js` writes id-specific fill rules (`#svgId.em--ps ...`) that beat any class rule,
  so it writes separate light and `.em--dark` variants.
- `package-lock.json` is committed and is the build toolchain: it reproduces the committed bundles (first the 4.14.1 ones, re-checked on 4.15.0 + later source in 2026-11)
  (`build/eurostatmap.min.js` and its map byte for byte, third-party code in `build/eurostatmap.js`
  with zero diff). Install with `npm ci` (never a bare `npm install`, which re-resolves `^` ranges
  and changes the bundles with no source change). Playwright is locked to the version whose browser
  is installed on the maintainer's machine. Refresh or bump deliberately, see "Toolchain and
  lockfile" in `docs/release-flow.md`.

## Coding & Documentation Standards
* Keep existing JSDoc comments intact and make sure they are accurate.
* Maintain existing formatting standards defined in `.prettierrc`.
* Do not leave active console logging statements or unfinished debugger codes in production files.

## CI, errors, accessibility

- `.github/workflows/ci.yml` runs `npm ci`, the type check, both builds, a check that the committed `build/` matches `src/`
  (line endings ignored) and `npm test`. A red "bundles match" step means a bundle was not rebuilt.
- `npm run check:declarations` compiles `src/types` without `skipLibCheck`, which hides errors in `.d.ts` files.
- Nothing may touch `window`/`document` while a module loads: the package must import in Node
  (`test/integration/node-import.test.mjs`).
- A new legend option has to be in `LEGEND_OPTIONS` (`core/option-check.js`), or a near-identical name is reported as
  misspelt; a unit test checks the typed ones.
- Failures reach the caller through `reportMapError` (`core/errors.js`, `map.onError()`); a new thing that can fail
  should use it. A new clickable SVG control uses `makeButtonAccessible` (`core/accessibility.js`). Region keyboard
  navigation drives the regions' own `mouseover`/`mouseout` handlers, so it works for any map type that has them; flow
  maps use the handlers inside `.em-flow-container`, and legends any element with `mouseover`, `mouseenter` or
  `mousemove` handlers (give an item without text an `__emName` property, which is not serialised). axe-core runs in
  `test/e2e/accessibility-errors.test.mjs`; the screen reader check is manual (`test/manual/accessibility-screen-reader.md`).
- Attributes added to the map DOM change the inset and smoke baselines: first show that only those attributes differ,
  then recapture.

## Where things live (split in 2026-11)

- `core/stat-map.js`: map lifecycle (build, updates, legends). `stat()`/`statData()` and category datasets are in
  `core/stat-api.js`; `buildSingleLayerMap` is in `core/single-layer-map.js`. Map setters are in `core/map-instance.js`;
  building the svg template and loading geometry is in `core/map-template.js`.
- Coxcomb: numbers in `composition/coxcomb-data.js`, hover in `coxcomb-interactions.js`. Bivariate legend call-outs and
  highlight: `legend/choropleth/bivariate-annotations.js`, `bivariate-highlight.js`. Default country labels:
  `core/decoration/default-labels.js`.
- When moving code out of a closure, check for undefined names (`tsc --allowJs --checkJs`, filter TS2304) and run the
  snapshot tests: a missed closure variable only fails at run time.

## Examples use Eurostat UI components and the shared settings panel

An example's settings (dropdowns, radios, sliders, checkboxes) go in the shared side panel,
`examples/vendor/example-panel.js` (+ `.css`), not in bare browser widgets: `createPanel({ map: '#map' })`
puts a panel beside the map (below it on narrow screens) with `select`, `radio`, `range`, `checkbox` and `add`
(custom content). Usage is documented at the top of the file; see
`examples/choropleth/eurostat-colour-palettes.html`. Under the hood: `<ewc-singleselect>` for dropdowns
(`examples/vendor/ewc-singleselect.js`, options in its `options` attribute, `option-selected` event) and the
Europa Component Library styles the Eurostat site uses for the rest
(`https://cdn1.fpfis.tech.ec.europa.eu/ecl/v4.8.0/eu/styles/ecl-eu.css`). Add a control type to the panel rather than
hand-rolling markup in an example. Not every older example has been converted yet.

## Example gallery categories

- Gallery examples can belong to multiple map-type filters. Keep `typesForPath()` in
  `examples/scripts/update-examples-manifest.js` and its generated
  `examples/scripts/example-manifest.js` output synchronized; `typeForPath()` is only the
  backward-compatible primary category.
- Keep example controls disabled until their event handlers are installed. A browser can
  interact with the gallery iframe while its external bundles are still loading. Check route
  positions in narrow frames as well as counting the rendered SVG routes.
- Keep the viewer's Examples button as a direct gallery link. Navigating inside an example
  iframe adds browser history entries, so `history.back()` can revisit the example instead.

## Story-map interactions

- On mobile, keep pointer events disabled on the overlaid `.step` and enable them on
  `.step-card` only. The step's transparent area otherwise intercepts chart and map hover.
- Set the story-map tooltip's `containerId` to its mount ID so the library can clamp its
  position to the sticky panel while the page is scrolled.
- Lay out the story chart against the smaller of the drawing clip and the CSS stage height.
  The full SVG height includes space outside the drawing clip, where axis text gets cut off.
- Keep responsive tooltip width and height caps in the CSS custom properties in
  `src/css/responsive.css`. Setting `max-width` or `max-height` directly there overrides
  the bounds used by `ensureTooltipOnScreen()`.

## Built-in IMAGE insets

- The `.insets('image')` preset renders each inset in a nested `<svg>`, unlike the RYB helper's
  `<g>` containers. Keep `.em-insets-image .em-inset { overflow: visible; }`: compact scale bars
  such as Svalbard's extend beyond the inset viewport and are otherwise silently clipped.

## Statistics Explained transport maps

- Page CSS that sets a label `fill` must not include the halo classes (`.em-label-halo`, `.em-flow-label-halo`): a filled halo is a
  second copy of the text and looks blurry. Let `exportMapToPNG()` choose the size (HD) instead of passing pixel sizes.
- PNG/SVG export keeps page CSS only for the properties listed in `applyComputedStylesToSVG` (`core/utils.js`). Something that looks right
  on the page but not in the export usually needs its property added there.
- Edition folders use the dissemination year. Map titles and data use the reference year
  in the supplied workbook. Keep legacy page URLs working when archiving an edition.
- Maritime edition roots serve the publication maps and hold their export assets. Update the
  Statistics Explained index and regenerate the example manifest when moving map pages.
- The archived maritime world-flow pages use the main `build/eurostatmap.js` bundle. The old
  Statistics Explained bundle can fail on current world geometry with an undefined `features`
  error. Flow labels use the rendered ribbons as placement obstacles. Port callouts key their
  values by port code. Check their fixed positions with real GISCO geometry, since mocked geometry
  changes the projected symbol positions.
- The 2026 extra-EU air maps share a muted regional palette in `examples/statistics-explained/transport/air/regional-palette.js`.
  When changing country groups or fills, check for duplicate country assignments and verify that groups sharing
  a border arc in the GISCO world geometry have distinct fills.
  The fills only tell region groups apart, so keep them the quietest the map can carry: light (L* ~91), chroma <= 6,
  no saturated hue (the flows use a blue/red ramp), >= ~20 L* of headroom under the lightest flow, and neighbouring
  groups >= ~5 apart in CIE76 dE. The EU hub is a neutral grey, not a blue.

- Audit each 2026 map's colour legend against its data: every class should appear on the map (the passengers change
  legend had an empty "< -5" class, so it is 5 classes now), and a colour-coded value should also be written on the map
  (air flow labels read "63.7M (+3.6%)" through the `valuesFormatter`, which receives only the value).
- Maritime partner labels (`maritime/flows/partner-labels.js`) are placed by hand through `positions`; a label must sit
  at its own flow's end, and overlapping a neighbouring flow a little is the accepted cost (Türkiye, `TR`).

## Responsive layout (read `docs/responsive.md`)

- Never decide "mobile" from `window.innerWidth`: ask `isCompact(map)` (`core/layout-profile.js`), which follows the width the
  map is drawn at (its container, or an explicit `width()`). A small iframe on a desktop is compact; IMAGE exports set an
  explicit width, so they keep the desktop layout. New features with a layout difference hang off that one function.
- Fixed pixel layout constants designed for ~800px (grid cartogram margins, legend x/y, symbol sizes) are the usual cause of
  an example looking bad on a phone: give them a compact variant (see `getGridCartogramMargins`, `legend-below.js`) and keep
  caller-set values untouched.
- An example that rebuilds with a new `map()` into the same svg (settings change) reuses the svg: anything the library leaves
  on it (viewBox, layout observer) must be keyed to the svg, not to the map instance (the `data-em-viewbox` marker).
- Examples: settings go in the shared panel (bottom sheet on phones); drop fixed `.width(...)`; on a phone fill the screen with
  `.height(() => ...)`. `view.html` hides the code panel by default on phones so the example has the whole screen.
- Zoom performance: nothing that touches the style of every map element may run per zoom event (thousands of paths: a style
  recalculation of all of them is ~50ms on a throttled phone). Strokes are frozen during a zoom (`em-zooming` class,
  `vector-effect: non-scaling-stroke`) and set once at its end (`core/zoom.js`, `freezeStrokeWidths`); per-element
  `getComputedStyle` is cached in `data-sw`/`data-fs`. Profile with CPU throttling and a trace (`UpdateLayoutTree`), not by eye.
- Check an example on a phone with Playwright (`isMobile`, 390x844) and its desktop layout, not only one of them.
- In this shell, heredocs/commands containing non-ASCII characters or quotes can fail with exit 127: write scripts with the
  Write tool and run them.

## Keep this file current for the next agent

Different agents and sessions (potentially different providers entirely) work in this repo over
time with no shared memory of each other. When you finish a task and learn something that would
have saved real time if you'd known it up front - a non-obvious bug class, a process rule the
user corrected you on, a footgun in how the build/tooling behaves - add it here (or update the
relevant existing section) before finishing, so the next agent starts with that knowledge instead
of rediscovering it. Keep additions terse and concrete (what to watch for, where to look), not a
running diary of everything that happened. If this file already covers the lesson, leave it
alone rather than restating it.
