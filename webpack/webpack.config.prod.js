const path = require('path')
const packageJson = require('../package.json')
const webpack = require('webpack')

module.exports = {
    mode: 'production',
    entry: ['./src/index.js'],
    output: {
        filename: 'eurostatmap.min.js',
        path: path.resolve(__dirname, '../build'), // This moves the output to the parent folder's 'build' directory
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/', // Optional: if resources are served from this path
    },
    devtool: false,
    plugins: [
        new webpack.DefinePlugin({
            VERSION: JSON.stringify(packageJson.version),
        }),
    ],
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
    optimization: {
        usedExports: true,
        minimize: true,
    },
}
