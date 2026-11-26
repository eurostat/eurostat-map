// The ES module build (build/eurostatmap.mjs, the package's `module` entry): the library's own code, with its
// dependencies left as imports, so that an application that already uses D3 or proj4 includes them once.
const path = require('path')
const webpack = require('webpack')
const packageJson = require('../package.json')
const { dorlingWorkerConfig, withDorlingWorker } = require('./dorling-worker')
const prod = require('./webpack.config.prod')

const dependencies = Object.keys(packageJson.dependencies)
const isDependency = (request) => dependencies.some((name) => request === name || request.startsWith(name + '/'))

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
    externals: [({ request }, callback) => (isDependency(request) ? callback(null, request) : callback())],
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
