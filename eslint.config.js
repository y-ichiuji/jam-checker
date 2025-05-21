import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default [
  // 全体の基本設定
  {
    ignores: [
      '**/projects/**/*',
      '**/dist/**',
      '**/node_modules/**',
      '**/.angular/**',
      '**/coverage/**',
    ],
  },

  // JavaScriptとTypeScriptの共通設定
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // TypeScriptファイル用の設定
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // 'import/order'ルールを無効化（prettierによるフォーマットと競合するため）
      'import/order': 'off',
      'prettier/prettier': 'error',
    },
  },

  // HTMLファイル用の設定 - HTMLファイルのリントを無効化
  {
    files: ['**/*.html'],
    ignores: ['**/*.html'], // HTMLファイルをESLintの対象から除外
  },
];
