import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import pg from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { openDatabase } from '../../connection.ts';

/** Migrated once per run; every test file copies it. */
export const TEMPLATE_DATABASE = 'thelever_test_template';

/** The server the tests run against: that of DATABASE_URL, which `pnpm test:db` needs. */
function serverUrl(): URL {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error('pnpm test:db needs DATABASE_URL, such as the one in .env.example');
  }
  return new URL(DATABASE_URL);
}

export function urlOf(database: string): string {
  const url = serverUrl();
  url.pathname = `/${database}`;
  return url.href;
}

/** Runs a statement that creates or drops a database, from the database of DATABASE_URL. */
export async function onServer(statement: (quote: (name: string) => string) => string) {
  const client = new pg.Client({ connectionString: serverUrl().href });
  await client.connect();
  try {
    await client.query(statement((name) => client.escapeIdentifier(name)));
  } finally {
    await client.end();
  }
}

/**
 * Gives the test file a database of its own, copied from the migrated template before its tests and
 * dropped after them, so files run in parallel without seeing each other's rows or notifications.
 */
export function useTestDatabase<DB = unknown>(): {
  readonly db: () => Kysely<DB>;
  readonly url: () => string;
} {
  const name = `thelever_test_${randomUUID().replaceAll('-', '')}`;
  let opened: { readonly db: Kysely<DB>; readonly close: () => Promise<void> } | undefined;

  beforeAll(async () => {
    await onServer(
      (quote) => `CREATE DATABASE ${quote(name)} TEMPLATE ${quote(TEMPLATE_DATABASE)}`,
    );
    opened = await openDatabase<DB>({ kind: 'url', url: urlOf(name) }, { maxConnections: 5 });
  });

  afterAll(async () => {
    await opened?.close();
    await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(name)} WITH (FORCE)`);
  });

  return {
    db: () => {
      if (!opened) throw new Error('the test database opens before the tests of the file');
      return opened.db;
    },
    url: () => urlOf(name),
  };
}
