import { Player, Room } from '@thelever-app/game';
import { SequentialIdGenerator } from '@thelever-app/game/in-memory';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
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
  const first = Room.create({ hostNickname: 'Ana', hostIdentity: 'TestAna' }, idGenerator);
  first.addPlayer(Player.create({ nickname: 'Luis', identity: 'TestLuis' }, idGenerator));
  const second = Room.create({ hostNickname: 'Eva', hostIdentity: 'TestEva' }, idGenerator);
  first.connect(first.host.id, 'TestAnaConnection');
  second.connect(second.host.id, 'TestEvaConnection');
  const ofA = new PostgresRoomRepository(database.db(), 'TestInstanceA');
  await ofA.save(first);
  await ofA.save(second);
  first.connect(first.players[1]!.id, 'TestLuisConnection');
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
      expect(await instances.findSilent({ forMs: 0, except: 'TestInstanceB' })).toEqual([
        'TestInstanceA',
      ]);
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
      expect(silent).toEqual(['TestInstanceA']);
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
      first.disconnect(first.players[1]!.id, 'TestLuisConnection');
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
