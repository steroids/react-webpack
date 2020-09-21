const _ = require('lodash');
const getConfigDefault = require('./config.default');

module.exports = (config) => {
    config = _.merge(getConfigDefault(), config);

    let devServerConfig = {
        contentBase: config.outputPath,
        hot: true,
        inline: true,
        port: config.port,
        host: config.host,
        disableHostCheck: true,
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
        staticOptions: {
            '**': `http://${config.host}`,
        },
        stats: {
            chunks: false,
            colors: true
        },
    };

    // Merge with custom
    devServerConfig = _.merge(devServerConfig, config.devServer);

    return devServerConfig;
};
