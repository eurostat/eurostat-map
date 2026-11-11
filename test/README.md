# Tests

| Folder         | What it holds                                                                                 | Runs against           | Command                                      |
| -------------- | --------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| `unit/`        | Fast tests of single source modules (pure functions, data handling). No browser, no build.    | `src/`                 | `npm run test:unit`                          |
| `integration/` | Tests of the public API of the built library, in Node with a minimal DOM shim.                | `build/eurostatmap.js` | `npm run test:integration`                   |
| `e2e/`         | Headless Chromium (Playwright) tests that render real maps, plus their baselines.             | `build/eurostatmap.js` | `npm run test:e2e`                           |
| `types/`       | TypeScript usage of the public typings, compiled by `npm run type-check`.                     | `src/types/`           | `npm run type-check`                         |
| `manual/`      | HTML pages to open in a browser and check by eye. Not run by any command.                     | `build/eurostatmap.js` | `npm run server`, then open `/test/manual/…` |
| `helpers/`     | Shared test support: the source loader for unit tests and the DOM shim for integration tests. |                        |                                              |

`npm test` runs unit, integration and e2e, in that order. On Windows use `cmd /c npm test`.

Integration, e2e and manual tests use the **dev bundle**, so rebuild it first:
`npx webpack --config webpack/webpack.config.dev.js --no-watch`. Unit tests need no build.

## Unit tests

Unit tests use Node's built-in runner (`node:test`, `node:assert/strict`), so there is nothing to install.
They mirror the layout of `src/`: `src/core/utils.js` is tested by `test/unit/core/utils.test.mjs`.

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { roundToNiceNumber } from '../../../src/core/utils.js'

describe('nice class thresholds', () => {
    it('roundToNiceNumber never leaves the data range', () => {
        assert.equal(roundToNiceNumber(960, 0, 500), 500)
    })
})
```

Run one file with
`node --import ./test/helpers/register-src.mjs --test test/unit/core/utils.test.mjs`,
or filter by name with `--test-name-pattern "nice"`.

The source is written for webpack (extensionless imports, CSS and JSON imports), so it cannot be imported by
Node as it is. `helpers/register-src.mjs` registers resolution hooks that make it importable; it needs
Node 22.15 or later.

What belongs here:

- Functions that take values and return values: formatting, classification, scales, colour maths, URL building.
- Data handling with the network stubbed (`globalThis.fetch`), as in `unit/core/stat-data.test.mjs`.

What does not:

- Anything that needs a real DOM, layout or CSS (a module that touches `window` or `document` when it is
  imported cannot be loaded here). Test it through the built library in `integration/`, or in a browser in `e2e/`.
- If a function is hard to unit test because the logic is buried in DOM code, move the logic into a pure
  function and test that.

## Integration tests

Plain Node scripts that import `build/eurostatmap.js` after `helpers/dom-shim.js`, and exercise the public API
(`eurostatmap.map(...)`). Name them `*.test.mjs`; they are picked up automatically.

## End-to-end tests

- `e2e/kosovo-border.test.mjs` measures border prominence per map type and border mode
  (`--verbose`, `--mode <name>`).
- `e2e/inset-regression.test.mjs` renders a matrix of map configurations and compares the serialised DOM
  with `e2e/baselines/inset-regression.json.gz` (`--capture` to rewrite it, `--only <substring>`,
  `--against <build dir>` to compare two builds).
- `e2e/baselines/*.txt` belong to `node scripts/smoke-harness.js`, which renders examples from `examples/`.

They are offline (synthetic geometry and data) and need Playwright's Chromium:
`npx playwright install chromium`. New e2e tests have to be added to the `test:e2e` script.

## Manual pages

`manual/` holds the ad hoc pages that used to sit at the top of `test/`: one page per feature
(`test_*.html`), per map type (`map-types/`), legends, insets (`IMAGE/`), custom data, and so on.
They load `build/eurostatmap.js` by relative path, so they work from the dev server and from GitHub Pages.
A page that guards against a regression worth keeping should become an automated test instead.
