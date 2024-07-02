module.exports = [
  {
    extends: ['prettier'],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': ['error'],
      semi: 'error',
      'prefer-const': 'error',
    },
    ignores: ['.yarn/*', 'node_modules/*', '**/dist/**'],
  },
];
