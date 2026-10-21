import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', '**/coverage/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // A brace-less body must fit on the same line as its `if`, `for` or `while`.
    rules: { curly: ['error', 'multi-line'] },
  },
  {
    files: [
      'apps/realtime/**/*.ts',
      'packages/**/*.{ts,js}',
      'tests/**/*.ts',
      '.github/**/*.ts',
      '*.{js,ts}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/room/simulated-room-connection.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@thelever-app/game',
                '@thelever-app/game/*',
                '@thelever-app/dilemmas',
                '@thelever-app/dilemmas/*',
              ],
              message:
                'Only the simulated room may use the domain contexts. Use RoomConnection and @thelever-app/protocol.',
            },
          ],
        },
      ],
    },
  },
]);
