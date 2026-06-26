const http = require('http');
const fs = require('fs');
const path = require('path');
const { paths } = require('../examples/scripts/example-manifest');

// ── Configuration ────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;
const BASELINE_DIR = path.join(ROOT, 'test', 'baselines');

let playwright;
try {
    playwright = require('playwright');
} catch (err) {
    console.error('Playwright not found, please install it: npm install --save-dev playwright');
    process.exit(1);
}

// ── Static File Server ────────────────────────────────────────────────────────
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
};

function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const urlPath = req.url.split('?')[0];
            const filePath = path.join(ROOT, urlPath);

            if (!filePath.startsWith(ROOT)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found: ' + urlPath);
                    return;
                }
                const ext = path.extname(filePath).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                res.end(data);
            });
        });

        server.on('error', reject);
        server.listen(PORT, '127.0.0.1', () => {
            resolve(server);
        });
    });
}

// ── Mock Data Generators (Offline Fallback) ──────────────────────────────────
function generateMockJSONstat(urlStr) {
    let url;
    try {
        url = new URL(urlStr);
    } catch (e) {
        url = { searchParams: new Map() };
    }
    const params = url.searchParams;
    
    const dims = {};
    const id = [];
    const size = [];
    
    // Add other dimensions from query parameters, using lowercase keys
    for (const [key, val] of params.entries()) {
        if (key === 'format' || key === 'lang') continue;
        const lowerKey = key.toLowerCase();
        if (!dims[lowerKey]) {
            dims[lowerKey] = [];
        }
        dims[lowerKey].push(val);
    }
    
    // Always ensure time is present
    if (!dims['time']) {
        dims['time'] = ['2021'];
    }
    
    // Always ensure geo is present
    if (!dims['geo']) {
        dims['geo'] = ['FR', 'DE', 'ES', 'IT', 'PT', 'PL', 'RO', 'NL', 'BE', 'DK', 'SE', 'FI', 'IE', 'GR', 'AT', 'HU', 'CZ', 'SK', 'BG', 'HR', 'EE', 'LV', 'LT', 'SI', 'CY', 'MT', 'LU', 'IS', 'NO', 'CH', 'LI', 'UK', 'TR'];
        // Add some sub-regions
        dims['geo'].push('FR10', 'FR101', 'ITC4', 'ITC4C');
    }
    
    const dimensionObj = {};
    for (const dim in dims) {
        const categories = [...new Set(dims[dim])];
        id.push(dim);
        size.push(categories.length);
        
        const category = {
            index: {},
            label: {}
        };
        categories.forEach((cat, idx) => {
            category.index[cat] = idx;
            category.label[cat] = cat;
        });
        
        dimensionObj[dim] = {
            label: dim,
            category
        };
    }
    
    const totalValues = size.reduce((a, b) => a * b, 1);
    const value = Array.from({ length: totalValues }, (_, i) => 10 + (i % 90));
    
    return {
        version: "2.0",
        class: "dataset",
        label: "Mock Dataset",
        source: "Eurostat Mock",
        updated: "2026-06-26",
        id,
        size,
        dimension: dimensionObj,
        value
    };
}

function generateMockCentroids() {
    const regions = ['FR', 'DE', 'ES', 'IT', 'PT', 'PL', 'RO', 'NL', 'BE', 'DK', 'SE', 'FI', 'IE', 'GR', 'AT', 'HU', 'CZ', 'SK', 'BG', 'HR', 'EE', 'LV', 'LT', 'SI', 'CY', 'MT', 'LU', 'IS', 'NO', 'CH', 'LI', 'UK', 'TR', 'FR10', 'FR101', 'ITC4', 'ITC4C'];
    const features = regions.map(id => ({
        type: "Feature",
        id: id,
        properties: { id, name: id },
        geometry: {
            type: "Point",
            coordinates: [10, 50]
        }
    }));
    return {
        type: "FeatureCollection",
        features
    };
}

function generateMockTopoJSON(urlStr) {
    const regions = ['FR', 'DE', 'ES', 'IT', 'PT', 'PL', 'RO', 'NL', 'BE', 'DK', 'SE', 'FI', 'IE', 'GR', 'AT', 'HU', 'CZ', 'SK', 'BG', 'HR', 'EE', 'LV', 'LT', 'SI', 'CY', 'MT', 'LU', 'IS', 'NO', 'CH', 'LI', 'UK', 'TR', 'FR10', 'FR101', 'ITC4', 'ITC4C'];
    
    const geometries = regions.map(id => {
        return {
            type: "Polygon",
            arcs: [[0]],
            properties: { id, name: id }
        };
    });
    
    const objects = {};
    const objectKeys = ['nutsrg', 'cntrg', 'nutsbn', 'cntbn', 'gra', 'worldrg', 'worldbn', 'CNTR_RG_20M_2020_4326', 'CNTR_BN_20M_2020_4326', 'NUTS_BN_20M_2021_RS_XK_border', 'nutspt'];
    
    objectKeys.forEach(key => {
        objects[key] = {
            type: "GeometryCollection",
            geometries: key !== 'nutspt' ? geometries : []
        };
    });
    
    return {
        type: "Topology",
        bbox: [0, 40, 30, 60], // Europe approx bbox
        transform: { "scale": [1, 1], "translate": [0, 0] },
        objects,
        arcs: [
            [[0, 40], [0, 60], [30, 60], [30, 40], [0, 40]]
        ]
    };
}

