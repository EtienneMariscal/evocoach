const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const i18next = require('eslint-plugin-i18next');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'node_modules/*', 'android/*', 'ios/*', 'coverage/*']),
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      // Reglas de CLAUDE.md: sin console (usar el logger), sin any, sin @ts-ignore.
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Imprescindibles en codigo asincrono (outbox, sincronizacion, repositorios).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Ningun texto visible en JSX sin pasar por i18n.
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
  {
    files: ['*.config.js', '*.config.cjs', '.dependency-cruiser.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.jest },
  },
  prettierConfig,
]);
