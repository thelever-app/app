import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { Game, Room } from '@thelever-app/game';
import {
  SEAL_BEFORE_FIRST_ACCESS,
  SequentialIdGenerator as GameIds,
} from '@thelever-app/game/in-memory';
import { type Kysely, sql } from 'kysely';
import pg from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../../game/postgres-game-repository.ts';
import { PostgresRoomRepository } from '../../game/postgres-room-repository.ts';
import { grantRowAccess } from '../../grants.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0002-rooms-and-games';
const THIS = '0003-game-dilemma-options';
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
    room,
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
    await migrateTo(db, THIS);

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas).toEqual([{ dilemmaId: dilemma.id, version: 1, optionIds }]);
  });

  it('should copy the options of a game the previous revision starts while the deploy goes on', async () => {
    // Arrange: migrated, with the previous revision still serving.
    const { db, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    await migrateTo(db, THIS);

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
    const migrating = migrateTo(db, THIS);
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
    const user = await userOfTheRoomServer(db);
    await migrateTo(db, THIS);
    const roomServer = await connectedAs(url, user);

    // Act: the previous revision starts a game.
    const gameId = await startedTheOldWayBy(roomServer, roomId, dilemma);

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas[0]?.optionIds).toHaveLength(3);
  });

  it('should copy the options of the dilemma played, not of a table of the same name the user made', async () => {
    // Arrange: a user of the database with the rights of the room server, which may make temporary
    // tables, and the trigger runs as the owner of the schema.
    const { db, url, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    const user = await userOfTheRoomServer(db);
    await migrateTo(db, THIS);
    const session = await connectedAs(url, user);
    await session.query(
      'create temp table dilemma_version_options (dilemma_id text, version int, option_id text, position smallint)',
    );
    await session.query("insert into dilemma_version_options values ($1, $2, 'TestForged', 0)", [
      dilemma.id,
      dilemma.version,
    ]);

    // Act
    const gameId = await startedTheOldWayBy(session, roomId, dilemma);

    // Assert
    const found = await new PostgresGameRepository(db).findById(gameId);
    expect(found?.dilemmas[0]?.optionIds).toEqual(optionIds);
  });

  it('should give up soon, not hold every game up, while another transaction keeps a table it needs', async () => {
    // Arrange: a long transaction, such as a query by hand, reading the games' dilemmas.
    const { db, url } = await databaseAt(BEFORE);
    const reader = new pg.Client({ connectionString: url });
    await reader.connect();
    cleanups.push(() => reader.end());
    await reader.query('begin');
    await reader.query('select count(*) from game_dilemmas');

    // Act
    const started = Date.now();
    const migrating = migrateTo(db, THIS);

    // Assert
    await expect(migrating).rejects.toThrow('migration 0003-game-dilemma-options failed');
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 15_000);
});

