const utils = require('../utils');

/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({cpus, config, isSSR}) => {
    const test = /\.tsx?$/;

    if (isSSR) {
        return {
            test,
            use: {
                cache: config.useCache && 'cache-loader',
                ts: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                    }
                }
            },
            exclude: /node_modules/,
        };
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
                                "useBuiltIns": 'entry', // TODO: it's required to import 'core-js' somewhere in js file, but it follows by errors, may be this import already exists (one of possible reasons)
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
    }
}