// ── Masking Random Identifiers ──────────────────────────────────────────────
function maskRandomIds(htmlString) {
    return htmlString
        .replace(/id="em-layer-layer[^"]+"/g, 'id="em-layer-layer-MASKED"')
        .replace(/id="em-layer-[^"]+"/g, 'id="em-layer-MASKED"')
        .replace(/id="[^"]*legend[^"]*"/g, 'id="legend-MASKED"')
        .replace(/id="[^"]*inset[^"]*"/g, 'id="inset-MASKED"')
        .replace(/id="em-drawing-[^"]+"/g, 'id="em-drawing-MASKED"')
        .replace(/id="em-zoom-group-[^"]+"/g, 'id="em-zoom-group-MASKED"')
        .replace(/#em-zoom-group-[^)]+/g, '#em-zoom-group-MASKED')
        .replace(/#em-drawing-[^)]+/g, '#em-drawing-MASKED')
        .replace(/clip-path="url\(#[^)]+\)"/g, 'clip-path="url(#clip-path-MASKED)"')
        .replace(/id="clip-[^"]+"/g, 'id="clip-MASKED"')
        .replace(/id="[^"]*-\d+(\.\d+)?"/g, (match) => {
            return match.replace(/-\d+(\.\d+)?/g, '-MASKED');
        });
}

