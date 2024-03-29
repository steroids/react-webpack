const utils = require('../utils');

/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({isSSR, cpus, config}) => {
    const test = /\.svg$/;

    if (!config.inlineSvg) {
        return null;
    }

    // @todo not sure why we aren't loading svg's with 'inlineSvg === true'. commented for now, to be deleted later
    // if (isSSR) {
    //     return {
    //         test,
    //         loader: 'null-loader',
    //     };
    // }

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
            file: {
                loader: 'svg-inline-loader',
                options: {
                    removeSVGTagAttrs: false,
                },
            },
        },
    };
}
