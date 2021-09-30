// vue.config.js

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
    publicPath: '/',
    outputDir: 'dist',
    pages: {
        index: {
            entry: 'src/client/main.js',
        },
    },
};
