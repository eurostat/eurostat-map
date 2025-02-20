const path = require('path')
const webpack = require('webpack')
const packageJson = require('../package.json')
const TerserPlugin = require('terser-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

// analyze the bundle size
module.exports = {
    mode: 'production',
    entry: ['./src/index.js'],
    output: {
        filename: '[name].min.js', // Dynamic naming for entry points
        chunkFilename: '[name].[contenthash].js', // Dynamic naming for split chunks
        path: path.resolve(__dirname, '../build'),
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/',
    },
    devtool: false,
    plugins: [
        new BundleAnalyzerPlugin(),
        new webpack.BannerPlugin({
            banner: `/*! eurostat-map v${packageJson.version} | ${new Date().getFullYear()} Eurostat | EUPL License. See https://github.com/eurostat/eurostat-map/blob/master/LICENSE */`,
            raw: false, // Adds the comment as plain text
        }),
    ],
    optimization: {
        minimize: true,
        concatenateModules: false, // Disable scope hoisting for better analysis
        minimizer: [
            new TerserPlugin({
                extractComments: false, // Disable extracting comments to a separate file
            }),
        ],
        splitChunks: {
            chunks: 'all', // Split vendor and app code
        },
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
                use: ['style-loader', 'css-loader'], // For CSS files
            },
        ],
    },
    watch: false,
}
