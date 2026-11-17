import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0020-world-results';
const THIS = '0021-rounds';
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
 * Lobbies from before: one of every category with 6 dilemmas and a dilemma picked and one added,
 * and one of honesty with 8.
 */
async function lobbiesBefore(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    for (const [id, code, categories, count] of [
      ['TestEvery', 'K7M2Q', null, 6],
      ['TestHonesty', 'K7M2R', ['honesty'], 8],
    ] as const) {
      await sql`
        insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
          adults_only, dilemma_language, categories, dilemma_count, time_per_dilemma_seconds,
          new_dilemmas, dilemmas_per_player, last_connected_at, first_dilemma_id,
          first_dilemma_minimum_age, first_dilemma_compromising)
        values (${id}, ${`${id}Ana`}, 1, ${code}, 'friends', 'together', 'nominal', false, 'es',
          ${categories}, ${count}, 60, true, 1, now(), 'TestFirst', 16, false)
      `.execute(trx);
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${`${id}Ana`}, ${id}, 0, 'Ana', ${`${id}AnaIdentity`}, 'face-01', 'teal')
      `.execute(trx);
    }
    await sql`
      insert into room_picked_dilemmas (room_id, position, dilemma_id, minimum_age, compromising)
      values ('TestEvery', 0, 'TestPicked', 16, false)
    `.execute(trx);
    await sql`
      insert into room_added_dilemmas (room_id, player_id, position, dilemma_id, minimum_age,
        compromising)
      values ('TestEvery', 'TestEveryAna', 0, 'TestAdded', 16, false)
    `.execute(trx);
  });
}

describe('the migration that gives each room its rounds', () => {
  it('should give each room in the lobby as many random rounds as it had dilemmas, from its categories', async () => {
    // Arrange: as dev and prod, with rooms in the lobby.
    const db = await databaseAt(BEFORE);
    await lobbiesBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const rounds = await db
      .selectFrom('room_rounds')
      .select(['room_id', 'round_id', 'origin', 'categories', 'dilemma_id'])
      .orderBy('room_id')
      .orderBy('position')
      .execute();
    const of = (roomId: string) => rounds.filter(({ room_id }) => room_id === roomId);
    expect(of('TestEvery')).toEqual(
      Array.from({ length: 6 }, (_, index) => ({
        room_id: 'TestEvery',
        round_id: index + 1,
        origin: 'random',
        categories: null,
        dilemma_id: null,
      })),
    );
    expect(of('TestHonesty')).toHaveLength(8);
    expect(of('TestHonesty').every(({ categories }) => categories?.join() === 'honesty')).toBe(
      true,
    );
  });

  it('should keep in each game who chose each dilemma, with the origins of the rounds', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const { rows: columns } = await sql<{ column_name: string }>`
      select column_name from information_schema.columns
      where table_name = 'game_dilemmas' and column_name like '%_by_player_id'
    `.execute(db);
    const { rows: checks } = await sql<{ definition: string }>`
      select pg_get_constraintdef(oid) as definition from pg_constraint
      where conname = 'game_dilemmas_origin'
    `.execute(db);
    expect(columns.map(({ column_name }) => column_name)).toEqual(['chosen_by_player_id']);
    expect(checks[0]?.definition).toContain("'random'");
    expect(checks[0]?.definition).toContain("'specific'");
    expect(checks[0]?.definition).toContain("'players'");
    expect(checks[0]?.definition).not.toContain('picked-by-the-system');
  });

  it('should keep a dilemma in one round of a room only', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await lobbiesBefore(db);
    await migrateTo(db, THIS);
    const round = (roundId: number) => ({
      room_id: 'TestEvery',
      position: roundId + 10,
      round_id: roundId + 10,
      origin: 'specific' as const,
      categories: null,
      dilemma_id: 'TestRepeated',
      minimum_age: 16 as const,
      compromising: false,
      chosen_by_player_id: null,
    });

    // Act & Assert
    await db.insertInto('room_rounds').values(round(1)).execute();
    await expect(db.insertInto('room_rounds').values(round(2)).execute()).rejects.toThrow();
  });
});
