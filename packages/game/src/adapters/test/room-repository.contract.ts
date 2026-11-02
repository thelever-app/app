import { describe, expect, it } from 'vitest';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Player } from '../../domain/entities/player.ts';
import { Room, type RoomSnapshot } from '../../domain/entities/room.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';

function room(): Room {
  return Room.create(
    { hostNickname: 'Ana', hostIdentity: 'TestAnaIdentity' },
    new FixedIdGenerator('TestRoomId', 'TestAnaId'),
  );
}

function player(name: string): Player {
  return Player.create(
    { nickname: name, identity: `Test${name}Identity` },
    new FixedIdGenerator(`Test${name}Id`),
  );
}

/** The order of the players matters, since it decides who takes over as host; that of the connections does not. */
function comparable(snapshot: RoomSnapshot | undefined) {
  return (
    snapshot && {
      ...snapshot,
      connections: [...snapshot.connections].sort((a, b) =>
        a.connectionId.localeCompare(b.connectionId),
      ),
    }
  );
}

/**
 * What every RoomRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns a repository with no rooms.
 */
export function describeRoomRepositoryContract(
  name: string,
  create: () => Promise<RoomRepository>,
): void {
  describe(`${name} (RoomRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved room as it was saved, with its players in the order they joined', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        saved.addPlayer(player('Luis'));
        saved.addPlayer(player('Eva'));
        saved.connect('TestAnaId', 'TestAnaConnection1');
        saved.connect('TestAnaId', 'TestAnaConnection2');
        saved.connect('TestEvaId', 'TestEvaConnection');
        await repository.save(saved);

        // Act
        const found = await repository.findById('TestRoomId');

        // Assert
        expect(comparable(found?.toSnapshot())).toEqual(comparable(saved.toSnapshot()));
        expect(found?.players.map(({ id }) => id)).toEqual([
          'TestAnaId',
          'TestLuisId',
          'TestEvaId',
        ]);
      });

      it('should return undefined if the room does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findById('TestUnknownId');

        // Assert
        expect(found).toBeUndefined();
      });

      it('should not see changes that were not saved', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        await repository.save(saved);

        // Act
        saved.addPlayer(player('Luis'));
        saved.connect('TestLuisId', 'TestLuisConnection');

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(found?.players).toHaveLength(1);
        expect(found?.toSnapshot().connections).toEqual([]);
      });
    });

    describe('save', () => {
      it('should keep only the last save of a room', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        await repository.save(saved);
        saved.addPlayer(player('Luis'));
        saved.connect('TestLuisId', 'TestLuisConnection');

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(comparable(found?.toSnapshot())).toEqual(comparable(saved.toSnapshot()));
        expect(found?.version).toBe(1);
      });

      it('should forget the connections closed before saving again', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        saved.addPlayer(player('Luis'));
        saved.connect('TestAnaId', 'TestAnaConnection1');
        saved.connect('TestAnaId', 'TestAnaConnection2');
        saved.connect('TestLuisId', 'TestLuisConnection');
        await repository.save(saved);
        saved.disconnect('TestAnaId', 'TestAnaConnection1');
        saved.disconnect('TestLuisId', 'TestLuisConnection');

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(found?.toSnapshot().connections).toEqual([
          { playerId: 'TestAnaId', connectionId: 'TestAnaConnection2' },
        ]);
        expect(found?.isConnected('TestLuisId')).toBe(false);
      });
    });
  });
}
