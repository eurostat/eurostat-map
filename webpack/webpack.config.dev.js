// dev
const path = require('path')
const packageJson = require('../package.json')
const LiveReloadPlugin = require('webpack-livereload-plugin')
const webpack = require('webpack')

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'eurostatmap.js',
        path: path.resolve(__dirname, '../build'), // This moves the output to the parent folder's 'build' directory
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/', // Optional: if resources are served from this path
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'], // For CSS files
            },
        ],
    },
    plugins: [
        new LiveReloadPlugin(),
        new webpack.DefinePlugin({
            VERSION: JSON.stringify(packageJson.version),
        }),
    ],
    watch: true,
    devtool: 'inline-source-map',
}
