import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0009-decision-phase';
const THIS = '0010-shared-avatars';
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

/** Ana in her lobby, and Luis joining it with her avatar. */
async function luisTakesTheAvatarOfAna(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, group_nature, place, variant,
        adults_only, dilemma_language, categories, dilemma_count, time_per_dilemma_seconds,
        new_dilemmas, dilemmas_per_player)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'friends', 'together', 'nominal', false, 'es',
        null, 8, 60, true, 0)
    `.execute(trx);
    for (const [id, position, nickname] of [
      ['TestAna', 0, 'Ana'],
      ['TestLuis', 1, 'Luis'],
    ] as const) {
      await sql`
        insert into room_players (id, room_id, position, nickname, identity, avatar_face, avatar_color)
        values (${id}, 'TestRoom', ${position}, ${nickname}, ${`${id}Identity`}, 'face-01', 'teal')
      `.execute(trx);
    }
  });
}

describe('the migration that lets two players of a room share an avatar', () => {
  it('should refuse a shared avatar before it', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);

    // Act & Assert
    await expect(luisTakesTheAvatarOfAna(db)).rejects.toThrow('room_players_avatar');
  });

  it('should let two players of the room have the same avatar after it', async () => {
    // Arrange
    const db = await databaseAt(THIS);

    // Act
    await luisTakesTheAvatarOfAna(db);

    // Assert
    const players = await db.selectFrom('room_players').select('nickname').execute();
    expect(players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis']);
  });
});
