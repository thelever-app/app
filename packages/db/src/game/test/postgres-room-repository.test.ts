import { Game } from '@thelever-app/game';
import { describeRoomRepositoryContract } from '@thelever-app/game/contracts';
import { SequentialIdGenerator, SequentialRandomness } from '@thelever-app/game/in-memory';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { recordingReads } from '../../test/support/recording-reads.ts';
import { roomOf, TEST_GAME_SETTINGS } from '../../test/support/rooms.ts';
import { inTransaction } from '../../transaction.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../postgres-game-repository.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';
import { Dilemma } from '@thelever-app/dilemmas';

const database = useTestDatabase<Database>();

async function withInstances(...ids: string[]) {
  await emptyTables(database.db());
  await database
    .db()
    .insertInto('instances')
    .values(ids.map((id) => ({ id, seen_at: new Date() })))
    .execute();
}

/** A saved room of Ana with Luis, Ana connected through the repository of instance A. */
async function savedRoom() {
  await withInstances('TestInstanceA', 'TestInstanceB');
  const idGenerator = new SequentialIdGenerator();
  const room = roomOf('Ana', ['Luis'], idGenerator);
  room.connect(room.host.id, 'TestAnaConnection');
  await new PostgresRoomRepository(database.db(), 'TestInstanceA').save(room);
  return { room, idGenerator };
}

/** Records when each of two commands starts and ends, holding the first one for a while. */
async function race(first: () => Promise<unknown>, second: () => Promise<unknown>) {
  const steps: string[] = [];
  let firstStarted!: () => void;
  const started = new Promise<void>((resolve) => (firstStarted = resolve));
  await Promise.all([
    inTransaction(database.db(), async () => {
      await first();
      steps.push('first:read');
      firstStarted();
      await new Promise((resolve) => setTimeout(resolve, 200));
      steps.push('first:end');
    }),
    started.then(() =>
      inTransaction(database.db(), async () => {
        await second();
        steps.push('second:read');
      }),
    ),
  ]);
  return steps;
}

describeRoomRepositoryContract('PostgresRoomRepository', async () => {
  await withInstances('TestInstanceId');
  return new PostgresRoomRepository(database.db(), 'TestInstanceId');
});

