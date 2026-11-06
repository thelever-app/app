import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { Room } from '@thelever-app/game';
import { SequentialIdGenerator as GameIds } from '@thelever-app/game/in-memory';
import type { Kysely } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../../game/postgres-game-repository.ts';
import { PostgresRoomRepository } from '../../game/postgres-room-repository.ts';
import { migrateTo, migrateToLatest } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0002-rooms-and-games';
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

/** An empty database of its own, migrated up to `migration`, with one dilemma and one room. */
async function databaseAt(migration: string) {
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
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['A', 'B', 'C'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
    },
    new SequentialIdGenerator('dilemma'),
  );
  await new PostgresDilemmaRepository(db).save(dilemma);
  await db.insertInto('instances').values({ id: 'TestInstance', seen_at: new Date() }).execute();
  const room = Room.create({ hostNickname: 'Ana', hostIdentity: 'TestAna' }, new GameIds());
  await new PostgresRoomRepository(db, 'TestInstance').save(room);
  return { db, dilemma, roomId: room.id, optionIds: dilemma.options.map(({ id }) => id) };
}

/** A game started as the revision before Game kept its options writes it: no options of its own. */
async function startedTheOldWay(db: Kysely<Database>, roomId: string, dilemma: Dilemma) {
  const gameId = `TestGame${randomUUID()}`;
  await db
    .insertInto('games')
    .values({ id: gameId, room_id: roomId, in_decision_phase: false, version: 1 })
    .execute();
  await db
    .insertInto('game_dilemmas')
    .values({
      game_id: gameId,
      position: 0,
      dilemma_id: dilemma.id,
      dilemma_version: dilemma.version,
    })
    .execute();
  return gameId;
}

describe('the migration that gives Game the options of its dilemmas', () => {
  it('should copy the options of the games that existed before it', async () => {
    // Arrange
    const { db, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    const gameId = await startedTheOldWay(db, roomId, dilemma);

    // Act
    await migrateToLatest(db);

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas).toEqual([{ dilemmaId: dilemma.id, version: 1, optionIds }]);
  });

  it('should copy the options of a game the previous revision starts while the deploy goes on', async () => {
    // Arrange: migrated, with the previous revision still serving.
    const { db, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    await migrateToLatest(db);

    // Act
    const gameId = await startedTheOldWay(db, roomId, dilemma);

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas).toEqual([{ dilemmaId: dilemma.id, version: 1, optionIds }]);
  });
});
