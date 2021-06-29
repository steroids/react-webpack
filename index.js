const webpack = require('webpack');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const WebpackDevServer = require('webpack-dev-server');

const api = require('./api');
const getConfigDefault = require('./config.default');
const getConfigDevServer = require('./config.devServer');
const getAppConfig = require('./config.client');
const getServerConfig = require('./config.server');

/**
 * @param {Object} defaultConfig
 * @param {Object} entry
 * @return {{cpus: number, config: Object, baseUrl: string, entry: Object }}
 */
const createConfigData = (defaultConfig, entry ) => {
    const cpusMax = require('os').cpus().length || 1;

    return {
        config: defaultConfig,
        baseUrl: defaultConfig.baseUrl
            ? String(defaultConfig.baseUrl).replace(/(^\/|\/$)/, '') + '/'
            : '',
        cpus: cpusMax > 3 ? 2 : 1,
        entry: Object.assign.apply(null, entry)
    };
}

/**
 * @param {Object} defaultConfig
 * @return {void}
 */
const configDotenv = defaultConfig => {
    if (fs.existsSync(path.resolve(defaultConfig.cwd, '.env'))) {
        require('dotenv').config({
            path: path.resolve(defaultConfig.cwd, '.env'),
        });
    } else if (fs.existsSync(path.resolve(defaultConfig.cwd, '.example.env'))) {
        throw new Error('Not found .env file, is required for this project! Copy ".example.env" to ".env" and configure it.');
    }
}

/**
 * @param {*} compiler
 * @param {function} cb
 * @return {void}
 */
const runWebpackCompiler = (compiler, cb) => {
    compiler.run((err, stats) => {
        if (err) {
            console.error(err);
        }

        cb(err, stats)
    })
}

/**
 * @param {Object} defaultConfig
 * @param {Object} entry
 * @return {void}
 */
const buildSsr = (defaultConfig, entry) => {
    const config = getServerConfig(createConfigData(defaultConfig, entry));
    const compiler = webpack(config);

    runWebpackCompiler(compiler, (err, stats) => {
        console.log('SSR Enabled, source dir: ' + defaultConfig.sourcePath);

        if (stats.compilation.errors && stats.compilation.errors.length > 0) {
            console.error(stats.compilation.errors)
            process.exit(1);
        }
    });
}

/**
 * @param {Object} defaultConfig
 * @param {*} compiler
 * @return {void}
 */
const runDevServer = (defaultConfig, compiler) => {
    const config = getConfigDevServer(api._config);
    const devServer = new WebpackDevServer(compiler, config);
    const httpListen = devServer.listen.bind(devServer);

    console.log(`Listening at http://${defaultConfig.host}:${defaultConfig.port}`);
    httpListen(defaultConfig.port, defaultConfig.host, (err) => {
        if (err) {
            return console.error(err);
        }
    });
}

/**
 * @param {Object} defaultConfig
 * @return {string}
 */
const getOutputPath = defaultConfig => {
    const result = defaultConfig.outputPath;
    if (!fs.existsSync(result)) {
        fs.mkdirSync(result);
    }

    return result;
}

/**
 * @param {string} err
 * @param {Object} defaultConfig
 * @param {*} stats
 * @return {void}
 */
const createFileWithAssets = (err, defaultConfig, stats) => {
    const path = getOutputPath(defaultConfig) + '/stats.json';

    const _stats = {
        ...stats.toJson({all: false, assets: true}),
        assetsUrls: Object.keys(stats.compilation.assets),
    };

    if (!err) {
        fs.writeFileSync(path, JSON.stringify(_stats, null, 2));

        console.log(stats.toString({
            chunks: false,
            children: false,
            colors: true,
            publicPath: true,
        }));
    }

    if (stats.compilation.errors && stats.compilation.errors.length > 0) {
        process.exit(1);
    }
}

/**
 * @param {Object} defaultConfig
 * @param {Object} entry
 * @return {void}
 */
const buildApp = (defaultConfig, entry) => {
    const config = getAppConfig(createConfigData(defaultConfig, entry));
    const compiler = webpack(config);

    if (api.isProduction()) {
        runWebpackCompiler(compiler, (err, stats) => {
            createFileWithAssets(err, defaultConfig, stats);

            if (api.isSSR()) {
                buildSsr(defaultConfig, entry);
            }
        });

        return;
    }

    runDevServer(defaultConfig, compiler);
}

// Publish api
module.exports = api;

// Auto start after define config
api._fetchEntries()
    .then(result => {
        process.env.IS_WEB = !api.isSSR();
        const defaultConfig = _.merge(getConfigDefault(), api._config);

        configDotenv(defaultConfig);
        buildApp(defaultConfig, result);
    })
    .catch(e => console.error(e));
