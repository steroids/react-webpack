/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: /(\/|\\)fonts(\/|\\).*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
    type: 'asset/resource',
    generator: {
        filename: `${config.staticPath}${baseUrl}fonts/[name].[hash].[ext]`,
        emit: !isSSR,
    },
    use: {
        cache: config.useCache && 'cache-loader',
    },
})
