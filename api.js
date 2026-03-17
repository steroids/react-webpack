const { glob } = require('glob-promise');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const utils = require('./utils');
const getConfigDefault = require('./config.default');

/**
 * @typedef {Object} SteroidsWebpackConfig
 * @property {string=} cwd Working directory of the project (defaults to `process.cwd()`).
 * @property {string=} host Dev-server host (defaults to `'127.0.0.1'`).
 * @property {number=} port Dev-server port, e.g. `9991`.
 * @property {string=} outputPath Path to build output directory (defaults to `public`).
 * @property {string=} staticPath Public path to static assets.
 * @property {string=} sourcePath Path to frontend source code (defaults to `src`).
 * @property {string=} baseUrl Base URL for frontend assets (defaults to `'frontend/'`).
 * @property {boolean=} useHash Whether to use hash in filenames (defaults based on `NODE_ENV`).
 * @property {boolean=} useCache Enable build cache.
 * @property {boolean=} inlineSvg Inline SVG on import (`true` / `false`).
 * @property {string=} serverPath Entry point of the SSR server.
 * @property {string=} applicationPath Entry point of the React application.
 * @property {string=} initActionPath Path to initial layout/bootstrapping component.
 * @property {string[]=} languages List of supported locale codes.
 * @property {Object=} ssr Extra SSR configuration.
 * @property {Object=} webpack Extra webpack configuration, merged with defaults.
 * @property {Object=} devServer Extra devServer configuration, merged with defaults.
 */

module.exports = {

    _entries: [],
    _config: {},
    _webpackConfig: {},

    /**
     * Sets custom configuration for `@steroidsjs/webpack`.
     *
     * Example:
     * ```js
     * require('@steroidsjs/webpack').config({
     *     inlineSvg: true,
     *     port: 9991,
     * });
     * ```
     *
     * @param {SteroidsWebpackConfig} value
     * @return {exports}
     */
    config(value) {
        this._config = value;
        return this;
    },

    isProduction() {
        return utils.isProduction();
    },

    isSSR() {
        return utils.isSSR();
    },

    isTestSSR() {
        return utils.isTestSSR();
    },

    /**
     * Index js. Core module at first
     * @param {string} path
     * @return {exports}
     */
    base(path) {
        const result = glob.globSync(path, { absolute: true })
        this._entries.push({
            index: result,
        });
        return this;
    },

    /**
     * Add any entry to webpack (js/css/...)
     * @param {string} path
     * @param {string} name
     * @returns {exports}
     */
    entry(path, name) {
        this._entries.push(
            glob.glob(path)
                .then(result => ({
                    [name]: result
                }))
        );
        return this;
    },

    /**
     * Module styles
     * @param {string} path
     * @param {null|string} name
     * @return {exports}
     */
    styles(path, name = null) {
        if (typeof name === 'string') {
            this._entries.push(
                glob.glob(path)
                    .then(result => ({
                        ['style' + (name ? '-' + name : '')]: result
                    }))
            );
        } else {
            this._entries.push(
                glob.glob(path)
                    .then(result => result.reduce((obj, file) => {
                        const name = file.match(/([^\/]+)\.(less|scss)$/)[1].replace(/^index/, 'style');
                        obj[name] = obj[name] || [];
                        obj[name].push(file);
                        return obj;
                    }, {})
                    )
            );
        }
        return this;
    },

    _fetchEntries() {
        return new Promise(resolve => {
            setTimeout(() => {
                ['tsx', 'ts', 'jsx', 'js'].forEach(ext => {
                    const config = _.merge(getConfigDefault(), this._config);
                    const indexPath = path.resolve(config.sourcePath, 'index.' + ext);
                    if (this._entries.length === 0 && fs.existsSync(indexPath)) {
                        this.base(indexPath);
                    }
                });

                resolve(Promise.all(this._entries));
            })
        });
    }

};
