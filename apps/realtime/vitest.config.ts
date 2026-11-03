import { configDefaults, defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'realtime',
    environment: 'node',
    // Those need PostgreSQL: only `pnpm test:db` runs them, with vitest.db.config.ts.
    exclude: [...configDefaults.exclude, '**/*.db.test.ts'],
  },
});
