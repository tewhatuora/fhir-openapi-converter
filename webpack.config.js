const path = require('path');
const webpack = require('webpack');

module.exports = {
  target: 'node',
  entry: './src/cli.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cli.js',
  },
  plugins: [
    new webpack.BannerPlugin({
      raw: true,
      banner: '#!/usr/bin/env node',
    }),
  ],
};
