let win;

if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    win = window;
} else {
    win = {
        getComputedStyle() {
            return {
                getPropertyValue() {},
            };
        },
        addEventListener() {},
        removeEventListener() {},
        location: {}
    };
}

module.exports = win;
