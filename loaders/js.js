const utils = require('../utils');
const fs = require('fs');

/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({cpus, config, isSSR}) => {
    const test = /\.jsx?$/

    if (isSSR) {
        return {
            test,
            use: {
                cache: config.useCache && 'cache-loader',
                babel: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        plugins: [
                            ['@babel/plugin-proposal-decorators', {legacy: true}],
                        ],
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-react',
                        ],
                    }
                },
            },
            exclude: /node_modules/,
        }
    }

    return {
        test,
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
    }
}
