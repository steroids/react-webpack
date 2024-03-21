const { glob } = require('glob-promise');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const utils = require('./utils');
const getConfigDefault = require('./config.default');

module.exports = {

    _entries: [],
    _config: {},
    _webpackConfig: {},

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
