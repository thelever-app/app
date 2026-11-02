import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

// The room server on PostgreSQL, several instances at once; run by `pnpm test:db`.
export default defineProject({
  test: {
    name: 'realtime-db',
    environment: 'node',
    include: ['src/**/*.db.test.ts'],
    globalSetup: [fileURLToPath(import.meta.resolve('@thelever-app/db/test/global-setup'))],
  },
});
