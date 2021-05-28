const webpack = require('webpack');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const WebpackDevServer = require('webpack-dev-server');

const api = require('./api');
const getConfigDefault = require('./config.default');
const getConfigDevServer = require('./config.devServer');
const getClientConfig = require('./config.client');
const getServerConfig = require('./config.server');

// Publish api
module.exports = api;

// Auto start after define config
api._fetchEntries()
    .then(result => {
        process.env.IS_WEB = !api.isSSR();

        // Get webpack configs params
        const defaultConfig = _.merge(getConfigDefault(), api._config);
        const cpusMax = require('os').cpus().length || 1;

        const configParams = {
            config: defaultConfig,
            baseUrl: defaultConfig.baseUrl
                ? String(defaultConfig.baseUrl).replace(/(^\/|\/$)/, '') + '/'
                : '',
            cpus: cpusMax > 3 ? 2 : 1
        };

        // Init client config
        const clientWebpackConfig = getClientConfig({
            ...configParams,
            entry: Object.assign.apply(null, result)
        });

        // Init client webpack compiler
        const clientCompiler = webpack(clientWebpackConfig);

        // Get env params
        if (fs.existsSync(path.resolve(defaultConfig.cwd, '.env'))) {
            require('dotenv').config({
                path: path.resolve(defaultConfig.cwd, '.env'),
            });
        } else if (fs.existsSync(path.resolve(defaultConfig.cwd, '.example.env'))) {
            throw new Error('Not found .env file, is required for this project! Copy ".example.env" to ".env" and configure it.');
        }

        // Create output path
        const outputPath = (defaultConfig.ssr.statsPath || defaultConfig.outputPath);
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath);
        }

        // Stats save path
        const statsPath = outputPath + '/stats.json';

        if (api.isProduction()) {
            // Production
            clientCompiler.run((err, stats) => {
                const _stats = {
                    ...stats.toJson({all: false, assets: true}),
                    assetsUrls: Object.keys(stats.compilation.assets),
                };

                if (err) {
                    console.error(err);
                } else {
                    fs.writeFileSync(statsPath, JSON.stringify(_stats, null, 2));

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

                if (api.isSSR()) {
                    const serverWebpackConfig = getServerConfig(configParams);
                    const serverCompiler = webpack(serverWebpackConfig);

                    serverCompiler.run((err, stats) => {
                        console.log('SSR Enabled, source dir: ' + defaultConfig.sourcePath);

                        if (err) {
                            console.error(err);
                        }

                        if (stats.compilation.errors && stats.compilation.errors.length > 0) {
                            console.error(stats.compilation.errors)
                            process.exit(1);
                        }
                    })
                }
            });
        } else {
            // Development
            const devServerConfig = getConfigDevServer(api._config);
            const devServer = new WebpackDevServer(clientCompiler, devServerConfig);
            const httpListen = devServer.listen.bind(devServer);

            console.log(`Listening at http://${defaultConfig.host}:${defaultConfig.port}`);
            httpListen(defaultConfig.port, defaultConfig.host, (err) => {
                if (err) {
                    return console.error(err);
                }
            });
        }
    })
    .catch(e => console.error(e));
