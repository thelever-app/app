import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0033-dilemma-reports';
const THIS = '0034-round-content-axes';
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
 * A room in its lobby with a random round of each content and one of the players, as dev and prod
 * may have one.
 */
async function roomWithContents(db: Kysely<Database>): Promise<void> {
  // In one transaction: the room and its host refer to each other.
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into rooms (id, host_player_id, version, code, place, variant, adults_only,
        dilemma_language, time_per_dilemma_seconds, new_dilemmas, last_connected_at,
        played_dilemma_ids, compromising_dilemmas)
      values ('TestRoom', 'TestAna', 1, 'K7M2Q', 'together', 'anonymous', true, 'es', 60, true,
        now(), '{}', true)
    `.execute(trx);
    await sql`
      insert into room_players (id, room_id, position, nickname, identity, avatar_face,
        avatar_color, played_dilemma_ids, under_eighteen)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity', 'face-01', 'teal', '{}', false)
    `.execute(trx);
    const contents = [[], ['adults-only'], ['compromising'], ['adults-only', 'compromising']];
    for (const [position, content] of contents.entries()) {
      await sql`
        insert into room_rounds (room_id, position, round_id, origin, content)
        values ('TestRoom', ${position}, ${position + 1}, 'random', ${content}::text[])
      `.execute(trx);
    }
    await sql`
      insert into room_rounds (room_id, position, round_id, origin)
      values ('TestRoom', 4, 5, 'players')
    `.execute(trx);
  });
}

describe(`Migration ${THIS}`, () => {
  it('should turn the requirements of each random round into its age and whether compromising', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await roomWithContents(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const rounds = await db
      .selectFrom('room_rounds')
      .select(['content_age', 'content_compromising'])
      .orderBy('position')
      .execute();
    expect(rounds).toEqual([
      { content_age: 'any', content_compromising: 'any' },
      { content_age: 'adults-only', content_compromising: 'any' },
      { content_age: 'any', content_compromising: 'yes' },
      { content_age: 'adults-only', content_compromising: 'yes' },
      { content_age: null, content_compromising: null },
    ]);
  });

  it.each([
    { case: 'an unknown age', change: sql`update room_rounds set content_age = 'violent'` },
    {
      case: 'a random round without whether compromising',
      change: sql`update room_rounds set content_compromising = null where round_id = 1`,
    },
    {
      case: 'a content in a round that is not random',
      change: sql`update room_rounds set content_age = 'any' where round_id = 5`,
    },
  ])('should turn down $case', async ({ change }) => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await roomWithContents(db);
    await migrateTo(db, THIS);

    // Act
    const changed = change.execute(db);

    // Assert
    await expect(changed).rejects.toThrow(/room_rounds_content/);
  });
});
