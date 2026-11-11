import eslintConfigPrettier from 'eslint-config-prettier';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import astroPlugin from 'eslint-plugin-astro';
import globals from 'globals';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}', '**/*.astro'];

// Recommended rules only. The type-checked presets need a full program per file and are too slow here.
const tsRecommended = tsPlugin.configs['flat/recommended'].map((config) => ({
  ...config,
  files: config.files ?? TS_FILES,
}));

export default [
  {
    ignores: [
      'dist',
      '**/dist/**',
      '.astro',
      '.wrangler',
      'node_modules',
      'e2e/playwright-report',
      'test-results',
    ],
  },
  ...tsRecommended,
  {
    files: TS_FILES,
    rules: {
      // 1,127 hits when enabled; tracked as a follow-up rather than fixed in one pass.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  ...astroPlugin.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: [
      'scripts/**/*.{js,ts,mjs,cjs}',
      '**/__tests__/**/*.{js,ts,tsx,mjs,cjs}',
      '**/*.{test,spec}.{js,ts,tsx,mjs,cjs}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
      globals: {
        ...globals.browser,
      },
    },
  },
];
