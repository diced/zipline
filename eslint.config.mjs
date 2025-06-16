// TODO: migrate everything to use eslint 9 features instead of compatibility layers

import unusedImports from 'eslint-plugin-unused-imports';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { includeIgnoreFile } from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const gitignorePath = path.resolve(__dirname, '.gitignore');

const eslintConfig = [
  includeIgnoreFile(gitignorePath),
  ...compat.extends(
    'next/core-web-vitals',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
  ),
  {
    plugins: {
      'unused-imports': unusedImports,
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
    },

    rules: {
      'linebreak-style': ['error', 'unix'],

      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],

      semi: ['error', 'always'],
      'jsx-quotes': ['error', 'prefer-single'],
      indent: 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',
      'react/no-danger-with-children': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'warn',
      'react/no-is-mounted': 'warn',
      'react/no-typos': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/require-render-return': 'error',
      'react/style-prop-object': 'warn',
      'jsx-a11y/alt-text': 'off',
      'react/display-name': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn', // 完全關閉
      'unused-imports/no-unused-vars': 'off', // 完全關閉

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];

export default eslintConfig;
