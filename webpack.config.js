'use strict';
var webpack = require('webpack');

const HTMLWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var colors = require('colors');

const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config.json`;
let dhisConfig;

try {
    dhisConfig = require(dhisConfigPath);
    console.log('\nLoaded DHIS config:');
} catch (e) {
    // Failed to load config file - use default config
    console.warn('\nWARNING! Failed to load DHIS config:', e.message);
    console.info('Using default config');
    dhisConfig = {
        baseUrl: 'https://covid-19.health.gov.lk/vaccine/',
        certUrl: 'http://localhost:8080/',
        authorization: process.env.DHIS_AUTH // admin:district
    };
}
console.log(JSON.stringify(dhisConfig, null, 2), '\n');

function bypass(req, res, opt) {
    req.headers.Authorization = dhisConfig.authorization;
}

function makeLinkTags(stylesheets) {
    return function (hash) {
        return stylesheets
            .map(([url, attributes]) => {
                const attributeMap = Object.assign({ media: 'screen' }, attributes);

                const attributesString = Object
                    .keys(attributeMap)
                    .map(key => `${key}="${attributeMap[key]}"`)
                    .join(' ');

                return `<link type="text/css" rel="stylesheet" href="${url}?_=${hash}" ${attributesString} />`;
            })
            .join(`\n`);
    };
}

function makeScriptTags(scripts) {
    return function (hash) {
        return scripts
            .map(script => (`<script src="${script}?_=${hash}"></script>`))
            .join(`\n`);
    };
}

module.exports = {
    context: __dirname,
    entry: './scripts/index.js',
    output: {
        path: path.join(__dirname, '/build'),
        filename: 'app-[hash].js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: [/(node_modules)/],
                loaders: ['ng-annotate-loader', 'babel-loader'],
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(gif|png|jpg|svg)$/,
                loader: 'file-loader'
            },
        ],
        noParse: /node_modules\/leaflet-control-geocoder\/dist\/Control.Geocoder.js/,
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new HTMLWebpackPlugin({
            template: './index.ejs',
            stylesheets: makeLinkTags([
                ['styles/style.css'],
                ['styles/print.css', { media: 'print' }],
            ]),
            scripts: makeScriptTags([
                'core/tracker-capture.js',
                'vendor/main/main.js',
            ]),
        }),
    ],
    devtool: 'sourcemap',
    devServer: {
        contentBase: '.',
        progress: true,
        colors: true,
        port: 8081,
        inline: false,
        compress: false,
        proxy: [
                { path: '/api/**', target: dhisConfig.baseUrl, bypass:bypass, secure: false,changeOrigin: true },
                { path: '/dhis/dhis-web-commons/**', target: dhisConfig.baseUrl, bypass:bypass, secure: false,changeOrigin: true},
                { path: '/dhis-web-commons-ajax-json/**', target: dhisConfig.baseUrl, bypass:bypass , secure: false,changeOrigin: true},
                { path: '/dhis-web-commons-stream/**', target: dhisConfig.baseUrl, bypass:bypass , secure: false,changeOrigin: true},
                { path: '/dhis-web-commons/***', target: dhisConfig.baseUrl, bypass:bypass, proxyTimeout: 1000 * 60 * 5, secure: false,changeOrigin: true },
                { path: '/dhis-web-core-resource/**', target: dhisConfig.baseUrl, bypass:bypass, secure: false,changeOrigin: true },
                { path: '/icons/**', target: dhisConfig.baseUrl, bypass:bypass, secure: false,changeOrigin: true },
                { path: '/images/**', target: dhisConfig.baseUrl, bypass:bypass , secure: false,changeOrigin: true},
                { path: '/main.js', target: dhisConfig.baseUrl, bypass:bypass, secure: false,changeOrigin: true },
                { path: '/cert/**', target: dhisConfig.certUrl, bypass:bypass, secure: false,changeOrigin: true },
        ],
    },
};
