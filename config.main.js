const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ExportTranslationKeysPlugin = require('./plugins/ExportTranslationKeysPlugin');
const BundleAllPlugin = require('./plugins/BundleAllPlugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const utils = require('./utils');
const getConfigDefault = require('./config.default');

function recursiveIssuer(m) {
    if (m.issuer) {
        return recursiveIssuer(m.issuer);
    } else if (m.name) {
        return m;
    } else {
        return null;
    }
}

module.exports = (config, entry) => {
    config = _.merge(getConfigDefault(), config);
    const baseUrl = config.baseUrl
        ? String(config.baseUrl).replace(/(^\/|\/$)/, '') + '/'
        : '';

    // For split chunks
    const indexEntry = entry.index;
    //delete entry.index;

    const cpusMax = require('os').cpus().length || 1;
    const cpus = cpusMax > 3 ? 2 : 1;

    const alias = {
        app: path.resolve(config.cwd, 'app'),
        reducers: fs.existsSync(path.resolve(config.sourcePath, 'reducers'))
            ? path.resolve(config.sourcePath, 'reducers')
            : '@steroidsjs/core/reducers',
    };
    if (!utils.isProduction()) {
        alias['react-dom'] = '@hot-loader/react-dom';
    }

    // Init default webpack config
    let webpackConfig = {
        entry,
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
        module: {
            rules: {
                ts: {
                    test: /\.tsx?$/,
                    use: {
                        thread: !utils.isProduction() && {
                            loader: 'thread-loader',
                            options: {
                                workers: cpus,
                                poolTimeout: Infinity,
                            },
                        },
                        cache: config.useCache && 'cache-loader',
                        babel: {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                plugins: [
                                    ['@babel/plugin-proposal-decorators', {legacy: true}],
                                    !utils.isProduction() && 'react-hot-loader/babel',
                                ].filter(Boolean),
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": "last 2 versions, Android >= 4, safari >= 7, ios_saf >= 8, chrome >= 52"
                                            },
                                            "corejs": "^3.0.1",
                                            "useBuiltIns": 'entry'
                                        }
                                    ],
                                    '@babel/preset-react',
                                    utils.isProduction() && ['minify', {
                                        builtIns: false,
                                        evaluate: false,
                                        mangle: false,
                                    }],
                                ].filter(Boolean),
                            }
                        },
                        ts: {
                            loader: 'ts-loader',
                            options: {
                                allowTsInNodeModules: true,
                                transpileOnly: false,
                                happyPackMode: true,
                            },
                        }
                    },
                    exclude: /node_modules/,
                },
                js: {
                    test: /\.jsx?$/,
                    use: {
                        thread: !utils.isProduction() && {
                            loader: 'thread-loader',
                            options: {
                                workers: cpus,
                                poolTimeout: Infinity,
                            },
                        },
                        cache: config.useCache && 'cache-loader',
                        babel: {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                plugins: [
                                    ['@babel/plugin-proposal-decorators', {legacy: true}],
                                    !utils.isProduction() && 'react-hot-loader/babel',
                                ].filter(Boolean),
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": "last 2 versions, Android >= 4, safari >= 7, ios_saf >= 8, chrome >= 52"
                                            },
                                            "corejs": "^3.0.1",
                                            "useBuiltIns": 'entry'
                                        }
                                    ],
                                    '@babel/preset-react',
                                    utils.isProduction() && ['minify', {
                                        builtIns: false,
                                        evaluate: false,
                                        mangle: false,
                                    }],
                                ].filter(Boolean),
                            }
                        },
                        eslint: !utils.isProduction() && fs.existsSync(config.cwd + '/.eslintrc') && {
                            loader: 'eslint-loader',
                            options: {
                                configFile: config.cwd + '/.eslintrc',
                                ignoreFile: fs.existsSync(config.cwd + '/.eslintignore')
                                    ? config.cwd + '/.eslintignore'
                                    : null,
                            }
                        },
                    },
                    exclude: /node_modules/,
                },
                css: {
                    test: /\.css$/,
                    use: [
                        !utils.isProduction() && {
                            loader: 'thread-loader',
                            options: {
                                workers: cpus,
                                poolTimeout: Infinity,
                            },
                        },
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                    ],
                },
                sass: {
                    test: /\.scss$/,
                    use: [
                        !utils.isProduction() && 'css-hot-loader',
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        {
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    includePaths: [
                                        config.sourcePath,
                                    ],
                                },
                            },
                        },
                    ],
                },
                font: {
                    test: /(\/|\\)fonts(\/|\\).*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                    use: {
                        cache: config.useCache && 'cache-loader',
                        file: {
                            loader: 'file-loader',
                            options: {
                                name: `${config.staticPath}${baseUrl}fonts/[name].[hash].[ext]`,
                            },
                        },
                    },
                },
                image: {
                    test: config.inlineSvg ? /\.(jpe?g|gif|png)$/ : /\.(jpe?g|gif|png|svg)$/,
                    use: {
                        cache: config.useCache && 'cache-loader',
                        file: {
                            loader: 'file-loader',
                            options: {
                                name: `${config.staticPath}${baseUrl}images/[name].[hash].[ext]`,
                            },
                        },
                    },
                },
                favicon: {
                    test: /favicon\.ico$/,
                    use: {
                        cache: config.useCache && 'cache-loader',
                        file: {
                            loader: 'file-loader',
                            options: {
                                name: `${config.staticPath}${baseUrl}[name].[ext]`,
                            },
                        },
                    },
                },
                svg: config.inlineSvg && {
                    test: /\.svg$/,
                    use: {
                        thread: !utils.isProduction() && {
                            loader: 'thread-loader',
                            options: {
                                workers: cpus,
                                poolTimeout: Infinity,
                            },
                        },
                        file: {
                            loader: 'svg-inline-loader',
                            options: {
                                removeSVGTagAttrs: false,
                            },
                        },
                    },
                },
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
            new HtmlWebpackPlugin({
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

    webpackConfig = _.merge(webpackConfig, {
        mode: utils.isProduction() ? 'production' : 'development',
        optimization: {
            runtimeChunk: {
                name: 'common',
            },
            minimize: utils.isProduction(),
        }
    });

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
    webpackConfig.module.rules = Object.keys(webpackConfig.module.rules)
        .map(key => {
            const item = webpackConfig.module.rules[key];
            if (item && item.use) {
                item.use = _.values(item.use).filter(Boolean);
            }

            return item;
        })
        .filter(Boolean);

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
};
