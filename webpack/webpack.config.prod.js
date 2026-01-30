const path = require('path')
const webpack = require('webpack')
const packageJson = require('../package.json')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
    mode: 'production',
    entry: ['./src/index.js'],
    output: {
        filename: 'eurostatmap.min.js',
        path: path.resolve(__dirname, '../build'), // This moves the output to the parent folder's 'build' directory
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/', // Optional: if resources are served from this path
        //clean: true, // Clean the output directory before emit
    },
    resolve: {
        extensions: ['.js', '.ts'], // allow typescript
    },
    devtool: 'source-map',
    plugins: [
        new webpack.BannerPlugin({
            banner: `/*! eurostat-map v${packageJson.version} | ${new Date().getFullYear()} Eurostat | EUPL License. See https://github.com/eurostat/eurostat-map/blob/master/LICENSE */`,
            raw: false, // Adds the comment as plain text
        }),
    ],
    optimization: {
        runtimeChunk: false,
        splitChunks: false,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false, // Disable extracting comments to a separate file
                terserOptions: {
                    keep_fnames: true,
                    keep_classnames: true,
                },
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        babelrc: false,
                        cacheDirectory: true,
                        sourceMaps: true,
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
