const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const EXAMPLES_DIR = path.join(ROOT, 'examples')
const MANIFEST_PATH = path.join(__dirname, 'example-manifest.js')

function toPosix(filePath) {
    return filePath.split(path.sep).join('/')
}

function collectExampleHtmlFiles(dirPath) {
    let out = []

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const absPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
            out = out.concat(collectExampleHtmlFiles(absPath))
            continue
        }

        if (!entry.isFile() || !entry.name.endsWith('.html')) continue

        const relPath = toPosix(path.relative(EXAMPLES_DIR, absPath))
        if (relPath === 'index.html') continue

        out.push(relPath)
    }

    return out
}

function stringifyPaths(paths) {
    return paths.map((p) => `        '${p}',`).join('\n')
}

function buildManifestContent(paths) {
    return `;(function (root, factory) {
    const manifest = factory()

    if (typeof module === 'object' && module.exports) {
        module.exports = manifest
    }

    root.eurostatMapExamples = manifest
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const paths = [
${stringifyPaths(paths)}
    ]

    const previewPathFor = (examplePath) => './img/previews/' + examplePath.replace(/\\.html$/, '.png')

    const legacyPreviewPathFor = (examplePath) => {
        const basename = examplePath.split('/').pop() || ''
        return './img/previews/' + basename.replace(/\\.html$/, '.png')
    }

    const isShowcasePath = (examplePath) =>
        !examplePath.startsWith('statistics-explained/') &&
        !examplePath.startsWith('RYB/') &&
        !examplePath.startsWith('ur/') &&
        !examplePath.startsWith('CCM/')

    const typeForPath = (examplePath) => {
        if (examplePath.startsWith('bar-chart/')) return 'Bar Chart'
        if (examplePath.startsWith('bivariate/')) return 'Bivariate'
        if (examplePath.startsWith('cartogram/')) return 'Cartogram'
        if (examplePath.startsWith('cartograms/')) return 'Cartogram'
        if (examplePath.startsWith('categorical/')) return 'Categorical'
        if (examplePath.startsWith('CCM/')) return 'Country Comparison'
        if (examplePath.startsWith('choropleth/')) return 'Choropleth'
        if (examplePath.startsWith('coxcomb/')) return 'Coxcomb'
        if (examplePath.startsWith('dot-density/')) return 'Dot Density'
        if (examplePath.startsWith('flow/')) return 'Flow Map'
        if (examplePath.startsWith('miscellaneous/')) return 'Miscellaneous'
        if (examplePath.startsWith('mushroom/')) return 'Mushroom'
        if (examplePath.startsWith('pie-charts/')) return 'Pie Charts'
        if (examplePath.startsWith('proportional/')) return 'Proportional'
        if (examplePath.startsWith('RYB/')) return 'RYB'
        if (examplePath.startsWith('sparklines/')) return 'Sparklines'
        if (examplePath.startsWith('statistics-explained/')) return 'Statistics Explained'
        if (examplePath.startsWith('stripe/')) return 'Stripe'
        if (examplePath.startsWith('trivariate/')) return 'Trivariate'
        if (examplePath.startsWith('ur/')) return 'Urban-Rural'
        if (examplePath.startsWith('waffle/')) return 'Waffle'
        return 'Other'
    }

    return {
        paths,
        previewPathFor,
        legacyPreviewPathFor,
        isShowcasePath,
        typeForPath,
    }
})
`
}

function safeLoadCurrentPaths() {
    try {
        // Remove from module cache so reruns in the same node process stay fresh.
        delete require.cache[require.resolve('./example-manifest')]
        const current = require('./example-manifest')
        return Array.isArray(current.paths) ? current.paths : []
    } catch {
        return []
    }
}

function main() {
    const currentPaths = safeLoadCurrentPaths()
    const nextPaths = collectExampleHtmlFiles(EXAMPLES_DIR).sort((a, b) => a.localeCompare(b))

    const currentSet = new Set(currentPaths)
    const nextSet = new Set(nextPaths)

    const added = nextPaths.filter((p) => !currentSet.has(p))
    const removed = currentPaths.filter((p) => !nextSet.has(p))

    const nextContent = buildManifestContent(nextPaths)
    fs.writeFileSync(MANIFEST_PATH, nextContent, 'utf8')

    console.log(`[update-examples-manifest] Wrote ${nextPaths.length} paths to examples/scripts/example-manifest.js`)
    if (added.length > 0) console.log('[update-examples-manifest] Added:\n' + added.join('\n'))
    if (removed.length > 0) console.log('[update-examples-manifest] Removed:\n' + removed.join('\n'))
    if (added.length === 0 && removed.length === 0) console.log('[update-examples-manifest] No path changes detected.')
}

main()
