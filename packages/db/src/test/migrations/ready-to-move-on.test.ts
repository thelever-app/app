import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0031-language-of-each-answer';
const THIS = '0032-ready-to-move-on';
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

/** A game on the reveal of its third round, as dev and prod may have one. */
async function gameInItsRounds(db: Kysely<Database>): Promise<void> {
  // In one transaction: the room and its host refer to each other.
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, place, variant, adults_only,
        dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at,
        played_dilemma_ids, compromising_dilemmas)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'together', 'nominal', false, 'es', 60, true,
        now(), '{}', false)
    `.execute(trx);
    await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face,
        avatar_color, played_dilemma_ids, under_eighteen)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'teal', '{}', false)
    `.execute(trx);
    await sql`
      insert into games (id, room_id, version, variant, place, dilemma_language,
        time_per_dilemma_seconds, round_position, round_phase, round_started_at, round_ends_at,
        round_revealed_by, ambience)
      values ('TestGame', 'TestRoom', 1, 'nominal', 'together', 'es', 60, 2, 'reveal',
        now(), now() + interval '1 minute', 'host', 'classic')
    `.execute(trx);
  });
}

describe(`Migration ${THIS}`, () => {
  it('should leave nobody ready to move on in the games there are', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameInItsRounds(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const game = await db.selectFrom('games').select('ready_to_move_on').executeTakeFirstOrThrow();
    expect(game.ready_to_move_on).toEqual([]);
  });

  it('should let a game reach its results without a host who moved everyone there', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameInItsRounds(db);
    await migrateTo(db, THIS);

    // Act
    await db
      .updateTable('games')
      .set({ stage: 'results', stage_step: 0, stage_moved_on_by: null })
      .where('id', '=', 'TestGame')
      .execute();

    // Assert
    const game = await db.selectFrom('games').select('stage').executeTakeFirstOrThrow();
    expect(game.stage).toBe('results');
  });

  it.each([
    { stage: 'rounds', movedOnBy: 'TestAna' },
    { stage: 'stopped', movedOnBy: null },
  ])(
    'should still turn down a game in $stage moved on by $movedOnBy',
    async ({ stage, movedOnBy }) => {
      // Arrange
      const db = await databaseAt(BEFORE);
      await gameInItsRounds(db);
      await migrateTo(db, THIS);

      // Act
      const wrong =
        sql`update games set stage = ${stage}, stage_moved_on_by = ${movedOnBy}`.execute(db);

      // Assert
      await expect(wrong).rejects.toThrow(/games_moved_on_by/);
    },
  );
});
