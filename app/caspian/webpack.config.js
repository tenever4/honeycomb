const path = require('path');
const createConfig = require('@gov.nasa.jpl.honeycomb/webpack-config');
const currentDirectory = path.resolve('.');

const browserConfig = createConfig({
    target: 'web',
    name: 'browser',
    entry: {
        index: path.resolve(currentDirectory, 'src/index.tsx'),
    },
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
            'zlib': require.resolve('browserify-zlib'),
            'net': false,
            'tls': false,
            'fs': false,
            'express': false,
        },
        extensions: [".ts", ".tsx", ".js", ".css", ".scss"]
    },
}, currentDirectory);

const electronConfig = createConfig({
    target: 'electron-renderer',
    entry: {
        index: path.resolve(currentDirectory, 'src/electron/index.tsx'),
    },
    output: {
        path: path.resolve(currentDirectory, 'dist', 'electron'),
        filename: '[name].js',
    },
    resolve: {
        mainFields: ['module', 'main'],
    },
}, currentDirectory);

module.exports = [browserConfig, electronConfig];
