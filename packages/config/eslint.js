import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** The bounded contexts, each in its own package (ADR 0001). */
const CONTEXTS = ['game', 'dilemmas', 'consent', 'events', 'moderation'];

/** Every entry of these packages. */
const entriesOf = (packages) =>
  packages.flatMap((name) => [`@thelever-app/${name}`, `@thelever-app/${name}/*`]);

/** A context never imports another context, nor the adapters that live outside it. */
const otherContexts = (context) => ({
  group: entriesOf([...CONTEXTS.filter((other) => other !== context), 'db', 'integrations']),
  message:
    'A context never imports another one (ADR 0001): declare a port, and let packages/integrations adapt what the other publishes.',
});

/** No package reaches into the sources of another one by a relative path, which skips its entries. */
const intoAnotherPackage = {
  regex: `(^|/)\\.\\./(?:${[...CONTEXTS, 'db', 'integrations'].join('|')})/src/`,
  message: 'Import another package by its name and its entries, never by a path into its sources.',
};

/** Its domain and its application never import its adapters, by a path or by its own entries. */
const ownAdapters = (context) => [
  {
    regex: '(^|/)adapters/',
    message: 'The domain and the application depend on ports, never on adapters (ADR 0001).',
  },
  {
    group: entriesOf([context]),
    message: 'The domain and the application depend on ports, never on adapters (ADR 0001).',
  },
];

const contextRules = CONTEXTS.flatMap((context) => [
  {
    files: [`packages/${context}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [otherContexts(context), intoAnotherPackage] },
      ],
    },
  },
  {
    // Flat config replaces a rule for the files it matches, so this one carries both patterns.
    files: [`packages/${context}/src/{domain,application}/**/*.ts`],
    ignores: ['**/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [otherContexts(context), intoAnotherPackage, ...ownAdapters(context)] },
      ],
    },
  },
]);

/**
 * An anticorruption layer, in the folder of the context it serves, implements that context's ports
 * from its main entry on top of what the others publish, from their `/published` entry.
 */
const integrationRules = [
  ...CONTEXTS.map((context) => {
    const others = CONTEXTS.filter((other) => other !== context).join('|');
    return integrationRule(
      [`packages/integrations/src/${context}/**/*.ts`],
      `^@thelever-app/(?:(?:${others})(?:/(?!published$).*)?|${context}/.*|db(?:/.*)?)$`,
      `An integration for ${context} uses the ports of ${context} and the /published entry of the others (ADR 0001).`,
    );
  }),
  // Outside the folder of a context, it serves none: only what the contexts publish.
  integrationRule(
    ['packages/integrations/src/*.ts'],
    `^@thelever-app/(?:(?:${CONTEXTS.join('|')})(?:/(?!published$).*)?|db(?:/.*)?)$`,
    'Outside the folder of a context, an integration uses only the /published entries (ADR 0001).',
  ),
];

function integrationRule(files, regex, message) {
  return {
    files,
    ignores: ['**/test/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex, message }, intoAnotherPackage] }],
    },
  };
}

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
      'ops/**/*.ts',
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
                '@thelever-app/integrations',
                '@thelever-app/integrations/*',
              ],
              message:
                'Only the simulated room may use the domain contexts. Use RoomConnection and @thelever-app/protocol.',
            },
          ],
        },
      ],
    },
  },
  ...contextRules,
  ...integrationRules,
]);
