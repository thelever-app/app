import { describe, expect, it } from 'vitest';
import { InMemoryRoomRepository } from '../in-memory-room-repository.ts';
import { Room } from '../../../domain/entities/room.ts';
import { Player } from '../../../domain/entities/player.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

describe('InMemoryRoomRepository', () => {
  describe('findById', () => {
    it('should find a saved room', async () => {
      // Arrange
      const repository = new InMemoryRoomRepository();
      const room = Room.create(
        { hostNickname: 'Ana' },
        new FixedIdGenerator('TestId', 'TestHostId'),
      );
      await repository.save(room);

      // Act
      const found = await repository.findById('TestId');

      // Assert
      expect(found?.toSnapshot()).toEqual(room.toSnapshot());
    });

    it('should return undefined if the room does not exist', async () => {
      // Arrange
      const repository = new InMemoryRoomRepository();

      // Act
      const found = await repository.findById('TestUnknownId');

      // Assert
      expect(found).toBeUndefined();
    });

    it('should not see changes that were not saved', async () => {
      // Arrange
      const repository = new InMemoryRoomRepository();
      const room = Room.create(
        { hostNickname: 'Ana' },
        new FixedIdGenerator('TestId', 'TestHostId'),
      );
      await repository.save(room);

      // Act
      room.addPlayer(Player.create({ nickname: 'Luis' }, new FixedIdGenerator('TestLuisId')));

      // Assert
      const found = await repository.findById('TestId');
      expect(found?.players).toHaveLength(1);
    });
  });
});
