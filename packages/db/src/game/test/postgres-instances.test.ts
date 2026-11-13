import { SequentialIdGenerator } from '@thelever-app/game/in-memory';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { roomOf } from '../../test/support/rooms.ts';
import { PostgresInstances } from '../postgres-instances.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';

const database = useTestDatabase<Database>();

/** Two rooms with connections of instance A, and one more connection of instance B in the first room. */
async function roomsOfTwoInstances() {
  await emptyTables(database.db());
  const instances = new PostgresInstances(database.db());
  await instances.beat('TestInstanceA');
  await instances.beat('TestInstanceB');
  const idGenerator = new SequentialIdGenerator();
  const first = roomOf('Ana', ['Luis'], idGenerator, 'K7M2Q');
  const second = roomOf('Eva', [], idGenerator, 'P4R8T');
  first.connect(first.host.id, 'TestAnaConnection', new Date());
  second.connect(second.host.id, 'TestEvaConnection', new Date());
  const ofA = new PostgresRoomRepository(database.db(), 'TestInstanceA');
  await ofA.save(first);
  await ofA.save(second);
  first.connect(first.players[1]!.id, 'TestLuisConnection', new Date());
  await new PostgresRoomRepository(database.db(), 'TestInstanceB').save(first);
  return { instances, first, second };
}

async function lastSeenAgo(id: string, seconds: number): Promise<void> {
  await sql`update instances set seen_at = now() - make_interval(secs => ${seconds}) where id = ${id}`.execute(
    database.db(),
  );
}

describe('PostgresInstances', () => {
  describe('beat', () => {
    it('should say the instance was not registered on its first sign, and was on the next', async () => {
      // Arrange
      await emptyTables(database.db());
      const instances = new PostgresInstances(database.db());

      // Act
      const first = await instances.beat('TestInstanceA');
      const next = await instances.beat('TestInstanceA');

      // Assert
      expect([first, next]).toEqual([false, true]);
    });

    it('should say the instance was not registered once the others forgot it', async () => {
      // Arrange
      await emptyTables(database.db());
      const instances = new PostgresInstances(database.db());
      await instances.beat('TestInstanceA');
      await instances.remove('TestInstanceA');

      // Act
      const registered = await instances.beat('TestInstanceA');

      // Assert
      expect(registered).toBe(false);
      const silent = await instances.findSilent({ forMs: 0, except: 'TestInstanceB' });
      expect(silent.map(({ id }) => id)).toEqual(['TestInstanceA']);
    });
  });

  describe('findSilent', () => {
    it('should find the instances with no sign for longer than asked, but never this one', async () => {
      // Arrange
      const { instances } = await roomsOfTwoInstances();
      await instances.beat('TestInstanceC');
      await lastSeenAgo('TestInstanceA', 120);
      await lastSeenAgo('TestInstanceC', 120);

      // Act
      const silent = await instances.findSilent({ forMs: 90_000, except: 'TestInstanceC' });

      // Assert
      expect(silent.map(({ id }) => id)).toEqual(['TestInstanceA']);
    });

    it('should say when each silent instance was last seen', async () => {
      // Arrange
      const { instances } = await roomsOfTwoInstances();
      await lastSeenAgo('TestInstanceA', 120);
      const { seen_at: seenAt } = await database
        .db()
        .selectFrom('instances')
        .select('seen_at')
        .where('id', '=', 'TestInstanceA')
        .executeTakeFirstOrThrow();

      // Act
      const silent = await instances.findSilent({ forMs: 90_000, except: 'TestInstanceB' });

      // Assert
      expect(silent).toEqual([{ id: 'TestInstanceA', seenAt }]);
    });

    it('should find every silent instance for whoever is not an instance, as a scheduled job', async () => {
      // Arrange
      const { instances } = await roomsOfTwoInstances();
      await lastSeenAgo('TestInstanceA', 120);
      await lastSeenAgo('TestInstanceB', 120);

      // Act
      const silent = await instances.findSilent({ forMs: 90_000 });

      // Assert
      expect(silent.map(({ id }) => id)).toEqual(['TestInstanceA', 'TestInstanceB']);
    });

    it('should not find an instance that gave a sign again', async () => {
      // Arrange
      const { instances } = await roomsOfTwoInstances();
      await lastSeenAgo('TestInstanceA', 120);

      // Act
      await instances.beat('TestInstanceA');

      // Assert
      expect(await instances.findSilent({ forMs: 90_000, except: 'TestInstanceB' })).toEqual([]);
    });
  });

  describe('connectionsOf', () => {
    it('should give the connections an instance serves, room by room', async () => {
      // Arrange
      const { instances, first, second } = await roomsOfTwoInstances();

      // Act
      const rooms = await instances.connectionsOf('TestInstanceA');

      // Assert
      expect(rooms).toEqual(
        expect.arrayContaining([
          {
            roomId: first.id,
            connections: [{ playerId: first.host.id, connectionId: 'TestAnaConnection' }],
          },
          {
            roomId: second.id,
            connections: [{ playerId: second.host.id, connectionId: 'TestEvaConnection' }],
          },
        ]),
      );
      expect(rooms).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should keep an instance that still serves connections, and say so', async () => {
      // Arrange
      const { instances } = await roomsOfTwoInstances();

      // Act
      const removed = await instances.remove('TestInstanceA');

      // Assert
      expect(removed).toBe(false);
      const ids = await database.db().selectFrom('instances').select('id').orderBy('id').execute();
      expect(ids).toEqual([{ id: 'TestInstanceA' }, { id: 'TestInstanceB' }]);
    });

    it('should remove an instance with no connections left, and say so', async () => {
      // Arrange
      const { instances, first } = await roomsOfTwoInstances();
      first.disconnect(first.players[1]!.id, 'TestLuisConnection', new Date());
      await new PostgresRoomRepository(database.db(), 'TestInstanceA').save(first);

      // Act
      const removed = await instances.remove('TestInstanceB');

      // Assert
      expect(removed).toBe(true);
      const ids = await database.db().selectFrom('instances').select('id').orderBy('id').execute();
      expect(ids).toEqual([{ id: 'TestInstanceA' }]);
    });
  });
});
