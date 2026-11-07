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

const BEFORE = '0004-game-answers-vote';
const THIS = '0005-lobby';
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

/** A room from before the lobby, whose host played a game and answered its dilemma. */
async function playedBeforeTheLobby(db: Kysely<Database>): Promise<void> {
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
    await sql`insert into rooms (id, host_player_id, version) values ('TestRoom', 'TestAna', 1)`.execute(
      trx,
    );
    await sql`
      insert into room_players (id, room_id, position, nickname, identity)
      values ('TestAna', 'TestRoom', 0, 'Ana', 'TestAnaIdentity')
    `.execute(trx);
    await sql`
      insert into games (id, room_id, in_decision_phase, version) values ('TestGame', 'TestRoom', true, 1)
    `.execute(trx);
    await sql`
      insert into game_dilemmas (game_id, position, dilemma_id, dilemma_version)
      values ('TestGame', 0, ${dilemma.id}, 1)
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
      values ('TestGame', 'TestAna', ${dilemma.id}, 1, ${vote}, 'TestConsent1', null, null, false, false)
    `.execute(trx);
  });
}

async function countOf(db: Kysely<Database>, table: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`select count(*) from ${sql.table(table)}`.execute(
    db,
  );
  return Number(rows[0]?.count);
}

describe('the migration that gives rooms their lobby', () => {
  it('should delete the rooms from before the lobby with the games played in them', async () => {
    // Arrange: as dev and prod, where games were played before the lobby.
    const db = await databaseAt(BEFORE);
    await playedBeforeTheLobby(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    for (const table of ['rooms', 'room_players', 'games', 'game_players', 'answers']) {
      expect(await countOf(db, table), table).toBe(0);
    }
  });
});