describe('PostgresRoomRepository', () => {
  describe('findById', () => {
    it('should make a second command on the same room wait until the first one commits', async () => {
      // Arrange
      const { room } = await savedRoom();
      const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceA');

      // Act
      const steps = await race(
        () => rooms.findById(room.id),
        () => rooms.findById(room.id),
      );

      // Assert
      expect(steps).toEqual(['first:read', 'first:end', 'second:read']);
    });

    it('should read a room in one statement, after locking it in another, inside a command', async () => {
      // Arrange
      const { room } = await savedRoom();
      const { db, reads } = recordingReads(database.db());

      // Act
      await inTransaction(db, () =>
        new PostgresRoomRepository(db, 'TestInstanceA').findById(room.id),
      );

      // Assert
      expect(reads).toEqual(['lock rooms', 'select rooms']);
    });

    it('should read a room in one statement, without locking it, outside a command', async () => {
      // Arrange
      const { room } = await savedRoom();
      const { db, reads } = recordingReads(database.db());

      // Act
      await new PostgresRoomRepository(db, 'TestInstanceA').findById(room.id);

      // Assert
      expect(reads).toEqual(['select rooms']);
    });

    it('should see what the command that held the room saved while it waited', async () => {
      // Arrange: a command reads the room and connects Luis a while later.
      const { room } = await savedRoom();
      const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceA');
      const luis = room.players[1]!;
      let firstRead!: () => void;
      const read = new Promise<void>((resolve) => (firstRead = resolve));
      const first = inTransaction(database.db(), async () => {
        const found = (await rooms.findById(room.id))!;
        firstRead();
        await new Promise((resolve) => setTimeout(resolve, 200));
        found.connect(luis.id, 'TestLuisConnection');
        await rooms.save(found);
      });

      // Act: another command reads the room meanwhile, and waits for the first one.
      const seen = read.then(() => inTransaction(database.db(), () => rooms.findById(room.id)));
      await first;

      // Assert
      expect((await seen)?.isConnected(luis.id)).toBe(true);
    });

    it('should not make a read outside a command wait', async () => {
      // Arrange
      const { room } = await savedRoom();
      const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceA');
      const steps: string[] = [];

      // Act
      await inTransaction(database.db(), async () => {
        await rooms.findById(room.id);
        await Promise.race([
          (async () => {
            // A read from outside the transaction of the command, as a query does.
            await new PostgresRoomRepository(database.db(), 'TestInstanceA').findById(room.id);
            steps.push('query:read');
          })(),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
        steps.push('command:end');
      });

      // Assert
      expect(steps).toEqual(['query:read', 'command:end']);
    });
  });

  describe('save', () => {
    it('should keep the instance each connection was opened in', async () => {
      // Arrange
      const { room } = await savedRoom();
      const luis = room.players[1]!;
      room.connect(luis.id, 'TestLuisConnection');

      // Act
      await new PostgresRoomRepository(database.db(), 'TestInstanceB').save(room);

      // Assert
      const rows = await database
        .db()
        .selectFrom('room_connections')
        .select(['id', 'instance_id'])
        .orderBy('id')
        .execute();
      expect(rows).toEqual([
        { id: 'TestAnaConnection', instance_id: 'TestInstanceA' },
        { id: 'TestLuisConnection', instance_id: 'TestInstanceB' },
      ]);
    });

    it('should keep the game in progress of the room', async () => {
      // Arrange
      const { room, idGenerator } = await savedRoom();
      room.join(
        { nickname: 'Marta', identity: 'TestMartaIdentity' },
        idGenerator,
        new SequentialRandomness(),
      );
      const game = Game.create(
        {
          roomId: room.id,
          dilemmas: [
            {
              dilemmaId: 'TestDilemma',
              version: 1,
              origin: 'picked-by-the-system',
              hasGap: false,
              optionIds: ['TestOptionA', 'TestOptionB'],
            },
          ],
          settings: TEST_GAME_SETTINGS,
        },
        idGenerator,
      );
      room.startGame(room.host.id, game.id);
      const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceA');

      // Act: the game first, as the command that starts it saves them.
      await new PostgresGameRepository(database.db()).save(game);
      await rooms.save(room);

      // Assert
      expect((await rooms.findById(room.id))?.currentGameId).toBe(game.id);
    });

    it('should refuse a game in progress that is not a game of the room', async () => {
      // Arrange
      const { room, idGenerator } = await savedRoom();
      room.join(
        { nickname: 'Marta', identity: 'TestMartaIdentity' },
        idGenerator,
        new SequentialRandomness(),
      );
      room.startGame(room.host.id, 'TestGameOfNoRoom');

      // Act
      const saving = new PostgresRoomRepository(database.db(), 'TestInstanceA').save(room);

      // Assert
      await expect(saving).rejects.toThrow('rooms_current_game');
    });
  });
});

describe('PostgresGameRepository', () => {
  describe('findById', () => {
    it('should lock the room of the game, so a command on the room waits for it', async () => {
      // Arrange
      const { room, idGenerator } = await savedRoom();
      const dilemma = Dilemma.create(
        {
          text: 'TestDilemmaText',
          options: ['TestOption1', 'TestOption2'],
          language: 'es',
          category: 'honesty',
          tags: [],
          minimumAge: 16,
        },
        idGenerator,
      );
      await new PostgresDilemmaRepository(database.db()).save(dilemma);
      const game = Game.create(
        {
          roomId: room.id,
          dilemmas: [
            {
              dilemmaId: dilemma.id,
              version: 1,
              origin: 'picked-by-the-system',
              hasGap: false,
              optionIds: dilemma.options.map(({ id }) => id),
            },
          ],
          settings: TEST_GAME_SETTINGS,
        },
        idGenerator,
      );
      const games = new PostgresGameRepository(database.db());
      await games.save(game);
      const rooms = new PostgresRoomRepository(database.db(), 'TestInstanceA');

      // Act
      const steps = await race(
        () => games.findById(game.id),
        () => rooms.findById(room.id),
      );

      // Assert
      expect(steps).toEqual(['first:read', 'first:end', 'second:read']);
    });
  });
});
