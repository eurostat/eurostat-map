// dev
const path = require('path')
const { dorlingWorkerConfig, withDorlingWorker } = require('./dorling-worker')

const LiveReloadPlugin = require('webpack-livereload-plugin')

const mainConfig = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'eurostatmap.js',
        path: path.resolve(__dirname, '../build'), // This moves the output to the parent folder's 'build' directory
        library: 'eurostatmap',
        libraryTarget: 'umd',
        publicPath: '/build/', // Optional: if resources are served from this path
    },
    resolve: {
        extensions: ['.js', '.ts'], // allow typescript
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            declaration: false,
                            declarationMap: false,
                            emitDeclarationOnly: false,
                        },
                    },
                },
                exclude: [/node_modules/, /\.d\.ts$/],
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'], // For CSS files
            },
        ],
    },
    plugins: [new LiveReloadPlugin()],
    watch: true,
    // no inline source map: it made the bundle (the package's `module` entry) 8 MB instead of 3 MB
    devtool: false,
}

// the Dorling worker is built first and embedded in the bundle (see dorling-worker.js)
module.exports = [
    { ...dorlingWorkerConfig, watch: mainConfig.watch },
    { ...mainConfig, ...withDorlingWorker(mainConfig) },
]
