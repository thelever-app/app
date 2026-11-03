import { defineConfig } from 'vitest/config';

// Each app and package is a Vitest project with its own config (or the defaults).
// packages/db needs PostgreSQL, so only `pnpm test:db` runs it.
export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*', '!packages/db'],
    passWithNoTests: true,
  },
});
