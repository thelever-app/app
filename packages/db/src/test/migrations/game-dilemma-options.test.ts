import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { type Kysely, sql } from 'kysely';
import pg from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
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

// The tables of Game are written and read here in SQL, as they were at these migrations: the
// repositories and the schema of the code follow the latest one, which a later migration changed.

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
  const { roomId, hostId } = await roomOfItsHost(db);
  return {
    db,
    url: urlOf(name),
    dilemma,
    roomId,
    hostId,
    optionIds: dilemma.options.map(({ id }) => id),
  };
}

/** A room with only its host, Ana. */
async function roomOfItsHost(db: Kysely<Database>) {
  const roomId = `TestRoom${randomUUID()}`;
  const hostId = `TestAna${randomUUID()}`;
  // In one transaction: the room points at its host, checked at the commit.
  await db.transaction().execute(async (trx) => {
    await sql`insert into rooms (id, host_player_id, version) values (${roomId}, ${hostId}, 1)`.execute(
      trx,
    );
    await sql`
      insert into room_players (id, room_id, position, nickname, identity)
      values (${hostId}, ${roomId}, 0, 'Ana', 'TestAna')
    `.execute(trx);
  });
  return { roomId, hostId };
}

/** A game started as the revision before Game kept its options writes it: no options of its own. */
async function startedTheOldWay(db: Kysely<Database>, roomId: string, dilemma: Dilemma) {
  const gameId = `TestGame${randomUUID()}`;
  await sql`
    insert into games (id, room_id, in_decision_phase, version)
    values (${gameId}, ${roomId}, false, 1)
  `.execute(db);
  await sql`
    insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version)
    values (${gameId}, 0, ${dilemma.id}, ${dilemma.version})
  `.execute(db);
  return gameId;
}

/**
 * A game in the decision phase for the host, of one dilemma with the options Game keeps of it, as
 * the revision that writes them saves it.
 */
