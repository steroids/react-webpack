const MiniCssExtractPlugin = require('mini-css-extract-plugin');

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
            MiniCssExtractPlugin.loader,
            'css-loader',
        ],
    };
}
