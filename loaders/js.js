const utils = require('../utils');

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
                            ['@babel/plugin-proposal-decorators', {version: "legacy"}],
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
                        ['@babel/plugin-proposal-decorators', {version: "legacy"}],
                    ].filter(Boolean),
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                "targets": {
                                    "browsers": "last 2 versions, Android >= 4, safari >= 7, ios_saf >= 8, chrome >= 52"
                                },
                                "corejs": "^3.36.0",
                                "useBuiltIns": 'entry',
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
        exclude: /node_modules/,
    }
}
