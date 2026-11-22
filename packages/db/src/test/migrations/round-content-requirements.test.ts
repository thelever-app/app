import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0029-without-group-nature';
const THIS = '0030-round-content-requirements';
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

/** A room in its lobby with a random round of each content, as dev and prod may have one. */
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
    for (const [position, content] of ['any', 'adults-only', 'compromising'].entries()) {
      await sql`
        insert into room_rounds (room_id, position, round_id, origin, content)
        values ('TestRoom', ${position}, ${position + 1}, 'random', ${content})
      `.execute(trx);
    }
  });
}

describe(`Migration ${THIS}`, () => {
  it('should turn the content of each round into its requirements, none for any', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await roomWithContents(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const { rows } = await sql<{
      content: string[];
    }>`select content from room_rounds order by position`.execute(db);
    expect(rows.map(({ content }) => content)).toEqual([[], ['adults-only'], ['compromising']]);
  });

  it('should turn down a requirement it does not know', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await roomWithContents(db);
    await migrateTo(db, THIS);

    // Act
    const unknown = sql`update room_rounds set content = '{violent}'`.execute(db);

    // Assert
    await expect(unknown).rejects.toThrow(/room_rounds_content/);
  });
});
