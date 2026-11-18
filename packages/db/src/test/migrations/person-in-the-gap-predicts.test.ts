import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0022-distribution-prediction';
const THIS = '0023-person-in-the-gap-predicts';
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

/**
 * A room in its lobby with a specific round, and a game in progress of a dilemma with the gap where
 * Ana, the person in the gap, and Luis have voted: as dev and prod have them.
 */
async function before(db: Kysely<Database>): Promise<void> {
  // Written as they were: the repository of today writes whether each version has the gap.
  const dilemma = { id: 'TestGapInText', version: 1 };
  const vote = 'TestGapInTextOption1';
  await db.transaction().execute(async (trx) => {
    for (const [id, text, options] of [
      ['TestGapInText', 'TestText about {gap}', ['TestPull', 'TestWait']],
      ['TestGapInAnOption', 'TestText', ['TestPull', 'TestSave {gap}']],
      ['TestWithoutGap', 'TestText', ['TestPull', 'TestWait']],
    ] as const) {
      await sql`
        insert into dilemmas (id, public_id, language, creator_type, visibility)
        values (${id}, ${`${id}Public`}, 'es', 'curation-team', 'public')
      `.execute(trx);
      await sql`
        insert into dilemma_versions (dilemma_id, number, text, category, minimum_age, type,
          compromising, scale, fixed_order, status)
        values (${id}, 1, ${text}, 'honesty', 16, 'standard', false, 'everyday', false, 'in-catalog')
      `.execute(trx);
      for (const [position, option] of options.entries()) {
        await sql`
          insert into dilemma_version_options (dilemma_id, version, position, option_id, text)
          values (${id}, 1, ${position}, ${`${id}Option${position + 1}`}, ${option})
        `.execute(trx);
      }
    }
  });
  await db.transaction().execute(async (trx) => {
    for (const [room, code, host] of [
      ['TestLobbyRoom', 'K7M2Q', 'TestHost'],
      ['TestGameRoom', 'K7M2R', 'TestAna'],
    ] as const) {
      await sql`
        insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
          adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at)
        values (${room}, ${host}, 1, ${code}, 'friends', 'together', 'nominal', false, 'es', 60,
          true, now())
      `.execute(trx);
    }
    for (const [player, room, position] of [
      ['TestAna', 'TestGameRoom', 0],
      ['TestLuis', 'TestGameRoom', 1],
      ['TestHost', 'TestLobbyRoom', 0],
    ] as const) {
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${player}, ${room}, ${position}, ${player}, ${`${player}Identity`}, 'face-01', 'teal')
      `.execute(trx);
    }
    await sql`
      insert into room_rounds (room_id, position, round_id, origin, dilemma_id, minimum_age,
        compromising)
      values ('TestLobbyRoom', 0, 1, 'specific', ${dilemma.id}, 16, false)
    `.execute(trx);
    await sql`
      insert into room_rounds (room_id, position, round_id, origin) values
        ('TestLobbyRoom', 1, 2, 'random')
    `.execute(trx);
    await sql`
      insert into games (id, room_id, version, variant, group_nature, place, dilemma_language,
        time_per_dilemma_seconds)
      values ('TestGame', 'TestGameRoom', 1, 'nominal', 'friends', 'together', 'es', 60)
    `.execute(trx);
    await sql`
      insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version, origin, has_gap,
        person_in_the_gap)
      values ('TestGame', 0, ${dilemma.id}, ${dilemma.version}, 'random', true, 'TestAna')
    `.execute(trx);
    for (const [position, id] of ['TestGapInTextOption1', 'TestGapInTextOption2'].entries()) {
      await sql`
        insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
        values ('TestGame', ${dilemma.id}, ${id}, ${position})
      `.execute(trx);
    }
    for (const [position, player] of ['TestAna', 'TestLuis'].entries()) {
      await sql`
        insert into game_players (game_id, player_id, position) values ('TestGame', ${player}, ${position})
      `.execute(trx);
      await sql`
        insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
          game_consent_version, under_eighteen, voter_in_the_gap, vote_predictions, option_order)
        values ('TestGame', ${player}, ${dilemma.id}, ${dilemma.version}, ${vote}, 'TestConsent',
          false, ${player === 'TestAna'}, '[]'::jsonb, ${[vote]})
      `.execute(trx);
    }
  });
}

describe('the migration that lets the person in the gap predict without voting', () => {
  it('should leave without a vote a person in the gap who voted a game in progress', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await before(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const answers = await db
      .selectFrom('answers')
      .select(['player_id', 'vote'])
      .orderBy('player_id')
      .execute();
    expect(answers).toEqual([
      { player_id: 'TestAna', vote: null },
      { player_id: 'TestLuis', vote: expect.any(String) },
    ]);
  });

  it('should keep the dilemmas of the games and of the lobbies with what the rules now need', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await before(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect(await db.selectFrom('game_dilemmas').select('fixed_order').execute()).toEqual([
      { fixed_order: false },
    ]);
    expect(
      await db.selectFrom('room_players').select('played_dilemma_ids').distinct().execute(),
    ).toEqual([{ played_dilemma_ids: [] }]);
    expect(
      await db
        .selectFrom('room_rounds')
        .select(['round_id', 'type', 'scale', 'has_gap'])
        .orderBy('round_id')
        .execute(),
    ).toEqual([
      { round_id: 1, type: 'standard', scale: 'everyday', has_gap: false },
      { round_id: 2, type: null, scale: null, has_gap: null },
    ]);
  });

  it('should keep whether each version has the gap, in its text or in an option', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await before(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect(
      await db
        .selectFrom('dilemma_versions')
        .select(['dilemma_id', 'has_gap'])
        .orderBy('dilemma_id')
        .execute(),
    ).toEqual([
      { dilemma_id: 'TestGapInAnOption', has_gap: true },
      { dilemma_id: 'TestGapInText', has_gap: true },
      { dilemma_id: 'TestWithoutGap', has_gap: false },
    ]);
  });
});
