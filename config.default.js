const utils = require('./utils');
const path = require('path');

module.exports = () => {
    return {
        cwd: process.cwd(),
        host: '127.0.0.1',
        port: utils.generatePort(),
        outputPath: path.resolve(process.cwd(), 'public'),
        staticPath: '',
        sourcePath: path.resolve(process.cwd(), 'src'),
        baseUrl: 'frontend/',
        useHash: utils.isProduction(),
        useCache: false,
        inlineSvg: false,
        serverPath: path.resolve(process.cwd(), 'node_modules/@steroidsjs/ssr/index.ts'),
        applicationPath:  path.resolve(process.cwd(), 'src/Application.tsx'),
        initActionPath: path.resolve(process.cwd(), 'src/shared/Layout/Layout.tsx'),
        languages: ['en'],
        ssr: {}, // you custom ssr config
        webpack: {}, // you custom webpack config
        devServer: {}, // you custom dev server config
    };
};
