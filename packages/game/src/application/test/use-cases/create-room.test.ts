import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { NicknameMissingError } from '../../../domain/errors/nickname-missing.error.ts';

describe('CreateRoomUseCase', () => {
  describe('execute', () => {
    it('should save a room hosted by a new player with that nickname', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const createRoom = new CreateRoomUseCase(roomRepository, new SequentialIdGenerator());

      // Act
      const { roomId, hostId } = await createRoom.execute({
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(hostId);
      expect(room?.host.nickname).toBe('Ana');
    });

    it('should throw an error if the nickname is missing', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        new SequentialIdGenerator(),
      );

      // Act & Assert
      await expect(
        createRoom.execute({ hostNickname: '', hostIdentity: 'TestHostIdentity' }),
      ).rejects.toThrow(NicknameMissingError);
    });
  });
});
