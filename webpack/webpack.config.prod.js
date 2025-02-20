const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const packageJson = require('../package.json')

module.exports = {
    mode: 'production',
    entry: ['./src/index.js'],
    output: {
        filename: 'eurostatmap.min.js',
        path: path.resolve(__dirname, '../build'),
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/',
    },
    devtool: false,
    plugins: [
        new webpack.BannerPlugin({
            banner: `/*! eurostat-map v${packageJson.version} | ${new Date().getFullYear()} Eurostat | EUPL License. See https://github.com/eurostat/eurostat-map/blob/master/LICENSE */`,
            raw: false,
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                        pure_funcs: ['console.log'],
                    },
                    output: {
                        comments: false, // ✅ Remove JS comments
                    },
                    mangle: true,
                },
            }),
            new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: ['default'],
                },
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        babelrc: false,
                        cacheDirectory: true,
                        sourceMaps: false,
                    },
                },
            },
            {
                test: /\.css$/i,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            injectType: 'singletonStyleTag', // ✅ Combine styles into a single <style> tag
                        },
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: false, // ✅ No source maps for production
                        },
                    },
                ],
            },
        ],
    },
    watch: false,
}
