/**
 * generate-previews.js
 *
 * Generates preview screenshots for every HTML example in /examples/
 * and saves them as PNG files mirroring the example tree under /examples/img/previews/.
 *
 * Usage:
 *   node scripts/generate-previews.js
 *
 * Prerequisites (one-time):
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * Options (env vars):
 *   PREVIEW_WIDTH  - viewport width  (default: 1200)
 *   PREVIEW_HEIGHT - viewport height (default: 750)
 *   PREVIEW_WAIT   - extra ms to wait after network idle for D3 to finish rendering (default: 4000)
 *   PREVIEW_PORT   - local server port (default: 8765)
 *   PREVIEW_ONLY   - comma-separated example paths or basenames to process (e.g. basic,flow/flowmap)
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { paths, previewPathFor } = require('./example-manifest')

// ── Config ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..')
const EXAMPLES_DIR = path.join(ROOT, 'examples')
const OUT_DIR = path.join(EXAMPLES_DIR, 'img', 'previews')

const WIDTH = parseInt(process.env.PREVIEW_WIDTH || '1200', 10)
const HEIGHT = parseInt(process.env.PREVIEW_HEIGHT || '750', 10)
const EXTRA_WAIT = parseInt(process.env.PREVIEW_WAIT || '4000', 10)
const PORT = parseInt(process.env.PREVIEW_PORT || '8765', 10)
const ONLY = process.env.PREVIEW_ONLY ? process.env.PREVIEW_ONLY.split(',').map((s) => s.trim()) : null

// MIME types for static server
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
}

// ── Playwright check ──────────────────────────────────────────────────────────
let playwright
try {
    playwright = require('playwright')
} catch {
    console.error('\n  playwright is not installed.\n')
    console.error('  Run these once to set it up:')
    console.error('    npm install --save-dev playwright')
    console.error('    npx playwright install chromium\n')
    process.exit(1)
}

// ── Collect example files from the shared manifest ───────────────────────────
const examples = paths.filter((examplePath) => {
    if (examplePath === 'index.html') return false
    if (!ONLY) return true

    const withoutExtension = examplePath.replace(/\.html$/, '')
    const basename = path.basename(examplePath, '.html')
    return ONLY.includes(examplePath) || ONLY.includes(withoutExtension) || ONLY.includes(basename)
})

if (examples.length === 0) {
    console.error('No example HTML files found in', EXAMPLES_DIR)
    process.exit(1)
}

console.log(`\nFound ${examples.length} example(s) to screenshot.\n`)

// ── Static HTTP server (serves from project root so relative paths work) ──────
function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            // Strip query strings
            const urlPath = req.url.split('?')[0]
            const filePath = path.join(ROOT, urlPath)

            // Security: prevent path traversal
            if (!filePath.startsWith(ROOT)) {
                res.writeHead(403)
                res.end('Forbidden')
                return
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404)
                    res.end('Not found: ' + urlPath)
                    return
                }
                const ext = path.extname(filePath).toLowerCase()
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
                res.end(data)
            })
        })

        server.on('error', reject)
        server.listen(PORT, '127.0.0.1', () => {
            console.log(`  Local server: http://127.0.0.1:${PORT}`)
            resolve(server)
        })
    })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    // Ensure output directory exists
    fs.mkdirSync(OUT_DIR, { recursive: true })

    const server = await startServer()

    const browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
    })

    let passed = 0
    let failed = 0

    for (const file of examples) {
        const url = `http://127.0.0.1:${PORT}/examples/${file}`
        const outFile = path.join(
            OUT_DIR,
            previewPathFor(file)
                .replace(/^\.\/img\/previews\//, '')
                .split('/')
                .join(path.sep)
        )

        process.stdout.write(`  [${String(passed + failed + 1).padStart(2)}/${examples.length}] ${file} ... `)

        const page = await context.newPage()
        page.on('pageerror', () => {}) // suppress console noise for failed fetches

        try {
            fs.mkdirSync(path.dirname(outFile), { recursive: true })
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
            // Strip body margin/padding so the SVG sits flush against the viewport
            await page.addStyleTag({ content: 'body { margin: 0 !important; padding: 0 !important; }' })
            // Extra wait for D3 async rendering after network idle
            await page.waitForTimeout(EXTRA_WAIT)

            // Clip to the first SVG element (the map); fall back to full viewport
            let clip = { x: 0, y: 0, width: WIDTH, height: HEIGHT }
            const svgEl = await page.$('svg')
            if (svgEl) {
                const box = await svgEl.boundingBox()
                if (box && box.width > 10 && box.height > 10) {
                    clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height }
                }
            }

            await page.screenshot({ path: outFile, clip })
            console.log('✓')
            passed++
        } catch (err) {
            console.log('✗  ' + err.message.split('\n')[0])
            failed++
        } finally {
            await page.close()
        }
    }

    await browser.close()
    server.close()

    console.log(`\n  Done. ${passed} succeeded, ${failed} failed.`)
    console.log(`  Previews saved to: ${OUT_DIR}\n`)
}

run().catch((err) => {
    console.error('\nFatal error:', err)
    process.exit(1)
})
