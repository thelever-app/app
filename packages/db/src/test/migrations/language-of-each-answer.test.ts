import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const THIS = '0031-language-of-each-answer';
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** An empty database of its own, migrated up to `migration`. */
async function databaseAt(migration: string): Promise<Kysely<Database>> {
  const name = `thelever_test_${randomUUID().replaceAll('-', '')}`;
  await onServer((quote) => `CREATE DATABASE ${quote(name)}`);
  const { db, close } = await openDatabase<Database>(
    { kind: 'url', url: urlOf(name) },
    { maxConnections: 2, logger: new ConsoleLogger() },
  );
  cleanups.push(async () => {
    await close();
    await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(name)} WITH (FORCE)`);
  });
  await migrateTo(db, migration);
  return db;
}

describe(`Migration ${THIS}`, () => {
  it('should let each answer keep a language of the app, and nothing else', async () => {
    // Act
    const db = await databaseAt(THIS);

    // Assert
    const { rows } = await sql<{ is_nullable: string }>`
      select is_nullable from information_schema.columns
      where table_name = 'answers' and column_name = 'language'
    `.execute(db);
    expect(rows).toEqual([{ is_nullable: 'YES' }]);
    const { rows: checks } = await sql<{ definition: string }>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conname = 'answers_language'
    `.execute(db);
    expect(checks[0]?.definition).toContain("'ca'");
  });
});
