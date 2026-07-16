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
