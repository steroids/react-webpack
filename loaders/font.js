/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => {
    const test = /(\/|\\)fonts(\/|\\).*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/;

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
                    name: `${config.staticPath}${baseUrl}fonts/[name].[hash].[ext]`,
                },
            },
        },
    };
}
