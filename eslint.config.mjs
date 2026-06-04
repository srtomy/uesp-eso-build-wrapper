import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'vendor/', 'node_modules/'],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // This codebase interfaces with a browser JS engine via global scope injection.
      // `any` is unavoidable when reading/writing g_Eso* globals.
      '@typescript-eslint/no-explicit-any': 'warn',

      // The DOM mock in env-setup.ts has many callback params that must match
      // jQuery-like signatures but aren't always used internally.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // env-setup.ts uses the `Function` type intentionally for jQuery-like stubs.
      '@typescript-eslint/no-unsafe-function-type': 'warn',

      // CommonJS require() calls are used in loader.ts and index.ts intentionally.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettierConfig,
];
