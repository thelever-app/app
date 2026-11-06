import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { Room } from '@thelever-app/game';
import { SequentialIdGenerator as GameIds } from '@thelever-app/game/in-memory';
import { type Kysely, sql } from 'kysely';
import pg from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../../game/postgres-game-repository.ts';
import { PostgresRoomRepository } from '../../game/postgres-room-repository.ts';
import { grantRowAccess } from '../../grants.ts';
import { migrateTo, migrateToLatest } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0002-rooms-and-games';
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  // Last opened, first closed: the database goes after the connections to it.
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
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
  return {
    db,
    url: urlOf(name),
    dilemma,
    roomId: room.id,
    optionIds: dilemma.options.map(({ id }) => id),
  };
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

  it('should wait for a command of the previous revision that is starting a game, not deadlock with it', async () => {
    // Arrange: the previous revision starts a game in a transaction, reading the versions first.
    const { db, url, dilemma, roomId } = await databaseAt(BEFORE);
    const command = new pg.Client({ connectionString: url });
    await command.connect();
    cleanups.push(() => command.end());
    await command.query('begin');
    await command.query('select number from dilemma_versions where dilemma_id = $1', [dilemma.id]);

    // Act: the migration starts and waits for it; then the command inserts the game and commits.
    const migrating = migrateToLatest(db);
    await untilSomeoneWaitsForALock(db);
    const gameId = `TestGame${randomUUID()}`;
    await command.query(
      'insert into games (id, room_id, in_decision_phase, version) values ($1, $2, false, 1)',
      [gameId, roomId],
    );
    await command.query(
      'insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version) values ($1, 0, $2, $3)',
      [gameId, dilemma.id, dilemma.version],
    );
    await command.query('commit');

    // Assert
    await expect(migrating).resolves.toContain('0003-game-dilemma-options');
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas[0]?.optionIds).toHaveLength(3);
  });

  it('should copy the options for the user of the room server before it is granted the new table', async () => {
    // Arrange: the user of the room server, granted the tables before the migration, as in an
    // environment until the migrate job grants the new one.
    const { db, url, dilemma, roomId } = await databaseAt(BEFORE);
    const user = `thelever_test_app_${randomUUID().replaceAll('-', '')}`;
    await sql`create role ${sql.id(user)}`.execute(db);
    cleanups.push(async () => {
      await sql`drop owned by ${sql.id(user)}`.execute(db);
      await sql`drop role ${sql.id(user)}`.execute(db);
    });
    await grantRowAccess(db, user);
    await migrateToLatest(db);
    const roomServer = new pg.Client({ connectionString: url });
    await roomServer.connect();
    cleanups.push(() => roomServer.end());
    await roomServer.query(`set role ${user}`);
    const gameId = `TestGame${randomUUID()}`;

    // Act: the previous revision starts a game.
    await roomServer.query(
      'insert into games (id, room_id, in_decision_phase, version) values ($1, $2, false, 1)',
      [gameId, roomId],
    );
    await roomServer.query(
      'insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version) values ($1, 0, $2, $3)',
      [gameId, dilemma.id, dilemma.version],
    );

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas[0]?.optionIds).toHaveLength(3);
  });
});

async function untilSomeoneWaitsForALock(db: Kysely<Database>): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { rows } = await sql<{ waiting: number }>`
      select count(*)::int as waiting from pg_locks where not granted
    `.execute(db);
    if ((rows[0]?.waiting ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('the migration never waited for the command');
}
