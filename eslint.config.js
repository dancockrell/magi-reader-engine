import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

/**
 * The rules that stop this ageing badly.
 *
 * Two of them are here because of defects already made in this project
 * rather than as a matter of taste:
 *
 *   react-hooks/exhaustive-deps  — a suppression comment was written for
 *     this rule before the rule was installed, which hid a setState
 *     during render and a mutation inside useMemo. Both are legal-looking
 *     today and break under concurrent rendering.
 *
 *   no-unused-disable-directives — so a suppression for a rule that is
 *     not switched on is itself an error. That is what let the above
 *     hide in plain sight.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'src/books/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': hooks, 'jsx-a11y': a11y },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...hooks.configs.recommended.rules,
      ...a11y.flatConfigs.recommended.rules,

      /* The reader is handed student-typed text everywhere. */
      'react/no-danger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',

      /* Silent failure is the enemy: an empty catch is how the original
         lost a whole class's work without anybody noticing. */
      'no-empty': ['error', { allowEmptyCatch: false }],

      /* Prop shapes are checked by TypeScript against the JSDoc types
         (tsconfig has checkJs), which understands them properly. Runtime
         prop-types would be a second, weaker declaration of the same
         thing and they drift apart. */
      'react/prop-types': 'off',

      /* exhaustive-deps ships as a warning; here it is an error. Every
         stale-closure bug in the original reader was this shape. */
      'react-hooks/exhaustive-deps': 'error',

      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['**/*.test.{js,jsx}', 'tools/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: { 'no-console': 'off' },
  },

  /* last, so formatting rules never fight Prettier */
  prettier,
];
