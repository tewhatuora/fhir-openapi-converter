const path = require('path');
const webpack = require('webpack');

module.exports = {
  target: 'node',
  entry: './src/cli.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cli.js',
  },
  resolve: {
    // '.ts' is last so packages that ship both .js and .ts files resolve to .js.
    extensions: ['.js', '.json', '.wasm', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        // Type checking is done by `yarn typecheck`.
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin({
      raw: true,
      banner: '#!/usr/bin/env node',
    }),
  ],
};
