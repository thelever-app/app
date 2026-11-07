import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { GAP_MARKER, Game, Player } from '@thelever-app/game';
import { CONTRACT_DILEMMAS, describeGameRepositoryContract } from '@thelever-app/game/contracts';
import {
  SEAL_BEFORE_FIRST_ACCESS,
  SequentialIdGenerator as GameIds,
  SequentialRandomness,
} from '@thelever-app/game/in-memory';
import {
  DeleteQueryNode,
  InsertQueryNode,
  type KyselyPlugin,
  type OperationNode,
  sql,
  type TableNode,
  UpdateQueryNode,
  ValuesNode,
} from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { recordingReads } from '../../test/support/recording-reads.ts';
import { roomOf, TEST_GAME_SETTINGS } from '../../test/support/rooms.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../postgres-game-repository.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';
import { inTransaction } from '../../transaction.ts';

const database = useTestDatabase<Database>();
/** Where an answer is only the vote. */
const ANONYMOUS = { ...TEST_GAME_SETTINGS, variant: 'anonymous' } as const;
const STARTED_AT = new Date('2026-11-09T10:00:00Z');

function answer(game: Game, playerId: string, dilemmaId: string, vote: string): void {
  game.answer(playerId, dilemmaId, { vote }, SEAL_BEFORE_FIRST_ACCESS, STARTED_AT);
}

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
      hasGap: dilemma.text.includes(GAP_MARKER),
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
    const room = roomOf('Ana', ['Luis'], ids);
    const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceId');
    await rooms.save(room);
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: dilemmas.map((dilemma) => ({
          dilemmaId: dilemma.id,
          version: dilemma.version,
          origin: 'picked-by-the-system',
          optionIds: dilemma.options.map(({ id }) => id),
          hasGap: false,
        })),
        settings: ANONYMOUS,
      },
      ids,
    );
    game.startDecisionPhase(room.players, STARTED_AT, new SequentialRandomness());
    const [ana, luis] = room.players as [Player, Player];
    answer(game, ana.id, first.id, first.options[0]!.id);
    answer(game, luis.id, first.id, first.options[0]!.id);
    const games = new PostgresGameRepository(database.db());
    await games.save(game);
    return { games, gameId: game.id, ana: ana.id, luis: luis.id, first, second };
  }

  /**
   * The database, and each statement that writes through it: its table and how many rows it sends.
   * A statement that changes no row (an insert that conflicts, a delete of nothing) counts too.
   */
  function recordingWrites() {
    const writes: string[] = [];
    const nameOf = (table: TableNode) => table.table.identifier.name;
    const describe = (node: OperationNode): string | undefined => {
      if (InsertQueryNode.is(node) && node.into) {
        const rows = node.values && ValuesNode.is(node.values) ? node.values.values.length : 1;
        return `insert ${nameOf(node.into)} ${rows}`;
      }
      if (UpdateQueryNode.is(node) && node.table) return `update ${String(node.table.kind)}`;
      if (DeleteQueryNode.is(node)) return `delete ${nameOf(node.from.froms[0] as TableNode)}`;
      return undefined;
    };
    const plugin: KyselyPlugin = {
      transformQuery: ({ node }) => {
        const write = describe(node);
        if (write) writes.push(write);
        return node;
      },
      transformResult: async ({ result }) => result,
    };
    return { db: database.db().withPlugin(plugin), writes };
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
    const { db, writes } = recordingWrites();

    // Act
    await inTransaction(db, async () => {
      const game = (await games.findById(gameId))!;
      answer(game, ana, second.id, second.options[0]!.id);
      await games.save(game);
    });

    // Assert
    const after = await writers();
    const rewritten = [...after]
      .filter(([row, xmin]) => before.get(row) !== xmin)
      .map(([row]) => row);
    expect(rewritten.sort()).toEqual(['game', `answer ${ana} ${second.id}`].sort());
    expect(after.get(`answer ${luis} ${first.id}`)).toBe(before.get(`answer ${luis} ${first.id}`));
    expect(writes).toEqual(['insert games 1', 'insert answers 1']);
  });

  it('should keep every change of a command that saves the game twice', async () => {
    // Arrange
    const { games, gameId, ana, luis, first, second } = await answeredGame();
    const { db, writes } = recordingWrites();

    // Act
    await inTransaction(db, async () => {
      const game = (await games.findById(gameId))!;
      answer(game, ana, first.id, first.options[1]!.id);
      await games.save(game);
      answer(game, luis, second.id, second.options[1]!.id);
      await games.save(game);
    });

    // Assert
    const found = await games.findById(gameId);
    expect(found?.answersOf(ana)).toMatchObject([
      { dilemmaId: first.id, vote: first.options[1]!.id },
    ]);
    expect(found?.answersOf(luis)).toMatchObject([
      { dilemmaId: first.id, vote: first.options[0]!.id },
      { dilemmaId: second.id, vote: second.options[1]!.id },
    ]);
    // The second save compares with the first one, not with what the command read.
    expect(writes).toEqual([
      'insert games 1',
      'insert answers 1',
      'insert games 1',
      'insert answers 1',
    ]);
  });

  it('should read a game in one statement, after locking its room in another', async () => {
    // Arrange
    const { gameId } = await answeredGame();
    const { db, reads } = recordingReads(database.db());

    // Act
    await inTransaction(db, () => new PostgresGameRepository(db).findById(gameId));

    // Assert
    expect(reads).toEqual(['lock rooms', 'select games']);
  });

  it('should see what the command that held its room saved while it waited', async () => {
    // Arrange: a command reads the game and answers for Ana a while later.
    const { games, gameId, ana, second } = await answeredGame();
    let firstRead!: () => void;
    const read = new Promise<void>((resolve) => (firstRead = resolve));
    const first = inTransaction(database.db(), async () => {
      const game = (await games.findById(gameId))!;
      firstRead();
      await new Promise((resolve) => setTimeout(resolve, 200));
      answer(game, ana, second.id, second.options[0]!.id);
      await games.save(game);
    });

    // Act: another command reads the game meanwhile, and waits for the first one.
    const seen = read.then(() => inTransaction(database.db(), () => games.findById(gameId)));
    await first;

    // Assert
    expect((await seen)?.progressOf(ana)).toBe(2);
  });

  it('should save in full a game the command did not read', async () => {
    // Arrange
    const { games, gameId, ana, second } = await answeredGame();
    const game = (await games.findById(gameId))!;
    answer(game, ana, second.id, second.options[0]!.id);

    // Act
    await inTransaction(database.db(), () => games.save(game));

    // Assert
    expect((await games.findById(gameId))?.toSnapshot()).toEqual(game.toSnapshot());
  });

  it('should keep the options of the dilemmas it plays in its own tables', async () => {
    // Arrange: dilemmas Dilemmas does not have, so only the repository can write their options.
    await emptyTables(database.db());
    await database
      .db()
      .insertInto('instances')
      .values({ id: 'TestInstanceId', seen_at: new Date() })
      .execute();
    const ids = new GameIds();
    const room = roomOf('Ana', [], ids);
    await new PostgresRoomRepository(database.db(), 'TestInstanceId').save(room);
    const dilemmas = [
      {
        dilemmaId: 'TestDilemma1',
        version: 3,
        origin: 'added-by-a-player',
        optionIds: ['TestOptionB', 'TestOptionA'],
        hasGap: true,
      },
      {
        dilemmaId: 'TestDilemma2',
        version: 1,
        origin: 'picked-by-the-host',
        optionIds: ['TestOptionC', 'TestOptionD'],
        hasGap: false,
      },
    ] as const;
    const game = Game.create({ roomId: room.id, dilemmas, settings: TEST_GAME_SETTINGS }, ids);
    const games = new PostgresGameRepository(database.db());

    // Act
    await games.save(game);

    // Assert
    expect((await games.findById(game.id))?.dilemmas).toEqual(dilemmas);
  });
});

describe('PostgresGameRepository outside a command', () => {
  it('should read a game in one statement, without locking anything', async () => {
    // Arrange
    await emptyTables(database.db());
    await database
      .db()
      .insertInto('instances')
      .values({ id: 'TestInstanceId', seen_at: new Date() })
      .execute();
    const ids = new GameIds();
    const room = roomOf('Ana', [], ids);
    await new PostgresRoomRepository(database.db(), 'TestInstanceId').save(room);
    const dilemmas = [
      {
        dilemmaId: 'TestDilemma1',
        version: 1,
        origin: 'picked-by-the-system',
        optionIds: ['TestOptionA'],
        hasGap: false,
      },
    ] as const;
    const game = Game.create({ roomId: room.id, dilemmas, settings: TEST_GAME_SETTINGS }, ids);
    await new PostgresGameRepository(database.db()).save(game);
    const { db, reads } = recordingReads(database.db());

    // Act
    await new PostgresGameRepository(db).findById(game.id);

    // Assert
    expect(reads).toEqual(['select games']);
  });
});
