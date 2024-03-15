/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: config.inlineSvg ? /\.(jpe?g|gif|webp|png)$/ : /\.(jpe?g|gif|webp|png|svg)$/,
    type: 'asset/resource',
    generator: {
        filename: `${config.staticPath}${baseUrl}images/[name].[hash].[ext]`,
        emit: !isSSR,
    },
    use: {
        cache: config.useCache  && 'cache-loader',
    },
})
