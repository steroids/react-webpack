const _ = require('lodash');
const getConfigDefault = require('./config.default');

module.exports = (config) => {
    config = _.merge(getConfigDefault(), config);

    let devServerConfig = {
        static: {
            directory: config.outputPath,
        },
        client: {
            overlay: false, // TODO: fix warning related to html-entities
        },
        port: config.port,
        host: config.host,
        headers: {
            'Host': config.host,
            'Access-Control-Allow-Origin': '*'
        },
        historyApiFallback: {
            index: '/' + _.trim(config.baseUrl, '/') + '/index.html',
        },
        proxy: process.env.APP_BACKEND_URL
            ? {
                context: ['/api', '/backend'],
                target: process.env.APP_BACKEND_URL,
                changeOrigin: true,
            }
            : undefined,
    };

    // Merge with custom
    devServerConfig = _.merge(devServerConfig, config.devServer);

    return devServerConfig;
};
