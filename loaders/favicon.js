/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: /favicon\.ico$/,
    type: 'asset/resource',
    generator: {
        filename: `${config.staticPath}${baseUrl}[name].[ext]`,
        emit: !isSSR,
    },
    use: {
        cache: config.useCache  && 'cache-loader',
    },
})
