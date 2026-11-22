import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0025-first-access';
const THIS = '0026-ambiences';
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
  it('should keep compromising dilemmas off, every random round of any content and older games custom', async () => {
    // Arrange: a room with its host, a random round and a game, as dev and prod have them.
    const db = await databaseAt(BEFORE);
    await db.transaction().execute(async (trx) => {
      await sql`
      insert into rooms (id, code, host_player_id, version, group_nature, place, variant,
        adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at,
        played_dilemma_ids)
      values ('TestRoom', 'K7M2Q', 'TestAna', 0, 'friends', 'together', 'anonymous', true, 'es', 60,
        true, now(), '{}')
      `.execute(trx);
      await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face,
        avatar_color, played_dilemma_ids, under_eighteen)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'khaki', '{}', false)
      `.execute(trx);
      await sql`
      insert into room_rounds (room_id, position, round_id, origin)
      values ('TestRoom', 0, 1, 'random'), ('TestRoom', 1, 2, 'players')
      `.execute(trx);
      await sql`
      insert into games (id, room_id, stage, version, variant, group_nature, place,
        dilemma_language, time_per_dilemma_seconds)
      values ('TestGame', 'TestRoom', 'rounds', 0, 'anonymous', 'friends', 'together', 'es', 60)
      `.execute(trx);
    });

    // Act
    await migrateTo(db, THIS);

    // Assert
    const room = await db
      .selectFrom('rooms')
      .select('compromising_dilemmas')
      .executeTakeFirstOrThrow();
    // The content of the rounds as this migration left it, before later ones changed its shape.
    const { rows: rounds } = await sql<{
      round_id: number;
      content: string | null;
    }>`select round_id, content from room_rounds order by position`.execute(db);
    const game = await db.selectFrom('games').select('ambience').executeTakeFirstOrThrow();
    expect(room.compromising_dilemmas).toBe(false);
    expect(rounds).toEqual([
      { round_id: 1, content: 'any' },
      { round_id: 2, content: null },
    ]);
    expect(game.ambience).toBe('custom');
  });
});
