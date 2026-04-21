// dev
const path = require('path')

const LiveReloadPlugin = require('webpack-livereload-plugin')

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
    devtool: 'inline-source-map',
}
