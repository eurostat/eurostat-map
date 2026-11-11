// Lets Node import the library's source modules (src/**) directly, so unit tests can exercise
// internal functions without going through the webpack bundle.
//
// The source is written for a bundler: extensionless relative imports ('./utils'), deep imports
// without extension ('proj4/lib/core'), CSS and JSON imports, and a webpack alias for the
// Dorling worker. These hooks resolve the same specifiers the way webpack does.
//
// Usage: node --import ./test/helpers/register-src.mjs --test "test/unit/**/*.test.mjs"
// Needs Node >= 22.15 (module.registerHooks).

import { registerHooks } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = path.join(ROOT, 'src') + path.sep
const STUB = 'em-stub:'

// modules that only make sense in the bundle: replaced with an empty module
const STUBBED = new Set(['eurostat-map-dorling-worker-source'])

const isFile = (p) => {
    try {
        return fs.statSync(p).isFile()
    } catch (e) {
        return false
    }
}

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (STUBBED.has(specifier)) return { url: STUB + specifier, shortCircuit: true }

        const parent = context.parentURL && context.parentURL.startsWith('file:') ? fileURLToPath(context.parentURL) : null

        // extensionless relative import ('./utils'), in the source or in a dependency written for bundlers (proj4/lib)
        if (parent && specifier.startsWith('.') && (parent.startsWith(SRC) || parent.includes('node_modules'))) {
            const base = path.resolve(path.dirname(parent), specifier)
            if (!isFile(base)) {
                for (const candidate of [base + '.js', path.join(base, 'index.js')]) {
                    if (isFile(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true }
                }
            }
        }

        // deep import into a package without "exports", e.g. 'proj4/lib/core'
        if (parent && parent.startsWith(SRC) && /^[^.@][^/]*\/.+/.test(specifier) && !path.extname(specifier)) {
            try {
                return nextResolve(specifier + '.js', context)
            } catch (e) {
                // fall through to the default resolution
            }
        }
        return nextResolve(specifier, context)
    },

    load(url, context, nextLoad) {
        if (url.startsWith(STUB)) return { format: 'module', source: 'export default ""', shortCircuit: true }
        if (url.startsWith('file:')) {
            const file = fileURLToPath(url)
            if (file.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
            if (file.endsWith('.json') && (file.startsWith(SRC) || file === path.join(ROOT, 'package.json'))) {
                return { format: 'module', source: 'export default ' + fs.readFileSync(file, 'utf8'), shortCircuit: true }
            }
            // package.json has no "type": say outright that the source is ESM
            if (file.startsWith(SRC) && file.endsWith('.js') && !file.endsWith('.cjs.js') && !file.endsWith('.umd.js')) {
                return { format: 'module', source: fs.readFileSync(file, 'utf8'), shortCircuit: true }
            }
        }
        return nextLoad(url, context)
    },
})
