# eurostat-map scripts

This directory contains utility, verification, and type-generation scripts used in the development and CI/CD lifecycles of the `eurostat-map` library.

---

## Script Inventory & Usage

### 1. `smoke-harness.js`
A headless Playwright-based regression test suite. It starts a local HTTP server on port `8765`, loads a list of cherry-picked examples, intercepts Eurostat API calls with offline mock responses, and verifies that the maps build and render correctly.

- **Verification Mode (default):**
  Loads all examples in headless Chromium, verifies that `onBuild` triggers without console or page errors, and asserts that the serialized SVG markup matches the stored baselines in `test/baselines/`.
  ```bash
  node scripts/smoke-harness.js
  ```
- **Capture Mode:**
  Captures the current SVG DOM structures and saves them as the new expected baselines inside `test/baselines/`. Run this when you have deliberately changed map/legend styles or layout structures.
  ```bash
  node scripts/smoke-harness.js --capture
  ```
- **Run All Examples:**
  Runs the harness over all examples in the repository manifest instead of just the cherry-picked subset.
  ```bash
  node scripts/smoke-harness.js --all
  ```

---

### 2. `generate-inventory.js`
Scans the HTML files in the `examples/` folder, detects which map and layer types are instantiated in each, and outputs the manifest file: `examples/_inventory.json`.
```bash
node scripts/generate-inventory.js
```

---

### 3. `update-types.js`
A static analysis script that reads legend option keys from `src/legend/` javascript implementations and automatically synchronizes them into the respective `.d.ts` TypeScript definitions located in `src/types/legend/`.
```bash
node scripts/update-types.js
```

---

### 4. `check-legend-config-sync.js`
A validation script that checks if the TypeScript legend configurations in `src/types/legend/` are fully in sync with the Javascript options in `src/legend/`. This is automatically run as a gate in the `type-check` script.
```bash
node scripts/check-legend-config-sync.js
```
