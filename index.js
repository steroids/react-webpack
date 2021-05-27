const webpack = require('webpack');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const express = require('express');
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
        const baseUrl = defaultConfig.baseUrl
            ? String(defaultConfig.baseUrl).replace(/(^\/|\/$)/, '') + '/'
            : '';

        const cpusMax = require('os').cpus().length || 1;
        const cpus = cpusMax > 3 ? 2 : 1;

        const configParams = {
            config: defaultConfig,
            baseUrl,
            cpus
        };

        // Init client config
        const webpackConfig = getClientConfig({
            ...configParams,
            entry: Object.assign.apply(null, result)
        });
        const serverWebpackConfig = getServerConfig(configParams);

        // Init client webpack compiler
        const compiler = webpack(webpackConfig);
        const serverCompiler = webpack(serverWebpackConfig)

        // Express app (for dev server and ssr)
        let expressApp = null;
        let getStats = null;
        let httpListen = null;
        let devServer = null;

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
            let _stats = null;
            getStats = () => _stats;

            if (!api.isSSR()) {
                // Production
                compiler.run(async (err, stats) => {
                    _stats = {
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

                    if (api.isTestSSR()) {
                        console.log('Run SSR Test...');
                        require('./ssr/index').default('/', null, defaultConfig, getStats)
                            .catch(e => {
                                console.error('SSR test failed!', e);
                                process.exit(1);
                            });
                    }
                });

                //new ssr compiler run
                serverCompiler.run((err, stats) => {
                    console.log('run server');
                    if (err) {
                        console.error(err);
                    }

                    if (stats.compilation.errors && stats.compilation.errors.length > 0) {
                        console.error(stats.compilation.errors);
                        process.exit(1);
                    }
                })
            } else if (fs.existsSync(statsPath)) {
                _stats = JSON.parse(fs.readFileSync(statsPath));
            }
        } else {
            const devServerConfig = getConfigDevServer(api._config);
            if (api.isSSR()) {
                devServerConfig.features = [
                    'setup',
                    'before',
                    'headers',
                    //'middleware', - Will be run after ssr
                    'proxy',
                    //'contentBaseFiles',
                    //'historyApiFallback',
                    //'contentBaseFiles',
                    //'contentBaseIndex',
                    'magicHtml',
                ];
            }

            // Development
            devServer = new WebpackDevServer(compiler, devServerConfig);
            expressApp = devServer.app;
            httpListen = devServer.listen.bind(devServer);
            getStats = () => ({
                ...devServer._stats.toJson({all: false, assets: true}),
                assetsUrls: Object.keys(devServer._stats.compilation.assets),
            });
        }

        if (api.isSSR() || api.isTestSSR()) {
            if (api.isSSR()) {
                console.log('SSR Enabled, source dir: ' + defaultConfig.sourcePath);

                // TODO Temporary disable ssl verification for https requests
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
            }


            require('./ssr/require-context')();

            if (api.isSSR()) {
                if (!expressApp) {
                    expressApp = express();
                    expressApp.use(express.static(defaultConfig.outputPath));
                    httpListen = expressApp.listen.bind(expressApp);
                }

                expressApp.get('*', async (request, response, next) => {
                    const accessTokenMatch = (request.headers.cookie || '').match(/accessToken\s*=\s*(\w+)/);
                    const accessToken = accessTokenMatch && accessTokenMatch[1] || null;

                    const content = await require('./ssr/index').default(request.url, accessToken, defaultConfig, getStats);
                    if (content === false) {
                        next();
                    } else {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.end(content);
                    }
                });

                // Use devServer middleware after ssr
                if (devServer) {
                    devServer.setupMiddleware();
                }
            }
        }

        if (expressApp && httpListen) {
            console.log(`Listening at http://${defaultConfig.host}:${defaultConfig.port}`);
            httpListen(defaultConfig.port, defaultConfig.host, (err) => {
                if (err) {
                    return console.error(err);
                }
            });
        }
    })
    .catch(e => console.error(e));