describe('the migration that checks the votes against the options Game keeps', () => {
  const NEXT = '0004-game-answers-vote';

  /** A game of Game's own dilemma, which Dilemmas does not have, started for the host. */
  function gameOfItsOwnDilemma(room: Room) {
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: [{ dilemmaId: 'TestDilemma', version: 1, optionIds: ['TestA', 'TestB'] }],
      },
      new GameIds(),
    );
    game.startDecisionPhase(room.players);
    return game;
  }

  it('should keep the answers given before it', async () => {
    // Arrange
    const { db, dilemma, room, optionIds } = await databaseAt(THIS);
    const game = Game.create(
      { roomId: room.id, dilemmas: [{ dilemmaId: dilemma.id, version: 1, optionIds }] },
      new GameIds(),
    );
    game.startDecisionPhase(room.players);
    game.answer(room.host.id, dilemma.id, optionIds[1]!, SEAL_BEFORE_FIRST_ACCESS);
    await new PostgresGameRepository(db).save(game);

    // Act
    await migrateTo(db, NEXT);

    // Assert
    const found = await new PostgresGameRepository(db).findById(game.id);
    expect(found?.answersOf(room.host.id)).toEqual([{ dilemmaId: dilemma.id, vote: optionIds[1] }]);
  });

  it('should take a vote among the options of the game, whatever Dilemmas has', async () => {
    // Arrange
    const { db, room } = await databaseAt(THIS);
    const game = gameOfItsOwnDilemma(room);
    await migrateTo(db, NEXT);
    game.answer(room.host.id, 'TestDilemma', 'TestB', SEAL_BEFORE_FIRST_ACCESS);

    // Act
    await new PostgresGameRepository(db).save(game);

    // Assert
    const found = await new PostgresGameRepository(db).findById(game.id);
    expect(found?.answersOf(room.host.id)).toEqual([{ dilemmaId: 'TestDilemma', vote: 'TestB' }]);
  });

  it('should refuse a vote that is not an option of the game', async () => {
    // Arrange
    const { db, room } = await databaseAt(THIS);
    const game = gameOfItsOwnDilemma(room);
    await new PostgresGameRepository(db).save(game);
    await migrateTo(db, NEXT);

    // Act
    const answering = db
      .insertInto('answers')
      .values({
        game_id: game.id,
        player_id: room.host.id,
        dilemma_id: 'TestDilemma',
        dilemma_version: 1,
        vote: 'TestNotAnOption',
        game_consent_version: 'TestConsent1',
        research_consent_version: null,
        commercial_licence_consent_version: null,
        under_eighteen: false,
        voter_in_the_gap: false,
      })
      .execute();

    // Assert
    await expect(answering).rejects.toThrow('answers_vote');
  });

  it('should no longer copy the options of Dilemmas into a game', async () => {
    // Arrange
    const { db, dilemma, roomId } = await databaseAt(THIS);
    await migrateTo(db, NEXT);

    // Act
    const gameId = await startedTheOldWay(db, roomId, dilemma);

    // Assert
    const copied = await db
      .selectFrom('game_dilemma_options')
      .select('option_id')
      .where('game_id', '=', gameId)
      .execute();
    expect(copied).toEqual([]);
  });

  it('should wait for a command that is answering, not deadlock with it', async () => {
    // Arrange: a command reads the game, as the repository does, before it saves an answer.
    const { db, url, room, dilemma, optionIds } = await databaseAt(THIS);
    const game = Game.create(
      { roomId: room.id, dilemmas: [{ dilemmaId: dilemma.id, version: 1, optionIds }] },
      new GameIds(),
    );
    game.startDecisionPhase(room.players);
    await new PostgresGameRepository(db).save(game);
    const command = new pg.Client({ connectionString: url });
    await command.connect();
    cleanups.push(() => command.end());
    await command.query('begin');
    await command.query(
      `select * from game_dilemmas join game_dilemma_options using (game_id, dilemma_id)
       left join answers using (game_id, dilemma_id) where game_id = $1`,
      [game.id],
    );

    // Act: the migration starts and waits for it; then the command answers and commits.
    const migrating = migrateTo(db, NEXT);
    await untilSomeoneWaitsForALock(db);
    await command.query(
      `insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
         game_consent_version, under_eighteen, voter_in_the_gap)
       values ($1, $2, $3, 1, $4, 'TestConsent1', false, false)`,
      [game.id, room.host.id, dilemma.id, optionIds[0]],
    );
    await command.query('commit');

    // Assert
    await expect(migrating).resolves.toContain(NEXT);
  });

  it('should give up soon, not hold every game up, while another transaction keeps a table it needs', async () => {
    // Arrange
    const { db, url } = await databaseAt(THIS);
    const reader = new pg.Client({ connectionString: url });
    await reader.connect();
    cleanups.push(() => reader.end());
    await reader.query('begin');
    await reader.query('select count(*) from answers');

    // Act
    const started = Date.now();
    const migrating = migrateTo(db, NEXT);

    // Assert
    await expect(migrating).rejects.toThrow(`migration ${NEXT} failed`);
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 15_000);
});

/** A user with the rights the room server has on the tables before the migration. */
async function userOfTheRoomServer(db: Kysely<Database>): Promise<string> {
  const user = `thelever_test_app_${randomUUID().replaceAll('-', '')}`;
  await sql`create role ${sql.id(user)}`.execute(db);
  cleanups.push(async () => {
    await sql`drop owned by ${sql.id(user)}`.execute(db);
    await sql`drop role ${sql.id(user)}`.execute(db);
  });
  await grantRowAccess(db, user);
  return user;
}

async function connectedAs(url: string, user: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  cleanups.push(() => client.end());
  await client.query(`set role ${user}`);
  return client;
}

/** A game started by that session as the revision before Game kept its options writes it. */
async function startedTheOldWayBy(session: pg.Client, roomId: string, dilemma: Dilemma) {
  const gameId = `TestGame${randomUUID()}`;
  await session.query(
    'insert into games (id, room_id, in_decision_phase, version) values ($1, $2, false, 1)',
    [gameId, roomId],
  );
  await session.query(
    'insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version) values ($1, 0, $2, $3)',
    [gameId, dilemma.id, dilemma.version],
  );
  return gameId;
}

/** Until a lock on this database is waited for: the other test files run on the same server. */
async function untilSomeoneWaitsForALock(db: Kysely<Database>): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { rows } = await sql<{ waiting: number }>`
      select count(*)::int as waiting from pg_locks
      where not granted
        and database = (select oid from pg_database where datname = current_database())
    `.execute(db);
    if ((rows[0]?.waiting ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('the migration never waited for the command');
}
