/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: /(\/|\\)fonts(\/|\\).*\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
    use: {
        cache: !isSSR && config.useCache && 'cache-loader',
        file: {
            loader: 'file-loader',
            options: {
                name: `${config.staticPath}${baseUrl}fonts/[name].[hash].[ext]`,
                emitFile: !isSSR,
            },
        },
    },
})
