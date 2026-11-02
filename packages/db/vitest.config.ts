import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineProject } from 'vitest/config';

// Locally, DATABASE_URL comes from the .env of the repo; in CI, from the workflow.
const ENV_FILE = path.join(import.meta.dirname, '../../.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// Run only by `pnpm test:db`: `pnpm test` leaves this project out, so it never needs PostgreSQL.
export default defineProject({
  test: {
    name: 'db',
    environment: 'node',
    globalSetup: ['./src/test/support/global-setup.ts'],
  },
});
