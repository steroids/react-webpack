/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: config.inlineSvg ? /\.(jpe?g|gif|webp|png)$/ : /\.(jpe?g|gif|webp|png|svg)$/,
    use: {
        cache: config.useCache && 'cache-loader',
        file: {
            loader: 'file-loader',
            options: {
                name: `${config.staticPath}${baseUrl}images/[name].[hash].[ext]`,
                emitFile: !isSSR,
            },
        },
    },
})
