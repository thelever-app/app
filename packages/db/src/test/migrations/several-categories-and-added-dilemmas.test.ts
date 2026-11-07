import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0005-lobby';
const THIS = '0006-several-categories-and-added-dilemmas';
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

/** A lobby from before: one room of a single category, where players may add a dilemma, and one where they may not. */
async function lobbiesOfOneCategory(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    for (const [id, code, canAdd] of [
      ['TestAdding', 'K7M2Q', true],
      ['TestNotAdding', 'K7M2R', false],
    ] as const) {
      await sql`
        insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
          adults_only, dilemma_language, category, dilemma_count, total_time_in_minutes,
          new_dilemmas, players_can_add_dilemmas)
        values (${id}, ${`${id}Ana`}, 1, ${code}, 'friends', 'together', 'nominal', false, 'es',
          'honesty', 8, 6, true, ${canAdd})
      `.execute(trx);
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${`${id}Ana`}, ${id}, 0, 'Ana', ${`${id}AnaIdentity`}, 'face-01', 'teal')
      `.execute(trx);
    }
  });
}

describe('the migration that lets a room play several categories and each player add several dilemmas', () => {
  it('should keep the category of each room as its only one, and one dilemma for each player where they could add it', async () => {
    // Arrange: as dev and prod, with rooms in the lobby.
    const db = await databaseAt(BEFORE);
    await lobbiesOfOneCategory(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const rooms = await db
      .selectFrom('rooms')
      .select(['id', 'categories', 'dilemmas_per_player'])
      .orderBy('id')
      .execute();
    expect(rooms).toEqual([
      { id: 'TestAdding', categories: ['honesty'], dilemmas_per_player: 1 },
      { id: 'TestNotAdding', categories: ['honesty'], dilemmas_per_player: 0 },
    ]);
  });

  it('should let a player add more than one dilemma to a room', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await lobbiesOfOneCategory(db);
    await migrateTo(db, THIS);

    // Act
    const added = db
      .insertInto('room_added_dilemmas')
      .values([
        {
          room_id: 'TestAdding',
          player_id: 'TestAddingAna',
          position: 0,
          dilemma_id: 'TestA',
          minimum_age: 16,
        },
        {
          room_id: 'TestAdding',
          player_id: 'TestAddingAna',
          position: 1,
          dilemma_id: 'TestB',
          minimum_age: 16,
        },
      ])
      .execute();

    // Assert
    await expect(added).resolves.toBeDefined();
  });

  it('should turn down more dilemmas per player than a room allows', async () => {
    // Arrange
    const db = await databaseAt(THIS);

    // Act
    const tooMany = sql`
      insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
        adults_only, dilemma_language, categories, dilemma_count, total_time_in_minutes,
        new_dilemmas, dilemmas_per_player)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'friends', 'together', 'nominal', false, 'es',
        '{}', 8, 6, true, 4)
    `.execute(db);

    // Assert
    await expect(tooMany).rejects.toThrow(/rooms_dilemmas_per_player/);
  });
});
