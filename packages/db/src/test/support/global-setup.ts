import { existsSync } from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateToLatest } from '../../migrator.ts';
import { onServer, TEMPLATE_DATABASE, urlOf } from './test-database.ts';

// Locally, DATABASE_URL comes from the .env of the repo; in CI, from the workflow.
const ENV_FILE = path.join(import.meta.dirname, '../../../../../.env');

/**
 * Creates the template database from scratch and migrates it, once per run; drops it at the end.
 * Any project whose tests use a test database runs it as its global setup.
 */
export default async function setup(): Promise<() => Promise<void>> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(TEMPLATE_DATABASE)} WITH (FORCE)`);
  await onServer((quote) => `CREATE DATABASE ${quote(TEMPLATE_DATABASE)}`);
  // A database with an open connection cannot be copied: close it before the files copy it.
  const { db, close } = await openDatabase<unknown>(
    { kind: 'url', url: urlOf(TEMPLATE_DATABASE) },
    { maxConnections: 1, logger: new ConsoleLogger() },
  );
  try {
    await migrateToLatest(db);
  } finally {
    await close();
  }

  return async () => {
    await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(TEMPLATE_DATABASE)} WITH (FORCE)`);
  };
}
