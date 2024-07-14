const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      semi: 'error',
      'prefer-const': 'error',
    },
    ignores: ['.yarn/*', 'node_modules/*', '**/dist/**'],
  },
];
