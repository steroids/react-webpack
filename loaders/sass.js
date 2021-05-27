const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const utils = require('../utils');

/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR}) => {
    const test = /\.scss$/;

    if (isSSR) {
        return {
            test,
            loader: 'null-loader',
        }
    }

    return {
        test,
        use: [
            !utils.isProduction() && 'css-hot-loader',
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
                loader: 'sass-loader',
                options: {
                    sassOptions: {
                        includePaths: [
                            config.sourcePath,
                        ],
                    },
                },
            },
        ],
    };
}
