import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0021-rounds';
const THIS = '0022-distribution-prediction';
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

/** A game in progress of each variant, as dev and prod have them, where Ana has voted the first dilemma. */
async function gamesBefore(db: Kysely<Database>): Promise<void> {
  // The repository of today writes them as they were, and whether each version has the gap, which
  // a later migration adds: this one neither reads nor changes it.
  await sql`alter table dilemma_versions add column has_gap boolean`.execute(db);
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['TestPull', 'TestWait'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    new SequentialIdGenerator('dilemma'),
  );
  await new PostgresDilemmaRepository(db).save(dilemma);
  const [vote] = dilemma.options.map(({ id }) => id);
  await db.transaction().execute(async (trx) => {
    for (const [variant, code] of [
      ['nominal', 'K7M2Q'],
      ['anonymous', 'K7M2R'],
    ] as const) {
      const room = `Test${variant}Room`;
      const ana = `Test${variant}Ana`;
      const game = `Test${variant}Game`;
      await sql`
        insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
          adults_only, dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at)
        values (${room}, ${ana}, 1, ${code}, 'friends', 'together', ${variant}, false, 'es', 60,
          true, now())
      `.execute(trx);
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${ana}, ${room}, 0, 'Ana', ${`${ana}Identity`}, 'face-01', 'teal')
      `.execute(trx);
      await sql`
        insert into games (id, room_id, version, variant, group_nature, place, dilemma_language,
          time_per_dilemma_seconds)
        values (${game}, ${room}, 1, ${variant}, 'friends', 'together', 'es', 60)
      `.execute(trx);
      await sql`
        insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version, origin, has_gap)
        values (${game}, 0, ${dilemma.id}, ${dilemma.version}, 'random', false)
      `.execute(trx);
      for (const [position, { id }] of dilemma.options.entries()) {
        await sql`
          insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
          values (${game}, ${dilemma.id}, ${id}, ${position})
        `.execute(trx);
      }
      await sql`
        insert into game_players (game_id, player_id, position) values (${game}, ${ana}, 0)
      `.execute(trx);
      await sql`
        insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
          game_consent_version, under_eighteen, voter_in_the_gap, vote_predictions, option_order)
        values (${game}, ${ana}, ${dilemma.id}, ${dilemma.version}, ${vote}, 'TestConsent', false,
          false, '[]'::jsonb, ${[vote]})
      `.execute(trx);
    }
  });
}

describe('the migration that keeps the distribution prediction and the stage of each game', () => {
  it('should keep complete the answers that anonymous games already had, without a prediction', async () => {
    // Arrange: as dev and prod, with games in progress.
    const db = await databaseAt(BEFORE);
    await gamesBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const answers = await db
      .selectFrom('answers')
      .select(['game_id', 'distribution_prediction', 'ready'])
      .orderBy('game_id')
      .execute();
    expect(answers).toEqual([
      { game_id: 'TestanonymousGame', distribution_prediction: null, ready: true },
      { game_id: 'TestnominalGame', distribution_prediction: null, ready: false },
    ]);
  });

  it('should leave every game in its rounds', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gamesBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const games = await db.selectFrom('games').select(['stage', 'stage_moved_on_by']).execute();
    expect(games).toEqual([
      { stage: 'rounds', stage_moved_on_by: null },
      { stage: 'rounds', stage_moved_on_by: null },
    ]);
  });
});
