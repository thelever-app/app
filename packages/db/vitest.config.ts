import { defineProject } from 'vitest/config';

// Run only by `pnpm test:db`: `pnpm test` leaves this project out, so it never needs PostgreSQL.
export default defineProject({
  test: {
    name: 'db',
    environment: 'node',
    globalSetup: ['./src/test/support/global-setup.ts'],
  },
});
