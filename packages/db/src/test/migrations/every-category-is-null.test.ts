import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0007-dilemma-search';
const THIS = '0008-every-category-is-null';
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

/** A room created with every category, as an empty list meant before, and one of a single category. */
async function roomsBefore(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    for (const [id, code, categories] of [
      ['TestEvery', 'K7M2Q', '{}'],
      ['TestHonesty', 'K7M2R', '{honesty}'],
    ] as const) {
      await sql`
        insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
          adults_only, dilemma_language, categories, dilemma_count, total_time_in_minutes,
          new_dilemmas, dilemmas_per_player)
        values (${id}, ${`${id}Ana`}, 1, ${code}, 'friends', 'together', 'nominal', false, 'es',
          ${categories}::text[], 8, 6, true, 0)
      `.execute(trx);
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${`${id}Ana`}, ${id}, 0, 'Ana', ${`${id}AnaIdentity`}, 'face-01', 'teal')
      `.execute(trx);
    }
  });
}

describe('the migration that plays every category with null and none with an empty list', () => {
  it('should keep every category for the rooms saved with an empty list, and the rest as they were', async () => {
    // Arrange: as dev and prod, where an empty list meant every category.
    const db = await databaseAt(BEFORE);
    await roomsBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const rooms = await db.selectFrom('rooms').select(['id', 'categories']).orderBy('id').execute();
    expect(rooms).toEqual([
      { id: 'TestEvery', categories: null },
      { id: 'TestHonesty', categories: ['honesty'] },
    ]);
  });
});
