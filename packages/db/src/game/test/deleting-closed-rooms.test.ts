import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { DeleteClosedRoomsUseCase, Game, type Player } from '@thelever-app/game';
import { CONTRACT_DILEMMAS } from '@thelever-app/game/contracts';
import {
  ManualClock,
  SEAL_BEFORE_FIRST_ACCESS,
  SequentialIdGenerator as GameIds,
  SequentialRandomness,
} from '@thelever-app/game/in-memory';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { roomOf, TEST_GAME_SETTINGS } from '../../test/support/rooms.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../postgres-game-repository.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';
import { inTransaction } from '../../transaction.ts';

const database = useTestDatabase<Database>();

/**
 * The tables of the game data, which hang from the room and go with it (glossary, «Datos para
 * jugar»): the room, its players, their connections, its lobby and its games with their answers.
 */
const GAME_DATA = [
  'rooms',
  'room_players',
  'room_connections',
  'room_expelled_identities',
  'room_added_dilemmas',
  'room_picked_dilemmas',
  'games',
  'game_dilemmas',
  'game_dilemma_options',
  'game_players',
  'game_player_dilemmas',
  'answers',
];

/**
 * The tables that do not hang from any room, so they stay when one is deleted: the
 * dilemmas and the instances of the room server. Likes, counters, reports and the history go here
 * when they come.
 */
const KEPT = [
  'dilemmas',
  'dilemma_versions',
  'dilemma_version_options',
  'dilemma_version_tags',
  'instances',
];

/** How many rows each table of the app has, by its name. */
async function rowsOfEveryTable(): Promise<Record<string, number>> {
  const { rows } = await sql<{ name: string }>`
    select tablename as name from pg_tables
    where schemaname = 'public' and tablename not like 'kysely\\_%'
  `.execute(database.db());
  const counts: Record<string, number> = {};
  for (const { name } of rows) {
    const { rows: counted } = await sql<{
      count: string;
    }>`select count(*) from ${sql.table(name)}`.execute(database.db());
    counts[name] = Number(counted[0]!.count);
  }
  return counts;
}

/**
 * Ana's room with Luis, after Marta was expelled, with a dilemma Luis added and one Ana picked, and
 * its game started with the vote of each to the first dilemma: a row in every table of the game data.
 */
async function playedRoom() {
  await emptyTables(database.db());
  await database
    .db()
    .insertInto('instances')
    .values({ id: 'TestInstanceId', seen_at: new Date() })
    .execute();
  const dilemmaRepository = new PostgresDilemmaRepository(database.db());
  const dilemmaIds = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create(
      { text, options, language: 'es', category: 'honesty', tags: ['test'], minimumAge: 16 },
      dilemmaIds,
    ),
  );
  for (const dilemma of dilemmas) await dilemmaRepository.save(dilemma);
  const [first, second] = dilemmas as [Dilemma, Dilemma];

  const ids = new GameIds();
  const room = roomOf('Ana', ['Luis', 'Marta'], ids);
  const [ana, luis, marta] = room.players as [Player, Player, Player];
  room.changeSettings(ana.id, { dilemmasPerPlayer: 1 });
  room.expel(ana.id, marta.id);
  room.addDilemma(luis.id, { dilemmaId: first.id, minimumAge: 16 });
  room.pickDilemmas(ana.id, [{ dilemmaId: second.id, minimumAge: 16 }]);
  const game = Game.create(
    {
      roomId: room.id,
      dilemmas: dilemmas.map((dilemma) => ({
        dilemmaId: dilemma.id,
        version: dilemma.version,
        origin: 'picked-by-the-system',
        addedBy: null,
        optionIds: dilemma.options.map(({ id }) => id),
        hasGap: false,
      })),
      settings: { ...TEST_GAME_SETTINGS, variant: 'anonymous' },
    },
    ids,
  );
  room.startGame(ana.id, game.id);
  const startedAt = new Date();
  game.start([ana, luis], startedAt, new SequentialRandomness());
  for (const player of [ana, luis]) {
    game.answer(
      player.id,
      first.id,
      { vote: first.options[0]!.id },
      SEAL_BEFORE_FIRST_ACCESS,
      startedAt,
    );
    room.connect(player.id, `Test${player.nickname}Connection`, new Date());
  }
  const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceId');
  const games = new PostgresGameRepository(database.db());
  // In one command, as starting the game does: the room points to its game.
  await inTransaction(database.db(), async () => {
    await rooms.save(room);
    await games.save(game);
  });
  return { rooms, games, room, players: [ana, luis] };
}

describe('Deleting the closed rooms in PostgreSQL', () => {
  it('should know, of every table, whether it is game data or stays when a room is deleted', async () => {
    // Act
    const tables = Object.keys(await rowsOfEveryTable());

    // Assert
    expect(tables.sort()).toEqual([...GAME_DATA, ...KEPT].sort());
  });

  it('should leave no game data of a closed room, and keep everything else', async () => {
    // Arrange
    const { rooms, games, room, players } = await playedRoom();
    const before = await rowsOfEveryTable();
    for (const table of GAME_DATA) expect(before[table], table).toBeGreaterThan(0);
    const closedAt = new Date();
    for (const player of players) {
      room.disconnect(player.id, `Test${player.nickname}Connection`, closedAt);
    }
    await rooms.save(room);
    const clock = new ManualClock(new Date(closedAt.getTime() + 15 * 60_000));

    // Act
    const { roomIds } = await new DeleteClosedRoomsUseCase(rooms, games, clock).execute();

    // Assert
    expect(roomIds).toEqual([room.id]);
    const after = await rowsOfEveryTable();
    for (const table of GAME_DATA) expect(after[table], table).toBe(0);
    for (const table of KEPT) expect(after[table], table).toBe(before[table]);
  });
});
