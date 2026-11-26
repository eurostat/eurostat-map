// The ES module build (build/eurostatmap.mjs, the package's `module` entry): the library's own code, with its
// dependencies left as imports, so that an application that already uses D3 or proj4 includes them once.
const path = require('path')
const webpack = require('webpack')
const packageJson = require('../package.json')
const { dorlingWorkerConfig, withDorlingWorker } = require('./dorling-worker')
const prod = require('./webpack.config.prod')

const dependencies = Object.keys(packageJson.dependencies)
const isDependency = (request) => dependencies.some((name) => request === name || request.startsWith(name + '/'))

// Two exceptions are included. proj4: the few internal modules the library takes from it import each other without file
// extensions, which Node's ES module loader rejects, and test runners load this file with Node (IMAGE's does).
// d3-svg-annotation, together with its own old D3 packages: It reads the drag position from
// d3-selection 1's global `event`, which only works while it and d3-drag 1 share one copy of d3-selection: an
// application's package manager may well install two (IMAGE's does), and annotations then cannot be dragged.
const isExternal = (request, context) => !context.includes('node_modules') && !/^(d3-svg-annotation|proj4)($|\/)/.test(request) && isDependency(request)

// the same loaders as the production build
const mainProd = prod.find((config) => config.name === 'main')

const esmConfig = {
    mode: 'production',
    entry: './src/esm.js',
    experiments: { outputModule: true },
    output: {
        filename: 'eurostatmap.mjs',
        path: path.resolve(__dirname, '../build'),
        library: { type: 'module' },
        module: true,
        chunkFormat: 'module',
    },
    externalsType: 'module',
    externals: [({ request, context }, callback) => (isExternal(request, context) ? callback(null, request) : callback())],
    resolve: { extensions: ['.js', '.ts'] },
    devtool: false,
    plugins: [
        new webpack.BannerPlugin({
            banner: `/*! eurostat-map v${packageJson.version} | Eurostat | EUPL License. See https://github.com/eurostat/eurostat-map/blob/master/LICENSE */`,
            raw: true,
        }),
    ],
    // readable output: the application's own build minifies it
    optimization: { minimize: false, concatenateModules: true },
    module: { rules: mainProd.module.rules.filter((rule) => !rule.type) },
}

module.exports = [{ ...dorlingWorkerConfig }, { ...esmConfig, ...withDorlingWorker(esmConfig) }]
