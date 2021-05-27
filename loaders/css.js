const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const utils = require('../utils');

/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({cpus, isSSR}) => {
    const test = /\.css$/;

    if (isSSR) {
        return {
            test,
            loader: 'null-loader',
        }
    }

    return {
        test,
        use: [
            !utils.isProduction() && {
                loader: 'thread-loader',
                options: {
                    workers: cpus,
                    poolTimeout: Infinity,
                },
            },
            MiniCssExtractPlugin.loader,
            'css-loader',
        ],
    };
}
