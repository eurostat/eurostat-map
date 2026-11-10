// The Dorling web worker, built on its own and embedded in the main bundle as a string.
//
// dorling.js starts it from a Blob URL. A separate worker chunk (new Worker(new URL(...))) had to be
// fetched from output.publicPath ('/build/'), which only exists on this repo's dev server: an app
// that bundles eurostat-map (e.g. IMAGE) never ships the chunk, and a page using the unpkg build
// looks for it under its own origin. Embedding it works wherever the main bundle runs.
//
// Usage in a main config: module.exports = [dorlingWorkerConfig, { ...mainConfig, ...withDorlingWorker(mainConfig) }]
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const WORKER_DIR = path.resolve(__dirname, '../node_modules/.cache/eurostat-map-dorling-worker')
const WORKER_FILE = 'dorling-worker.js'
const ALIAS = 'eurostat-map-dorling-worker-source'

// always minified: it is a string inside the bundle, nobody reads or debugs it there
const dorlingWorkerConfig = {
    name: 'dorling-worker',
    mode: 'production',
    target: 'webworker',
    entry: './src/core/dorling/dorling-worker.js',
    output: { path: WORKER_DIR, filename: WORKER_FILE, iife: true },
    devtool: false,
    optimization: { minimize: true, minimizer: [new TerserPlugin({ extractComments: false })] },
}

/** The main config's additions: build after the worker, resolve the alias to its code as a string. */
function withDorlingWorker(mainConfig) {
    return {
        name: 'main',
        dependencies: ['dorling-worker'],
        resolve: {
            ...mainConfig.resolve,
            alias: { ...(mainConfig.resolve && mainConfig.resolve.alias), [ALIAS + '$']: path.join(WORKER_DIR, WORKER_FILE) },
        },
        module: {
            ...mainConfig.module,
            rules: [{ include: path.join(WORKER_DIR, WORKER_FILE), type: 'asset/source' }, ...((mainConfig.module && mainConfig.module.rules) || [])],
        },
    }
}

module.exports = { dorlingWorkerConfig, withDorlingWorker }
