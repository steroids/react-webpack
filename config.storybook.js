const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const getConfigDefault = require('./config.default');
const utils = require('./utils');
const mergeConfigs = require('./storybook-merge-webpack-config');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (config) => {
    config = _.merge(getConfigDefault(), config);

    // Init default webpack config
    let webpackConfig = {
        module: {
            rules: {
                ts: {
                    test: /\.tsx?$/,
                    use: {
                        cache: utils.isProduction() && 'cache-loader',
                        babel: {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                plugins: [
                                    ['@babel/plugin-proposal-decorators', {version: "legacy"}],
                                    '@babel/plugin-transform-runtime',
                                ].filter(Boolean),
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": "last 2 versions, Android >= 4, safari >= 7, ios_saf >= 8, chrome >= 52"
                                            },
                                            "corejs": "^3.36.0",
                                            // "useBuiltIns": 'entry' TODO: when @babel/plugin-transform-runtime is enabled, this option must not be set
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
                                allowTsInNodeModules: true
                            },
                        }
                    },
                },
                js: {
                    test: /\.jsx?$/,
                    use: {
                        cache: utils.isProduction() && 'cache-loader',
                        babel: {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                plugins: [
                                    ['@babel/plugin-proposal-decorators', {version: "legacy"}],
                                    '@babel/plugin-transform-runtime',
                                ].filter(Boolean),
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "browsers": "last 2 versions, Android >= 4, safari >= 7, ios_saf >= 8, chrome >= 52"
                                            },
                                            "corejs": "^3.36.0",
                                            // "useBuiltIns": 'entry', TODO: when @babel/plugin-transform-runtime is enabled, this option must noy be set
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
                    },
                    exclude: /node_modules(\/|\\+)(?!@steroids)/,
                },
                less: {
                    test: /\.less$/,
                    use: {
                        style: {
                            loader: 'style-loader',
                        },
                        css: {
                            loader: 'css-loader',
                        },
                        less: {
                            loader: 'less-loader',
                        },
                    },
                },
                sass: {
                    test: /\.scss$/,
                    use: {
                        style: {
                            loader: 'style-loader',
                        },
                        css: {
                            loader: 'css-loader',
                        },
                        sass: {
                            loader: 'sass-loader',
                            options: {
                                // Prefer `dart-sass`
                                implementation: require('sass'),
                            },
                        },
                    }
                },
                font: {
                    test: /(\/|\\)fonts(\/|\\).*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name].[ext]',
                    },
                },
                image: {
                    test: /\.(jpe?g|gif|png|svg)$/,
                    type: 'asset/resource',
                },
            },
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            alias: {
                app: path.resolve(config.cwd, 'app'),
                reducers: fs.existsSync(path.resolve(config.sourcePath, 'reducers'))
                    ? path.resolve(config.sourcePath, 'reducers')
                    : '@steroidsjs/core/reducers',
            },
        },
        plugins: [new ESLintPlugin()],
    };

    // Merge with custom
    webpackConfig = _.merge(
        webpackConfig,
        config.webpack
    );

    // Normalize rules (objects -> arrays)
    webpackConfig.module.rules = Object.keys(webpackConfig.module.rules)
        .map(key => {
            const item = webpackConfig.module.rules[key];
            if (item.use) {
                item.use = _.values(item.use).filter(Boolean);
            }

            return item;
        })
        .filter(Boolean);

    return storybookConfig => {
        const finalConfig = mergeConfigs(storybookConfig.config, webpackConfig);
        finalConfig.module.rules.shift();
        return finalConfig;
    };
};
