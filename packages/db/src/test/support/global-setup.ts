import { openDatabase } from '../../connection.ts';
import { migrateToLatest } from '../../migrator.ts';
import { onServer, TEMPLATE_DATABASE, urlOf } from './test-database.ts';

/** Creates the template database from scratch and migrates it, once per run; drops it at the end. */
export default async function setup(): Promise<() => Promise<void>> {
  await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(TEMPLATE_DATABASE)} WITH (FORCE)`);
  await onServer((quote) => `CREATE DATABASE ${quote(TEMPLATE_DATABASE)}`);
  // A database with an open connection cannot be copied: close it before the files copy it.
  const { db, close } = await openDatabase<unknown>(
    { kind: 'url', url: urlOf(TEMPLATE_DATABASE) },
    { maxConnections: 1 },
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
