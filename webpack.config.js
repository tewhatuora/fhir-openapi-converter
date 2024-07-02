const path = require('path');

module.exports = {
  target: 'node',
  entry: './src/cli.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cli.js',
  },
};
