const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const Dotenv = require('dotenv-webpack');
const webpackNodeExternals = require('webpack-node-externals');
const utils = require('./utils');
const normalizeLoaders = require('./loaders/normalize');

/**
 * @param {{cpus: number, config: Object, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, baseUrl, cpus}) => {
    const entry = config.serverPath;

    if (!entry) {
        console.error('Not found entry for', path.basename(__filename))
    }

    const loadersParams = {
        config,
        cpus,
        baseUrl,
        isSSR: true,
    }

    let webpackConfig = {
        target: 'node',
        node: {__dirname: false},
        mode: utils.isProduction() ? 'production' : 'development',
        devtool: !utils.isProduction() ? 'eval-source-map' : false,
        entry,
        output: {
            filename: 'server.js',
            libraryTarget: 'commonjs2',
            path: config.outputPath,
            publicPath: '/'
        },
        externals: [
            webpackNodeExternals({
                allowlist: [/\.(?!(?:tsx?|jsx?|json)$).{1,5}$/i, /^lodash/]
            })
        ],
        module: {
            rules: {
                ts: require('./loaders/ts')(loadersParams),
                js: require('./loaders/js')(loadersParams),
                css: require('./loaders/css')(loadersParams),
                sass: require('./loaders/sass')(loadersParams),
                font: require('./loaders/font')(loadersParams),
                image: require('./loaders/image')(loadersParams),
                favicon: require('./loaders/favicon')(loadersParams),
                svg: require('./loaders/svg')(loadersParams),
            },
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            alias: {
                app: path.resolve(config.cwd, 'app'),
                reducers: fs.existsSync(path.resolve(config.sourcePath, 'reducers'))
                    ? path.resolve(config.sourcePath, 'reducers')
                    : '@steroidsjs/core/reducers',
                _SsrApplication: config.applicationPath,
                _SsrStats: path.resolve(config.outputPath, './stats.json'),
            },
            modules: [
                config.sourcePath,
                path.resolve(config.cwd, '../node_modules'),
                path.resolve(config.cwd, 'app'),
                path.resolve(config.cwd, 'node_modules'), // the old 'fallback' option (needed for npm link-ed packages)
            ].filter(path => fs.existsSync(path)),
        },
        plugins: [
            // .env
            fs.existsSync(config.cwd + '/.env') && new Dotenv({
                path: config.cwd + '/.env',
            }),

            // Proxy all APP_* env variables
            new webpack.DefinePlugin(Object.keys(process.env).reduce((obj, key) => {
                if (key.indexOf('APP_') === 0) {
                    obj['process.env.' + key] = JSON.stringify(process.env[key]);
                }
                return obj;
            }, {
                'process.env.IS_SSR': JSON.stringify(true),
                'process.env.APP_SSR_OUTPUT_PATH': JSON.stringify(config.outputPath),
                'process.env.APP_SSR_PORT': JSON.stringify(config.port),
                'process.env.APP_SSR_HOST': JSON.stringify(config.host),
                'process.env.APP_SSR_LANGUAGES': JSON.stringify(config.languages)
            })),

            new webpack.ProvidePlugin({
                window: path.resolve(path.join(__dirname, 'mock/window.mock')),
                localStorage: path.resolve(path.join(__dirname, './mock/localStorage.mock')),
                document: 'global/document',
            }),
        ].filter(Boolean),
        performance: {
            maxEntrypointSize: 12000000,
            maxAssetSize: 12000000,
        },
    };

    // Merge with custom
    webpackConfig = _.merge(webpackConfig, config.ssr);

    // Normalize rules (objects -> arrays)
    webpackConfig.module.rules = normalizeLoaders(webpackConfig.module.rules);

    return webpackConfig;
}
