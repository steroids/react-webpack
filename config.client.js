const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const ExportTranslationKeysPlugin = require('./plugins/ExportTranslationKeysPlugin');
const BundleAllPlugin = require('./plugins/BundleAllPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const utils = require('./utils');
const normalizeLoaders = require('./loaders/normalize');

function recursiveIssuer(m) {
    if (m.issuer) {
        return recursiveIssuer(m.issuer);
    } else if (m.name) {
        return m;
    } else {
        return null;
    }
}

/**
 * @param {{cpus: number, config: Object, baseUrl: string, entry: Object}} params
 * @return {Object}
 */
module.exports = ({config, baseUrl, entry, cpus}) => {
    const alias = {
        app: path.resolve(config.cwd, 'app'),
        reducers: fs.existsSync(path.resolve(config.sourcePath, 'reducers'))
            ? path.resolve(config.sourcePath, 'reducers')
            : '@steroidsjs/core/reducers',
    };

    if (!utils.isProduction()) {
        alias['react-dom'] = '@hot-loader/react-dom';
    }

    const loadersParams = {
        config,
        cpus,
        baseUrl,
        isSSR: false,
    }

    let webpackConfig = {
        target: 'web',
        entry,
        mode: utils.isProduction() ? 'production' : 'development',
        devtool: !utils.isProduction() ? 'eval-source-map' : false,
        output: utils.isProduction()
            ? {
                publicPath: '/',
                path: config.outputPath,
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[hash]' : ''}.js`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[hash]' : ''}.js`,
            }
            : {
                publicPath: `http://${config.host}:${config.port}/`,
                path: config.outputPath,
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[hash]' : ''}.js`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[hash]' : ''}.js`,
            },
        optimization: {
            runtimeChunk: {
                name: 'common',
            },
            minimize: utils.isProduction(),
        },
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
            alias,
            modules: [
                config.sourcePath,
                path.resolve(config.cwd, '../node_modules'),
                path.resolve(config.cwd, 'app'),
                path.resolve(config.cwd, 'node_modules'), // the old 'fallback' option (needed for npm link-ed packages)
            ].filter(path => fs.existsSync(path)),
        },
        plugins: [
            utils.isAnalyze() && new BundleAnalyzerPlugin(),
            new ExportTranslationKeysPlugin(),
            new BundleAllPlugin({staticPath: config.staticPath}),
            new MiniCssExtractPlugin({
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[hash]' : ''}.css`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[id]${config.useHash ? '.[hash]' : ''}.css`,
            }),
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/), // Skip moment locale files (0.3 mb!)
            !utils.isProduction() && new ForkTsCheckerWebpackPlugin({
                typescript: {
                    diagnosticOptions: {
                        semantic: true,
                        syntactic: true,
                    },
                },
            }),
            utils.isProduction() && new webpack.optimize.OccurrenceOrderPlugin(),
            !utils.isProduction() && new webpack.ProgressPlugin(),
            new webpack.NamedModulesPlugin(),
            new webpack.NamedChunksPlugin(),
            !utils.isProduction() && new webpack.HotModuleReplacementPlugin(),

            // .env
            fs.existsSync(config.cwd + '/.env') && new Dotenv({
                path: config.cwd + '/.env',
            }),

            // Index html
            !utils.isSSR() && new HtmlWebpackPlugin({
                favicon: fs.existsSync(`${config.sourcePath}/favicon.ico`) ? `${config.sourcePath}/favicon.ico` : null,
                inject: true,
                template: fs.existsSync(config.sourcePath + '/index.html') ? config.sourcePath + '/index.html' : __dirname + '/index.html',
                filename: `${config.staticPath}${baseUrl}index.html`
            }),

            // Proxy all APP_* env variables
            new webpack.DefinePlugin(Object.keys(process.env).reduce((obj, key) => {
                if (key.indexOf('APP_') === 0) {
                    obj['process.env.' + key] = JSON.stringify(process.env[key]);
                }
                return obj;
            }, {
                'process.env.IS_WEB': JSON.stringify(process.env.IS_WEB || false),
            })),
        ].filter(Boolean),
        performance: {
            maxEntrypointSize: 12000000,
            maxAssetSize: 12000000,
        },
    };

    // Extracting CSS based on entry
    webpackConfig.optimization.splitChunks = webpackConfig.optimization.splitChunks || {cacheGroups: {}};
    Object.keys(entry).forEach(name => {
        // Skip styles
        if (/^style-/.test(name)) {
            return;
        }

        webpackConfig.optimization.splitChunks.cacheGroups[name] = {
            name: name,
            test: m => {
                const issuer = recursiveIssuer(m);
                return m.constructor.name === 'CssModule' && issuer && issuer.name === name;
            },
            chunks: 'all',
        };
    });

    const indexEntry = entry.index;
    if (indexEntry) {
        webpackConfig.optimization.splitChunks = {
            cacheGroups: {
                commonJs: {
                    name: 'common',
                    chunks: 'initial',
                    test: /\.js$/,
                    minChunks: 2,
                    minSize: 0,
                },
                commonStyle: {
                    name: 'common',
                    chunks: 'initial',
                    test: /\.(scss|less|css)$/,
                    minChunks: 10000, // Bigger value for disable common.css (i love webpack, bly@t.. %)
                }
            }
        };
    }

    // Merge with custom
    webpackConfig = _.merge(webpackConfig, config.webpack);

    // Normalize rules (objects -> arrays)
    webpackConfig.module.rules = normalizeLoaders(webpackConfig.module.rules);

    // Add hot replace to each bundles
    if (!utils.isProduction()) {
        Object.keys(webpackConfig.entry).map(key => {
            webpackConfig.entry[key] = []
                .concat([
                    `webpack-dev-server/client?http://${config.host}:${config.port}`,
                    'webpack/hot/dev-server',
                ])
                .concat(webpackConfig.entry[key])
        });
    }

    return webpackConfig;
}
