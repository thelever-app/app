import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0024-end-of-the-game';
const THIS = '0025-first-access';
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

describe(THIS, () => {
  it('should take the players already in a room for under 18', async () => {
    // Arrange: a room with its host, as dev and prod have them.
    const db = await databaseAt(BEFORE);
    await db.transaction().execute(async (trx) => {
      await sql`
      insert into rooms (id, code, host_player_id, version, group_nature, place, variant,
        adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at,
        played_dilemma_ids)
      values ('TestRoom', 'K7M2Q', 'TestAna', 0, 'friends', 'together', 'nominal', false, 'es', 60,
        true, now(), '{}')
      `.execute(trx);
      await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face,
        avatar_color, played_dilemma_ids)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'khaki', '{}')
      `.execute(trx);
    });

    // Act
    await migrateTo(db, THIS);

    // Assert
    const { under_eighteen } = await db
      .selectFrom('room_players')
      .select('under_eighteen')
      .executeTakeFirstOrThrow();
    expect(under_eighteen).toBe(true);
  });

  it('should not keep a month of birth without its year', async () => {
    // Arrange
    const db = await databaseAt(THIS);

    // Act & Assert
    await expect(
      sql`
        insert into first_accesses (identity, region, birth_month, last_opened_at)
        values ('TestIdentity', 'eea', 3, now())
      `.execute(db),
    ).rejects.toThrow();
  });
});
