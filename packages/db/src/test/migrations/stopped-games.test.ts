import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0027-late-players-play-fully';
const THIS = '0028-stopped-games';
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

/** A game on its third round, as dev and prod may have one. */
async function gameInItsRounds(db: Kysely<Database>): Promise<void> {
  // In one transaction: the room and its host refer to each other.
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
        adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at,
        played_dilemma_ids, compromising_dilemmas)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'friends', 'together', 'nominal', false, 'es',
        60, true, now(), '{}', false)
    `.execute(trx);
    for (const [player, position] of [
      ['TestAna', 0],
      ['TestPedro', 1],
    ] as const) {
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face,
          avatar_color, played_dilemma_ids, under_eighteen)
        values (${player}, 'TestRoom', ${position}, ${player}, ${`${player}Identity`}, 'face-01',
          'teal', '{}', false)
      `.execute(trx);
    }
    await sql`
      insert into games (id, room_id, version, variant, group_nature, place, dilemma_language,
        time_per_dilemma_seconds, round_position, round_phase, round_started_at, round_ends_at,
        ambience)
      values ('TestGame', 'TestRoom', 1, 'nominal', 'friends', 'together', 'es', 60, 2, 'decision',
        now(), now() + interval '1 minute', 'classic')
    `.execute(trx);
  });
}

describe(`Migration ${THIS}`, () => {
  it('should let a game be stopped by who restarted it', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameInItsRounds(db);
    await migrateTo(db, THIS);

    // Act
    await db
      .updateTable('games')
      .set({ stage: 'stopped', stage_moved_on_by: 'TestAna' })
      .where('id', '=', 'TestGame')
      .execute();

    // Assert
    const game = await db.selectFrom('games').select('stage').executeTakeFirstOrThrow();
    expect(game.stage).toBe('stopped');
  });

  it('should still turn down a stage it does not know', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameInItsRounds(db);
    await migrateTo(db, THIS);

    // Act
    const unknown = sql`update games set stage = 'paused', stage_moved_on_by = 'TestAna'`.execute(
      db,
    );

    // Assert
    await expect(unknown).rejects.toThrow(/games_stage/);
  });
});