// ── Main Execution ────────────────────────────────────────────────────────────
async function run() {
    const isCapture = process.argv.includes('--capture');
    
    if (isCapture) {
        fs.mkdirSync(BASELINE_DIR, { recursive: true });
        console.log('Capturing baselines...');
    } else {
        console.log('Verifying against baselines...');
        if (!fs.existsSync(BASELINE_DIR)) {
            console.error(`Baseline directory does not exist. Run "node scripts/smoke-harness.js --capture" first.`);
            process.exit(1);
        }
    }

    const server = await startServer();
    const browser = await playwright.chromium.launch({ headless: true });
    
    const examples = paths.filter(p => p !== 'index.html');
    let passed = 0;
    let failed = 0;

    for (const example of examples) {
        const url = `http://127.0.0.1:${PORT}/examples/${example}`;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(`[Console Error] ${msg.text()}`);
            }
        });
        page.on('pageerror', err => {
            consoleErrors.push(`[Page Error] ${err.stack || err.message}`);
        });

        // Setup offline request routing/interception
        await page.route('**/*', async (route) => {
            const reqUrl = route.request().url();
            const lowerUrl = reqUrl.toLowerCase();
            if (lowerUrl.includes('dissemination/statistics')) {
                const mock = generateMockJSONstat(reqUrl);
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mock)
                });
            } else if (lowerUrl.includes('nutspt_') || lowerUrl.includes('centroids')) {
                const mock = generateMockCentroids();
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mock)
                });
            } else if (lowerUrl.includes('nuts2json') || lowerUrl.includes('world_4326.json') || lowerUrl.includes('assets/estat/')) {
                const mock = generateMockTopoJSON(reqUrl);
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mock)
                });
            } else if (reqUrl.includes('unpkg.com/eurostat-map')) {
                const content = fs.readFileSync(path.join(ROOT, 'build', 'eurostatmap.js'), 'utf8');
                await route.fulfill({
                    status: 200,
                    contentType: 'application/javascript',
                    body: content
                });
            } else if (reqUrl.includes('raw.githubusercontent.com/eurostat/eurostat-map/')) {
                const parts = reqUrl.split('raw.githubusercontent.com/eurostat/eurostat-map/');
                const branchAndPath = parts[1];
                const relativePath = branchAndPath.substring(branchAndPath.indexOf('/') + 1);
                const filePath = path.join(ROOT, relativePath);
                if (fs.existsSync(filePath)) {
                    await route.fulfill({
                        status: 200,
                        contentType: relativePath.endsWith('.csv') ? 'text/csv' : 'application/json',
                        body: fs.readFileSync(filePath)
                    });
                } else {
                    await route.continue();
                }
            } else {
                await route.continue();
            }
        });

        // Inject hook script to track map build lifecycle
        await page.addInitScript(() => {
            window.activeMapsCount = 0;
            window.builtMapsCount = 0;
            
            // Intercept and stub D3 transition logic to bypass delay/durations
            let _d3;
            Object.defineProperty(window, 'd3', {
                configurable: true,
                get() { return _d3; },
                set(val) {
                    _d3 = val;
                    if (_d3 && _d3.selection && !_d3.selection.prototype.__transitionMocked) {
                        _d3.selection.prototype.__transitionMocked = true;
                        _d3.selection.prototype.transition = function() {
                            const self = this;
                            const proxy = new Proxy(self, {
                                get(target, prop) {
                                    if (['duration', 'delay', 'ease', 'selection', 'transition', 'tween', 'on', 'active'].includes(prop)) {
                                        return function() { return proxy; };
                                    }
                                    return target[prop];
                                }
                            });
                            return proxy;
                        };
                    }
                }
            });
            
            window.addEventListener('DOMContentLoaded', () => {
                const style = document.createElement('style');
                style.innerHTML = `
                    * {
                        transition: none !important;
                        transition-duration: 0s !important;
                        animation: none !important;
                        animation-duration: 0s !important;
                    }
                `;
                document.head.appendChild(style);
            });
            
            Object.defineProperty(window, 'eurostatmap', {
                configurable: true,
                get() {
                    const target = window._eurostatmap;
                    if (!target) return target;
                    return new Proxy(target, {
                        get(obj, prop) {
                            if (prop === 'map') {
                                return function(...args) {
                                    window.activeMapsCount++;
                                    const mapInstance = obj.map.apply(obj, args);
                                    const originalBuild = mapInstance.build;
                                    if (typeof originalBuild === 'function') {
                                        mapInstance.build = function() {
                                            const originalOnBuild = mapInstance.onBuild();
                                            mapInstance.onBuild(function(m) {
                                                window.builtMapsCount++;
                                                if (originalOnBuild) originalOnBuild(m);
                                            });
                                            return originalBuild.apply(this, arguments);
                                        };
                                    }
                                    return mapInstance;
                                };
                            }
                            return obj[prop];
                        }
                    });
                },
                set(val) {
                    window._eurostatmap = val;
                }
            });
        });

        try {
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            
            // Wait for maps to load and build
            await page.waitForFunction(() => {
                return window.activeMapsCount > 0 && window.builtMapsCount === window.activeMapsCount;
            }, { timeout: 15000 });

            // Wait for transitions and layout to settle
            await page.waitForTimeout(2000);

            if (consoleErrors.length > 0) {
                const genuineErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('logo.png'));
                if (genuineErrors.length > 0) {
                    throw new Error(genuineErrors.join('\n'));
                }
            }

            // Assert presence of zoom group
            const zoomGroupExists = await page.evaluate(() => {
                return !!document.querySelector('[id^="em-zoom-group-"]');
            });
            if (!zoomGroupExists) {
                throw new Error('Zoom group (em-zoom-group-*) not found in DOM.');
            }

            // Extract serialized outerHTML of the SVG map(s)
            const serialized = await page.evaluate(() => {
                const svgs = Array.from(document.querySelectorAll('svg'));
                return svgs.map(svg => svg.outerHTML).join('\n');
            });

            const masked = maskRandomIds(serialized);
            const baselinePath = path.join(BASELINE_DIR, example.replace(/\//g, '_') + '.txt');

            if (isCapture) {
                fs.writeFileSync(baselinePath, masked, 'utf8');
                passed++;
                console.log(`  ✓ Captured baseline for: ${example}`);
            } else {
                if (!fs.existsSync(baselinePath)) {
                    throw new Error(`Baseline file not found: ${baselinePath}`);
                }
                const baselineContent = fs.readFileSync(baselinePath, 'utf8');
                if (masked !== baselineContent) {
                    let diffIndex = -1;
                    for (let i = 0; i < Math.max(masked.length, baselineContent.length); i++) {
                        if (masked[i] !== baselineContent[i]) {
                            diffIndex = i;
                            break;
                        }
                    }
                    console.error(`      Mismatch at char index: ${diffIndex}`);
                    console.error(`      Masked (new):  ...${(masked || '').substring(Math.max(0, diffIndex - 50), diffIndex + 50)}...`);
                    console.error(`      Base (old):    ...${(baselineContent || '').substring(Math.max(0, diffIndex - 50), diffIndex + 50)}...`);
                    throw new Error(`DOM structure mismatch against baseline.`);
                }
                passed++;
                console.log(`  ✓ Passed: ${example}`);
            }
        } catch (err) {
            failed++;
            console.error(`  ✗ Failed: ${example}`);
            console.error(`    Reason: ${err.message}`);
            try {
                const counts = await page.evaluate(() => ({
                    active: window.activeMapsCount,
                    built: window.builtMapsCount
                }));
                console.error(`    Counts on failure:`, counts);
            } catch (evalErr) {
                console.error(`    Failed to evaluate counts:`, evalErr.message);
            }
        } finally {
            await page.close();
            await context.close();
        }
    }

    await browser.close();
    server.close();

    console.log(`\nSmoke Harness Done. Passed: ${passed}, Failed: ${failed}.`);
    if (failed > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
