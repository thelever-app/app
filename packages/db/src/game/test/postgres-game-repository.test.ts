import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { Game, Player, Room } from '@thelever-app/game';
import { CONTRACT_DILEMMAS, describeGameRepositoryContract } from '@thelever-app/game/contracts';
import {
  SEAL_BEFORE_FIRST_ACCESS,
  SequentialIdGenerator as GameIds,
} from '@thelever-app/game/in-memory';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../postgres-game-repository.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';
import { inTransaction } from '../../transaction.ts';

const database = useTestDatabase<Database>();

describeGameRepositoryContract('PostgresGameRepository', async () => {
  await emptyTables(database.db());
  await database
    .db()
    .insertInto('instances')
    .values({ id: 'TestInstanceId', seen_at: new Date() })
    .execute();
  const dilemmaRepository = new PostgresDilemmaRepository(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create(
      { text, options, language: 'es', category: 'honesty', tags: [], minimumAge: 16 },
      idGenerator,
    ),
  );
  for (const dilemma of dilemmas) await dilemmaRepository.save(dilemma);
  return {
    games: new PostgresGameRepository(database.db()),
    rooms: new PostgresRoomRepository(database.db(), 'TestInstanceId'),
    dilemmas: dilemmas.map((dilemma) => ({
      dilemmaId: dilemma.id,
      version: dilemma.version,
      optionIds: dilemma.options.map(({ id }) => id),
    })),
  };
});

describe('PostgresGameRepository inside a command', () => {
  /** A saved game in its decision phase, with Ana and Luis and an answer of each to the first dilemma. */
  async function answeredGame() {
    await emptyTables(database.db());
    await database
      .db()
      .insertInto('instances')
      .values({ id: 'TestInstanceId', seen_at: new Date() })
      .execute();
    const dilemmaRepository = new PostgresDilemmaRepository(database.db());
    const idGenerator = new SequentialIdGenerator('dilemma');
    const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
      Dilemma.create(
        { text, options, language: 'es', category: 'honesty', tags: [], minimumAge: 16 },
        idGenerator,
      ),
    );
    for (const dilemma of dilemmas) await dilemmaRepository.save(dilemma);
    const [first, second] = dilemmas as [Dilemma, Dilemma];
    const ids = new GameIds();
    const room = Room.create({ hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' }, ids);
    room.addPlayer(Player.create({ nickname: 'Luis', identity: 'TestLuisIdentity' }, ids));
    const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceId');
    await rooms.save(room);
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: dilemmas.map((dilemma) => ({
          dilemmaId: dilemma.id,
          version: dilemma.version,
          optionIds: dilemma.options.map(({ id }) => id),
        })),
      },
      ids,
    );
    game.startDecisionPhase(room.players);
    const [ana, luis] = room.players as [Player, Player];
    game.answer(ana.id, first.id, first.options[0]!.id, SEAL_BEFORE_FIRST_ACCESS);
    game.answer(luis.id, first.id, first.options[0]!.id, SEAL_BEFORE_FIRST_ACCESS);
    const games = new PostgresGameRepository(database.db());
    await games.save(game);
    return { games, gameId: game.id, ana: ana.id, luis: luis.id, first, second };
  }

  /** Each row of the game's tables with the transaction that last wrote it. */
  async function writers() {
    const { rows } = await sql<{ row: string; xmin: string }>`
      select 'game' as row, xmin::text from games
      union all select 'dilemma ' || position, xmin::text from game_dilemmas
      union all select 'player ' || player_id, xmin::text from game_players
      union all select 'answer ' || player_id || ' ' || dilemma_id, xmin::text from answers
    `.execute(database.db());
    return new Map(rows.map(({ row, xmin }) => [row, xmin]));
  }

  it('should write only the rows a command changed', async () => {
    // Arrange
    const { games, gameId, ana, luis, first, second } = await answeredGame();
    const before = await writers();

    // Act
    await inTransaction(database.db(), async () => {
      const game = (await games.findById(gameId))!;
      game.answer(ana, second.id, second.options[0]!.id, SEAL_BEFORE_FIRST_ACCESS);
      await games.save(game);
    });

    // Assert
    const after = await writers();
    const rewritten = [...after]
      .filter(([row, xmin]) => before.get(row) !== xmin)
      .map(([row]) => row);
    expect(rewritten.sort()).toEqual(['game', `answer ${ana} ${second.id}`].sort());
    expect(after.get(`answer ${luis} ${first.id}`)).toBe(before.get(`answer ${luis} ${first.id}`));
  });

  it('should keep every change of a command that saves the game twice', async () => {
    // Arrange
    const { games, gameId, ana, luis, first, second } = await answeredGame();

    // Act
    await inTransaction(database.db(), async () => {
      const game = (await games.findById(gameId))!;
      game.answer(ana, first.id, first.options[1]!.id, SEAL_BEFORE_FIRST_ACCESS);
      await games.save(game);
      game.answer(luis, second.id, second.options[1]!.id, SEAL_BEFORE_FIRST_ACCESS);
      await games.save(game);
    });

    // Assert
    const found = await games.findById(gameId);
    expect(found?.answersOf(ana)).toEqual([{ dilemmaId: first.id, vote: first.options[1]!.id }]);
    expect(found?.answersOf(luis)).toEqual([
      { dilemmaId: first.id, vote: first.options[0]!.id },
      { dilemmaId: second.id, vote: second.options[1]!.id },
    ]);
  });

  it('should save in full a game the command did not read', async () => {
    // Arrange
    const { games, gameId, ana, second } = await answeredGame();
    const game = (await games.findById(gameId))!;
    game.answer(ana, second.id, second.options[0]!.id, SEAL_BEFORE_FIRST_ACCESS);

    // Act
    await inTransaction(database.db(), () => games.save(game));

    // Assert
    expect((await games.findById(gameId))?.toSnapshot()).toEqual(game.toSnapshot());
  });
});