async function inDecisionPhase(
  db: Kysely<Database>,
  game: { roomId: string; hostId: string; dilemmaId: string; optionIds: string[] },
) {
  const { roomId, hostId, dilemmaId, optionIds } = game;
  const gameId = `TestGame${randomUUID()}`;
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into games (id, room_id, in_decision_phase, version)
      values (${gameId}, ${roomId}, true, 1)
    `.execute(trx);
    await sql`
      insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version)
      values (${gameId}, 0, ${dilemmaId}, 1)
    `.execute(trx);
    // While the trigger of 0003 is there, it has copied the same options already.
    await sql`
      insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
      select ${gameId}, ${dilemmaId}, option_id, (position - 1)::smallint
      from unnest(${optionIds}::text[]) with ordinality as options (option_id, position)
      on conflict do nothing
    `.execute(trx);
    await sql`
      insert into game_players (game_id, player_id, position) values (${gameId}, ${hostId}, 0)
    `.execute(trx);
  });
  return gameId;
}

/** The answer of a player, with the consent to play only. */
async function answered(
  db: Kysely<Database>,
  answer: { gameId: string; playerId: string; dilemmaId: string; vote: string },
) {
  const { gameId, playerId, dilemmaId, vote } = answer;
  await sql`
    insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
      game_consent_version, research_consent_version, commercial_licence_consent_version,
      under_eighteen, voter_in_the_gap)
    values (${gameId}, ${playerId}, ${dilemmaId}, 1, ${vote}, 'TestConsent1', null, null, false, false)
  `.execute(db);
}

/** The dilemmas of a game in their order, each with the ids of the options Game keeps of it. */
async function dilemmasOf(db: Kysely<Database>, gameId: string) {
  const { rows } = await sql<{ dilemma_id: string; dilemma_version: number; option_ids: string[] }>`
    select game_dilemmas.dilemma_id, game_dilemmas.dilemma_version,
      coalesce(array_agg(options.option_id order by options.position)
        filter (where options.option_id is not null), '{}') as option_ids
    from game_dilemmas
    left join game_dilemma_options as options using (game_id, dilemma_id)
    where game_dilemmas.game_id = ${gameId}
    group by game_dilemmas.position, game_dilemmas.dilemma_id, game_dilemmas.dilemma_version
    order by game_dilemmas.position
  `.execute(db);
  return rows.map((row) => ({
    dilemmaId: row.dilemma_id,
    version: row.dilemma_version,
    optionIds: row.option_ids,
  }));
}

/** The ids of the options Game keeps for a game, in their order. */
async function optionIdsOf(db: Kysely<Database>, gameId: string) {
  return (await dilemmasOf(db, gameId)).flatMap(({ optionIds }) => optionIds);
}

/** The answers of a player in a game. */
async function answersOf(db: Kysely<Database>, gameId: string, playerId: string) {
  const { rows } = await sql<{ dilemma_id: string; vote: string }>`
    select dilemma_id, vote from answers
    where game_id = ${gameId} and player_id = ${playerId}
    order by dilemma_id
  `.execute(db);
  return rows.map((row) => ({ dilemmaId: row.dilemma_id, vote: row.vote }));
}

describe('the migration that gives Game the options of its dilemmas', () => {
  it('should copy the options of the games that existed before it', async () => {
    // Arrange
    const { db, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    const gameId = await startedTheOldWay(db, roomId, dilemma);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect(await dilemmasOf(db, gameId)).toEqual([
      { dilemmaId: dilemma.id, version: 1, optionIds },
    ]);
  });

  it('should copy the options of a game the previous revision starts while the deploy goes on', async () => {
    // Arrange: migrated, with the previous revision still serving.
    const { db, dilemma, roomId, optionIds } = await databaseAt(BEFORE);
    await migrateTo(db, THIS);

    // Act
    const gameId = await startedTheOldWay(db, roomId, dilemma);

    // Assert
    expect(await dilemmasOf(db, gameId)).toEqual([
      { dilemmaId: dilemma.id, version: 1, optionIds },
    ]);
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
    expect(await optionIdsOf(db, gameId)).toHaveLength(3);
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
    expect(await optionIdsOf(db, gameId)).toHaveLength(3);
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
    expect(await optionIdsOf(db, gameId)).toEqual(optionIds);
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
  function gameOfItsOwnDilemma(db: Kysely<Database>, roomId: string, hostId: string) {
    return inDecisionPhase(db, {
      roomId,
      hostId,
      dilemmaId: 'TestDilemma',
      optionIds: ['TestA', 'TestB'],
    });
  }

  it('should keep the answers given before it', async () => {
    // Arrange
    const { db, dilemma, roomId, hostId, optionIds } = await databaseAt(THIS);
    const gameId = await inDecisionPhase(db, { roomId, hostId, dilemmaId: dilemma.id, optionIds });
    await answered(db, { gameId, playerId: hostId, dilemmaId: dilemma.id, vote: optionIds[1]! });

    // Act
    await migrateTo(db, NEXT);

    // Assert
    expect(await answersOf(db, gameId, hostId)).toEqual([
      { dilemmaId: dilemma.id, vote: optionIds[1] },
    ]);
  });

  it('should take a vote among the options of the game, whatever Dilemmas has', async () => {
    // Arrange
    const { db, roomId, hostId } = await databaseAt(THIS);
    await migrateTo(db, NEXT);

    // Act
    const gameId = await gameOfItsOwnDilemma(db, roomId, hostId);
    await answered(db, { gameId, playerId: hostId, dilemmaId: 'TestDilemma', vote: 'TestB' });

    // Assert
    expect(await answersOf(db, gameId, hostId)).toEqual([
      { dilemmaId: 'TestDilemma', vote: 'TestB' },
    ]);
  });

  it('should refuse a vote that is not an option of the game', async () => {
    // Arrange
    const { db, roomId, hostId } = await databaseAt(THIS);
    const gameId = await gameOfItsOwnDilemma(db, roomId, hostId);
    await migrateTo(db, NEXT);

    // Act
    const answering = answered(db, {
      gameId,
      playerId: hostId,
      dilemmaId: 'TestDilemma',
      vote: 'TestNotAnOption',
    });

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
    expect(await optionIdsOf(db, gameId)).toEqual([]);
  });

  it('should wait for a command that is answering, not deadlock with it', async () => {
    // Arrange: a command reads the game, as the repository does, before it saves an answer.
    const { db, url, roomId, hostId, dilemma, optionIds } = await databaseAt(THIS);
    const gameId = await inDecisionPhase(db, { roomId, hostId, dilemmaId: dilemma.id, optionIds });
    const command = new pg.Client({ connectionString: url });
    await command.connect();
    cleanups.push(() => command.end());
    await command.query('begin');
    await command.query(
      `select * from game_dilemmas join game_dilemma_options using (game_id, dilemma_id)
       left join answers using (game_id, dilemma_id) where game_id = $1`,
      [gameId],
    );

    // Act: the migration starts and waits for it; then the command answers and commits.
    const migrating = migrateTo(db, NEXT);
    await untilSomeoneWaitsForALock(db);
    await command.query(
      `insert into answers (game_id, player_id, dilemma_id, dilemma_version, vote,
         game_consent_version, under_eighteen, voter_in_the_gap)
       values ($1, $2, $3, 1, $4, 'TestConsent1', false, false)`,
      [gameId, hostId, dilemma.id, optionIds[0]],
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
