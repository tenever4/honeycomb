const path = require('path');
const createConfig = require('@gov.nasa.jpl.honeycomb/webpack-config');
const currentDirectory = path.resolve('.');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const analysisConfig = createConfig({
    target: 'web',
    entry: {
        index: path.resolve(currentDirectory, 'src/index.tsx'),
    },
    plugins: [
        new BundleAnalyzerPlugin({
            generateStatsFile: true,
        }),
    ],
    devtool: 'source-map',
    output: {
        path: path.resolve(currentDirectory, 'dist', 'browser'),
        filename: '[name].js',
    },
    resolve: {
        fallback: {
            'path': require.resolve('path-browserify'),
            'crypto': require.resolve('crypto-browserify'),
            'stream': require.resolve('stream-browserify'),
            'os': require.resolve('os-browserify/browser'),
            'http': require.resolve('stream-http'),
            'https': require.resolve('https-browserify'),
            'net': false,
            'tls': false,
            'fs': false,
            'express': false,
        },
    },
}, currentDirectory);

module.exports = analysisConfig;
