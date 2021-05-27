/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => {
    const test = config.inlineSvg ? /\.(jpe?g|gif|png)$/ : /\.(jpe?g|gif|png|svg)$/;

    if (isSSR) {
        return {
            test,
            loader: 'null-loader',
        }
    }

    return {
        test,
        use: {
            cache: config.useCache && 'cache-loader',
            file: {
                loader: 'file-loader',
                options: {
                    name: `${config.staticPath}${baseUrl}images/[name].[hash].[ext]`,
                },
            },
        },
    };
}
