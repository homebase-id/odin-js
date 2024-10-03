import typescriptEslint from '@typescript-eslint/eslint-plugin';
import reactRefreshEslint from 'eslint-plugin-react-refresh';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/prettierrc.cjs',
      '**/postcss.config.cjs',
      '**/.eslintrc',
      '**/env.d.ts',
    ],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'react-refresh': reactRefreshEslint,
    },

    languageOptions: {
      parser: tsParser,
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      'react/no-children-prop': 'off',
      'ts-ignore': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
