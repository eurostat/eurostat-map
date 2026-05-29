# Examples Scripts

This folder contains scripts used to keep the examples gallery and preview images up to date.

## Scripts Overview

### `update-examples-manifest.js`
Scans the `examples/` tree for `.html` files and regenerates:

- `examples/scripts/example-manifest.js`

This manifest is the single source of truth for:

- which examples exist
- each example type/category
- preview image paths

Run it when you add, rename, move, or remove example HTML files.

Command:

```bash
npm run update-examples-manifest
```

### `generate-previews.js`
Uses Playwright to open examples and generate PNG preview images under:

- `examples/img/previews/`

It reads example paths from `example-manifest.js`.

Command:

```bash
npm run generate-previews
```

### `example-manifest.js`
Auto-generated file consumed by:

- `examples/index.html` (browser gallery)
- `generate-previews.js` (Node preview generation)

Do not edit manually. Regenerate it with:

```bash
npm run update-examples-manifest
```

## Main Workflows

### Update everything (recommended)
Regenerates manifest and all previews:

```bash
npm run update-examples
```

### Update only manifest
Useful after adding/moving example files, without generating screenshots:

```bash
npm run update-examples-manifest
```

### Update only previews
Uses current manifest as input:

```bash
npm run generate-previews
```

## Generate Previews For One (or a Few) Examples

Use the `PREVIEW_ONLY` environment variable to avoid iterating through all examples.

### Git Bash / Linux / macOS

Single example by path:

```bash
PREVIEW_ONLY=misc/story-map/index.html npm run generate-previews
```

Single example by basename:

```bash
PREVIEW_ONLY=basic npm run generate-previews
```

Multiple examples (comma-separated):

```bash
PREVIEW_ONLY=basic,choropleth/EU_only.html,misc/story-map/index.html npm run generate-previews
```

### PowerShell (Windows)

```powershell
$env:PREVIEW_ONLY='misc/story-map/index.html'; npm run generate-previews
```

Reset variable after use (optional):

```powershell
Remove-Item Env:PREVIEW_ONLY
```

## Other Useful Environment Variables

`generate-previews.js` also supports:

- `PREVIEW_WIDTH` (default: `1200`)
- `PREVIEW_HEIGHT` (default: `750`)
- `PREVIEW_WAIT` (default: `4000` ms)
- `PREVIEW_PORT` (default: `8765`)

Example:

```bash
PREVIEW_ONLY=basic PREVIEW_WIDTH=1400 PREVIEW_HEIGHT=900 PREVIEW_WAIT=6000 npm run generate-previews
```

## Prerequisites

Playwright must be installed once:

```bash
npm install --save-dev playwright
npx playwright install chromium
```
