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
