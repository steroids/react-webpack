const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const ExportTranslationKeysPlugin = require('./plugins/ExportTranslationKeysPlugin');
const BundleAllPlugin = require('./plugins/BundleAllPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
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

// config for minimizer
const minimizer = [
    new TerserPlugin({
        terserOptions: {
            compress: {
                passes: 2,
            },
        }
    }),
    new CssMinimizerPlugin({
        minimizerOptions: {
            preset: [
                'default',
                {
                    discardComments: { removeAll: true },
                    discardDuplicates: true,
                    discardEmpty: true,
                    discardUnused: true,
                    mergeRules: true,
                },
            ],
        },
    }),
];

/**
 * @param {{cpus: number, config: Object, baseUrl: string, entry: Object}} params
 * @return {Object}
 */
module.exports = ({config, baseUrl, entry, cpus}) => {
    const alias = {
        app: path.resolve(config.cwd, 'app'), // TODO: may be this is deprecated? Here and in other aliases and modules
        reducers: fs.existsSync(path.resolve(config.sourcePath, 'reducers'))
            ? path.resolve(config.sourcePath, 'reducers')
            : '@steroidsjs/core/reducers',
    };

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
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[contenthash]' : ''}.js`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[contenthash]' : ''}.js`,
            }
            : {
                publicPath: `http://${config.host}:${config.port}/`,
                path: config.outputPath,
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[contenthash]' : ''}.js`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[contenthash]' : ''}.js`,
            },
        optimization: {
            runtimeChunk: {
                name: 'common',
            },
            minimize: utils.isProduction(),
            moduleIds: 'named',
            chunkIds: 'named',
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
            exportsFields: [], // to ignore exports field in package.json
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
                filename: `${config.staticPath}${baseUrl}bundle-[name]${config.useHash ? '.[contenthash]' : ''}.css`,
                chunkFilename: `${config.staticPath}${baseUrl}bundle-[id]${config.useHash ? '.[contenthash]' : ''}.css`,
            }),
            new webpack.IgnorePlugin({
                resourceRegExp: /^\.\/locale$/,
                contextRegExp: /moment$/,
            }), // Skip moment locale files
            !utils.isProduction() && new ForkTsCheckerWebpackPlugin({
                typescript: {
                    diagnosticOptions: {
                        semantic: true,
                        syntactic: true,
                    },
                },
            }),
            !utils.isProduction() && new webpack.ProgressPlugin(),
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
                'process.env.IS_WEB': JSON.stringify(true),
            })),

            // Eslint
            !utils.isProduction() && new ESLintPlugin(),
        ].filter(Boolean),
        performance: {
            maxEntrypointSize: 12000000,
            maxAssetSize: 12000000,
        },
    };

    // optimize duplication of css classes and properties
    webpackConfig.optimization.minimize = true;
    webpackConfig.optimization.minimizer = utils.isProduction() ? minimizer : minimizer.slice(1);

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
                    idHint: 'common',
                    chunks: 'initial',
                    test: /\.js$/,
                    minChunks: 2,
                    minSize: 0,
                },
                commonStyle: {
                    idHint: 'common',
                    chunks: 'initial',
                    test: /\.(scss|less|css)$/,
                    minChunks: 10000, // Bigger value for disable common.css
                }
            }
        };
    }

    // Merge with custom
    webpackConfig = _.merge(webpackConfig, config.webpack);

    // Normalize rules (objects -> arrays)
    webpackConfig.module.rules = normalizeLoaders(webpackConfig.module.rules);

    return webpackConfig;
}
