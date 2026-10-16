const prettierPlugin = require('eslint-plugin-prettier');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '.yarn/**',
      'node_modules/**',
      '**/dist/**',
      'output/**',
      '.claude/**',
    ],
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['error'],
      semi: 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
    },
  }
);
