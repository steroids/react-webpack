const _ = require('lodash');

/**
 * @param {Object} rules
 * @return {Array}
 */
module.exports = rules => Object.values(rules)
    .map((item) => {
        if (item && item.use) {
            item.use = _.values(item.use).filter(Boolean);
        }

        return item;
    })
    .filter(Boolean);
