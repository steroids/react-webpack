# Steroids Webpack

Configure webpack easily!

Create webpack.js file in project root dir:

```js
require('@steroidsjs/webpack')
    .config({
        baseUrl: 'frontend/',
        staticPath: '',
        sourcePath: __dirname + '/src',
        devServer: {
            historyApiFallback: {
                index: '/frontend/index.html',
            },
            proxy: [
                {
                    context: ['/api'],
                    target: process.env.APP_BACKEND_URL || 'http://api-for-my-project.loc',
                    changeOrigin: true,
                },
            ],
        },
    })
    .base(__dirname + '/src/index.tsx');

```
