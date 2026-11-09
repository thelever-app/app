import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0008-every-category-is-null';
const THIS = '0009-decision-phase';
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

/** As dev and prod leave it: a room whose host is in the middle of a game and answered a dilemma. */
async function gameInProgressBefore(db: Kysely<Database>): Promise<void> {
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['A', 'B'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
    },
    new SequentialIdGenerator('dilemma'),
  );
  await new PostgresDilemmaRepository(db).save(dilemma);
  const [vote] = dilemma.options.map(({ id }) => id);
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
        adults_only, dilemma_language, categories, dilemma_count, total_time_in_minutes,
        new_dilemmas, dilemmas_per_player, current_game_id)
      values ('TestRoom', 'TestAna', 3, 'K7M2Q', 'friends', 'together', 'nominal', false, 'es',
        null, 8, 6, true, 0, 'TestGame')
    `.execute(trx);
    await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'teal')
    `.execute(trx);
    await sql`
      insert into games (id, room_id, in_decision_phase, version, variant, group_nature, place,
        dilemma_language, total_time_in_minutes)
      values ('TestGame', 'TestRoom', true, 2, 'nominal', 'friends', 'together', 'es', 6)
    `.execute(trx);
    await sql`
      insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version, origin)
      values ('TestGame', 0, ${dilemma.id}, 1, 'picked-by-the-system')
    `.execute(trx);
    await sql`
      insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
      select 'TestGame', ${dilemma.id}, option_id, (position - 1)::smallint
      from unnest(${dilemma.options.map(({ id }) => id)}::text[]) with ordinality as options (option_id, position)
    `.execute(trx);
    await sql`
      insert into game_players (game_id, player_id, position) values ('TestGame', 'TestAna', 0)
    `.execute(trx);
    await sql`
      insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
        game_consent_version, research_consent_version, commercial_licence_consent_version,
        under_eighteen, voter_in_the_gap)
      values ('TestGame', 'TestAna', ${dilemma.id}, 1, ${vote}, '0', null, null, true, false)
    `.execute(trx);
  });
}

async function countOf(db: Kysely<Database>, table: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`select count(*) from ${sql.table(table)}`.execute(
    db,
  );
  return Number(rows[0]?.count);
}

describe('the migration of the game by rounds', () => {
  it('should delete the games from before and take their rooms back to the lobby, at a minute per dilemma', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await gameInProgressBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect(await countOf(db, 'games')).toBe(0);
    expect(await countOf(db, 'answers')).toBe(0);
    expect(await countOf(db, 'game_players')).toBe(0);
    const room = await db
      .selectFrom('rooms')
      .select(['id', 'current_game_id', 'absent_host_player_id', 'time_per_dilemma_seconds'])
      .executeTakeFirst();
    expect(room).toEqual({
      id: 'TestRoom',
      current_game_id: null,
      absent_host_player_id: null,
      time_per_dilemma_seconds: 60,
    });
    const players = await db.selectFrom('room_players').select(['id', 'has_left']).execute();
    expect(players).toEqual([{ id: 'TestAna', has_left: false }]);
  });
});
