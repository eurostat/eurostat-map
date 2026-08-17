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
- If source under `src/` changed, rebuild the bundle (`npm run build-prod`, and the dev
  bundle via `npx webpack --config webpack/webpack.config.dev.js --no-watch` if
  `build/eurostatmap.js` is also tracked as changed) and include the updated `build/`
  output in the same commit.
- Push after committing — don't leave commits local-only.

## Release process: version bumps and npm publish need explicit sign-off

**Before running any release step (version bump, `npm publish`, git tag, or GitHub Release),
read `docs/release-flow.md` in full and follow it end-to-end.** It is the authoritative,
step-by-step release procedure (preflight checks, build-both-bundles, commit/tag/push order,
the single confirmation required before `npm publish` - which also covers creating the GitHub
Release, since the two always happen together and don't need separate asks - post-publish
verification, and release-notes structure) - the summary below is not a substitute for it and
omits steps (e.g. creating and pushing the git tag, and the GitHub Release) that
`docs/release-flow.md` requires. Skipping it produces a real gap: e.g. a version published to npm
with no matching git tag ever created.

This package is consumed by `image` (the sibling repo at `c:\Github\image\image`, dependency
`eurostat-map` in its `package.json`) and possibly other consumers, so releases are not casual:

- **Never run `npm publish` without first getting explicit go-ahead from the user in that
  specific instance** — do every other release-flow step autonomously (bump version, rebuild,
  update `docs/release-notes.md`, commit, push), but stop and ask before the actual publish,
  even mid-workflow in an established release flow, and even if the user already approved the
  underlying change.
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

## Known bug class: confusing the shared layer with the current map/inset instance

Several real bugs here (fixed 2026-07-29: issues ESTAT/image#379 and #380) came from the same
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
dropdown, issue ESTAT/image#176) should leave `nutsLevel('mixed')` alone and only change the
`geoLevel` stat filter on refetch - `styleMixedNUTS`/`styleMixedNUTSRegions` already show exactly
the regions that end up with a classified/sized value from whatever data was just fetched.

## Layer decorators and map services

- Every public `MapType` alias must be registered in `core/layer-registry.js` by its module and
  constructed through `buildSingleLayerMap`; add a registry-enumeration test when adding a type.
- Real layers inherit live map services through the forwarding prototype built by `createLayer`.
  Keep thematic state as own properties on the layer; do not copy map state into decorators.
- `stat()` and `statData()` remain map-owned to avoid map-to-layer forwarding recursion. A layer
  that needs to expand a special one-object stat config (spark's `dates`, for example) must expose
  an own `handleStatConfig` hook; do not override `layer.stat()` and expect the public map facade
  to call it.

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
* **Production Build**: `cmd /c npm run build-prod` (copies typings and builds output to `build/`)
* **Local Test Server**: `cmd /c npm run server`
* **Format Files**: `cmd /c npm run format` (runs Prettier)

## Coding & Documentation Standards
* Keep existing JSDoc comments intact and make sure they are accurate.
* Maintain existing formatting standards defined in `.prettierrc`.
* Do not leave active console logging statements or unfinished debugger codes in production files.

## Keep this file current for the next agent

Different agents and sessions (potentially different providers entirely) work in this repo over
time with no shared memory of each other. When you finish a task and learn something that would
have saved real time if you'd known it up front - a non-obvious bug class, a process rule the
user corrected you on, a footgun in how the build/tooling behaves - add it here (or update the
relevant existing section) before finishing, so the next agent starts with that knowledge instead
of rediscovering it. Keep additions terse and concrete (what to watch for, where to look), not a
running diary of everything that happened. If this file already covers the lesson, leave it
alone rather than restating it.
