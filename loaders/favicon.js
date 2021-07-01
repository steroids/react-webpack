/**
 * @param {{cpus: number, config: Object, isSSR: boolean, baseUrl: string}} params
 * @return {Object}
 */
module.exports = ({config, isSSR, baseUrl}) => ({
    test: /favicon\.ico$/,
    use: {
        cache: config.useCache  && 'cache-loader',
        file: {
            loader: 'file-loader',
            options: {
                name: `${config.staticPath}${baseUrl}[name].[ext]`,
                emitFile: !isSSR,
            },
        },
    },
})
