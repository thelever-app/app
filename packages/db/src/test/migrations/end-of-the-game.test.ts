import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0023-person-in-the-gap-predicts';
const THIS = '0024-end-of-the-game';
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

/** A room whose anonymous game is on its ranking, as dev and prod may have one. */
async function gameOnItsRanking(db: Kysely<Database>): Promise<void> {
  // In one transaction: the room and its host refer to each other.
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
        adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'friends', 'together', 'anonymous', false, 'es',
        60, true, now())
    `.execute(trx);
    await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face,
        avatar_color, played_dilemma_ids)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'teal', '{}')
    `.execute(trx);
    await sql`
      insert into games (id, room_id, version, variant, group_nature, place, dilemma_language,
        time_per_dilemma_seconds, stage, stage_moved_on_by)
      values ('TestGame', 'TestRoom', 9, 'anonymous', 'friends', 'together', 'es', 60, 'results',
        'TestAna')
    `.execute(trx);
  });
}

describe(`Migration ${THIS}`, () => {
  it('should leave a game in its results on their first screen, and a room with nothing played before', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameOnItsRanking(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const game = await db
      .selectFrom('games')
      .select(['stage', 'stage_step', 'round_revealed_at'])
      .executeTakeFirstOrThrow();
    expect(game).toEqual({ stage: 'results', stage_step: 0, round_revealed_at: null });
    const room = await db
      .selectFrom('rooms')
      .select('played_dilemma_ids')
      .executeTakeFirstOrThrow();
    expect(room.played_dilemma_ids).toEqual([]);
  });

  it('should keep the step only in the results', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameOnItsRanking(db);
    await migrateTo(db, THIS);

    // Act
    const ended = db
      .updateTable('games')
      .set({ stage: 'ended', stage_step: 0 })
      .where('id', '=', 'TestGame')
      .execute();

    // Assert
    await expect(ended).rejects.toThrow(/games_stage_step_in_the_results/);
  });
});
